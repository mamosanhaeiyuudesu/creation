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

export function getDeepheartEncryptionKey(event: H3Event): string | null {
  return (event.context as any).cloudflare?.env?.DEEPHEART_ENCRYPTION_KEY ?? null
}

export async function encryptMessage(content: string, keyBase64: string): Promise<string> {
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(content))
  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `ENC:${ivB64}:${ctB64}`
}

export async function decryptMessage(stored: string, keyBase64: string): Promise<string> {
  if (!stored.startsWith('ENC:')) return stored
  try {
    const parts = stored.split(':')
    if (parts.length !== 3) return stored
    const iv = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0))
    const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0))
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt'])
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(plaintext)
  } catch {
    return stored
  }
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

export const DEEPHEART_TONES = ['explore', 'reframe'] as const
export type DeepheartTone = typeof DEEPHEART_TONES[number]

export const DEEPHEART_MAX_TOKENS = 600

export function buildSystemPrompt(userPrompt: string): string {
  const prompt =
    'あなたは「deepheart」というカウンセリング対話AIです。相手の話に丁寧に耳を傾け、感情を否定せず、安心できる関係を築いてください。\n' +
    '相手の気持ちを受け止めるとき、言葉をそのまま繰り返すのではなく、意味や感情を自分の言葉で言い換えて伝えてください。たとえば「それって、〇〇という感じに近いでしょうか」「〜というつらさがあったんですね」のように、相手が感じていることを少し別の角度から言語化することで、「ちゃんと聞いている」という感覚を届けてください。機械的な復唱にならないよう注意し、会話のたびに表現に変化をつけてください。\n' +
    '評価・判断は避け、相手が安心して話せる場を作ることを最優先にします。\n' +
    '診断や処方はしません。深刻な危機の兆候があれば、信頼できる人や専門家・公的窓口（いのちの電話 0120-783-556 等）への相談を優しく促してください。\n' +
    '回答は日本語で。句点（。）のたびに改行してください。\n\n' +
    '【対話の進め方】\n' +
    '会話の序盤は、感情を受け止めながら、繰り返し起きている出来事や感情の根っこにあるものを穏やかに深堀りしてください。「似たことが前にもありましたか？」「その感覚、昔から続いていますか？」のような問いかけを使います。\n' +
    'ある程度深堀りができたと判断したら、「少し違う角度から見てみてもいいですか？」などとさりげなく相手に確認してから、考え方のクセや事実と解釈の違いに気づかせるアプローチに自然に移行してください。\n' +
    'フェーズの移行は相手の様子を見ながら行い、無理に進めず、相手が望む場合は深堀りに戻ってください。'

  const extra = userPrompt?.trim()
    ? `\n\nユーザーが設定した追加の指示:\n${userPrompt.trim()}`
    : ''

  return `${prompt}${extra}`
}
