import type { H3Event } from 'h3'

const SESSION_COOKIE = 'deepheart-session'
const SESSION_EXPIRE_DAYS = 30

export async function deepheartHashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const hashArr = Array.from(new Uint8Array(bits))
  const saltArr = Array.from(salt)
  return btoa(JSON.stringify({ salt: saltArr, hash: hashArr }))
}

export async function deepheartVerifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const { salt, hash } = JSON.parse(atob(stored)) as { salt: number[]; hash: number[] }
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      256
    )
    const newHash = Array.from(new Uint8Array(bits))
    return newHash.length === hash.length && newHash.every((b, i) => b === hash[i])
  } catch {
    return false
  }
}

export function getDeepheartDb(event: H3Event): any {
  return (event.context as any).cloudflare?.env?.DEEPHEART_DB ?? null
}

export async function getDeepheartUser(event: H3Event): Promise<{ id: string; username: string } | null> {
  const db = getDeepheartDb(event)
  if (!db) return null

  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const row = await db
    .prepare(
      "SELECT s.user_id, u.username FROM deepheart_sessions s JOIN deepheart_users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > datetime('now')"
    )
    .bind(token)
    .first<{ user_id: string; username: string }>()

  if (!row) return null
  return { id: row.user_id, username: row.username }
}

export async function requireDeepheartUser(event: H3Event) {
  const user = await getDeepheartUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

export function setDeepheartSessionCookie(event: H3Event, token: string): void {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: SESSION_EXPIRE_DAYS * 24 * 3600,
    path: '/',
  })
}

export function clearDeepheartSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export const DEEPHEART_SESSION_COOKIE = SESSION_COOKIE
export const DEEPHEART_SESSION_EXPIRE_DAYS = SESSION_EXPIRE_DAYS

export const DEEPHEART_TONES = ['listen', 'explore', 'reframe', 'forward'] as const
export type DeepheartTone = typeof DEEPHEART_TONES[number]

export const RESPONSE_LENGTH_TOKENS: Record<number, number> = {
  1: 80,
  2: 200,
  3: 400,
  4: 700,
  5: 1200,
}

export function buildSystemPrompt(tone: DeepheartTone, userPrompt: string): string {
  const base =
    'あなたは「deepheart」というカウンセリング対話AIです。相手の話に丁寧に耳を傾け、感情を否定せず、安心できる関係を築いてください。' +
    '診断や処方はしません。深刻な危機の兆候があれば、信頼できる人や専門家・公的窓口（いのちの電話 0120-783-556 等）への相談を優しく促してください。' +
    '回答は日本語で。'

  const toneText: Record<DeepheartTone, string> = {
    listen:
      'あなたは受け止め役です。評価・判断・アドバイスは一切しません。相手の言葉をそのまま受け取り、感情を言語化する手助けをします。質問は最小限に抑え、「そう感じたんですね」「それはつらかったですね」のように反射してください。答えを出そうとせず、ただそこにいてください。',
    explore:
      'あなたは一緒にパターンを探る伴走者です。繰り返し起きている出来事、過去との繋がり、感情の根っこにあるものを穏やかに掘り下げます。象徴的なイメージや比喩にも積極的に触れてください。夢については自分から積極的に尋ねる必要はありませんが、相手が話した場合や深層心理を探るうえで有効と判断した場合は、探索のツールとして丁寧に扱ってください。「似たことが前にもありましたか？」「その感覚、昔から続いていますか？」のような問いかけで気づきを引き出してください。答えを押しつけず、一緒に探索するスタンスを保ってください。',
    reframe:
      'あなたはCBT（認知行動療法）的なアプローチで関わります。考え方のクセやパターンに気づかせ、事実と解釈・評価を丁寧に分けます。「その考えを支える根拠は何ですか？」「別の見方はできますか？」のように、穏やかに問い返してください。指摘は柔らかく、必ず共感の一言を添えてください。',
    forward:
      'あなたはコーチング的な伴走者です。過去より未来、問題より可能性にフォーカスします。強み・リソース・すでにできていることを見つけ、目標と具体的な小さな一歩を一緒に明確にします。指示・命令はしません。「何が一番大切ですか？」「まず何ができそうですか？」のような問いかけで気づきを引き出してください。',
  }

  const extra = userPrompt?.trim()
    ? `\n\nユーザーが設定した追加の指示:\n${userPrompt.trim()}`
    : ''

  return `${base}\n\n${toneText[tone]}${extra}`
}
