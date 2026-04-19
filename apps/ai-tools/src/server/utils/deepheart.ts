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

export const DEEPHEART_TONES = ['gentle', 'warm', 'coach', 'logical'] as const
export type DeepheartTone = typeof DEEPHEART_TONES[number]

export function buildSystemPrompt(tone: DeepheartTone, userPrompt: string): string {
  const base =
    'あなたは「deepheart」というカウンセリング対話AIです。相手の話に丁寧に耳を傾け、感情を否定せず、安心できる関係を築いてください。' +
    '診断や処方はしません。深刻な危機の兆候があれば、信頼できる人や専門家・公的窓口（いのちの電話 0120-783-556 等）への相談を優しく促してください。' +
    '回答は日本語で。説教くささや決めつけは避け、相手の言葉を引き取る短い要約と、必要に応じた1つの質問を添えて進めてください。'

  const toneText: Record<DeepheartTone, string> = {
    gentle: '口調は穏やかで、柔らかく寄り添うように話します。句点ごとに改行し、落ち着いた余白を残してください。',
    warm: '温かく親しみのある口調で、相手の頑張りを自然に肯定します。カジュアルすぎない範囲で距離を近く保ってください。',
    coach: '前向きに伴走するコーチの口調で、気づきを引き出す問いかけを大切にします。指示や命令はしないでください。',
    logical: '落ち着いた論理的な口調で、事実と感情を丁寧に切り分けます。ただし冷たくならないよう共感の一言を必ず添えてください。',
  }

  const extra = userPrompt?.trim()
    ? `\n\nユーザーが設定した追加の指示:\n${userPrompt.trim()}`
    : ''

  return `${base}\n\n${toneText[tone]}${extra}`
}
