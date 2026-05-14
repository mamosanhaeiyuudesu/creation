import type { H3Event } from 'h3'

const getKey = async (event: H3Event): Promise<CryptoKey | null> => {
  const { encryptionKey } = useRuntimeConfig(event)
  if (!encryptionKey) return null
  const raw = new TextEncoder().encode((encryptionKey as string).padEnd(32, '0').slice(0, 32))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export const encryptComment = async (event: H3Event, text: string): Promise<string> => {
  if (!text) return text
  const key = await getKey(event)
  if (!key) return text
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `enc:${ivB64}:${ctB64}`
}

export const decryptComment = async (event: H3Event, text: string): Promise<string> => {
  if (!text.startsWith('enc:')) return text
  const key = await getKey(event)
  if (!key) return text
  try {
    const [, ivB64, ctB64] = text.split(':')
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0))
    const decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(decoded)
  } catch {
    return text
  }
}
