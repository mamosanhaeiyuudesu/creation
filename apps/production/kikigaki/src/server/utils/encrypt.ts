// 会議の中身（タイトル・文字起こし・議事録JSON・よく出る名前）の暗号化。
// apps/ai-tools/src/server/utils/encrypt.ts からの移植（Cron 用の引数版は使わないので省いた）。
//
// 会議には個人名も、まだ公にできない話も普通に含まれる。DBを直接覗いても読めない状態にしておく。
// 鍵は NUXT_ENCRYPTION_KEY（32文字以上）。**鍵を変えると既存のデータは読めなくなる。**

import type { H3Event } from 'h3'

const importKey = async (encryptionKey: string): Promise<CryptoKey | null> => {
  if (!encryptionKey) return null
  const raw = new TextEncoder().encode(encryptionKey.padEnd(32, '0').slice(0, 32))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

const getKey = async (event: H3Event): Promise<CryptoKey | null> => {
  const { encryptionKey } = useRuntimeConfig(event)
  return importKey((encryptionKey as string) ?? '')
}

// String.fromCharCode(...bytes) は引数が数万個になるとスタックを超えて落ちるため、
// 長い文字起こしでも安全なように分割して変換する。
const toBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const CHUNK = 8192
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

const encryptWith = async (key: CryptoKey | null, text: string): Promise<string> => {
  if (!text || !key) return text
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return `enc:${toBase64(iv)}:${toBase64(new Uint8Array(ciphertext))}`
}

const decryptWith = async (key: CryptoKey | null, text: string): Promise<string> => {
  if (!key) return text
  try {
    const [, ivB64, ctB64] = text.split(':')
    // 形が崩れている値（手で書き換えた行など）は復号を諦めてそのまま返す
    if (!ivB64 || !ctB64) return text
    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0))
    const decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(decoded)
  } catch {
    return text
  }
}

export const encryptText = async (event: H3Event, text: string): Promise<string> => {
  if (!text) return text
  return encryptWith(await getKey(event), text)
}

export const decryptText = async (event: H3Event, text: string): Promise<string> => {
  if (!text?.startsWith('enc:')) return text
  return decryptWith(await getKey(event), text)
}
