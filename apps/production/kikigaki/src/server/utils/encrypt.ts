// 会議の中身（タイトル・元の文章・議事録JSON）の暗号化。
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

/**
 * 鍵を取り出す。**鍵が未設定なら黙って素通しせず、ここで止める。**
 *
 * 以前は鍵が無いと平文のまま保存する作りだった（ai-tools から引き継いだ挙動）。
 * 身内の道具ならそれでも気づけるが、本番サービスでは
 * 「secret の設定を忘れたまま運用し、他人の会議の中身が平文でDBに溜まる」事故になる。
 * 画面には利用者向けの文言を出し、原因はログに残す。
 */
const getKey = async (event: H3Event): Promise<CryptoKey> => {
  const { encryptionKey } = useRuntimeConfig(event)
  const key = await importKey((encryptionKey as string) ?? '')
  if (!key) {
    console.error('[kikigaki] NUXT_ENCRYPTION_KEY が未設定です。暗号化できないため処理を中止しました')
    throw createError({
      statusCode: 503,
      message: 'ただいまシステムの準備が整っていません。少し時間をおいてから、もう一度お試しください。',
    })
  }
  return key
}

// String.fromCharCode(...bytes) は引数が数万個になるとスタックを超えて落ちるため、
// 長い文章でも安全なように分割して変換する。
const toBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const CHUNK = 8192
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

// ── 圧縮（2026-10-17〜） ──
// 長い文章は gzip で縮めてから暗号化する（日本語の文章は2〜3分の1になる。D1 の容量対策）。
// 形式: 圧縮なし `enc:<iv>:<暗号文>` ／ 圧縮あり `encz:<iv>:<暗号文>`。読むときは頭の印で見分けるので、
// 圧縮を入れる前の行（enc:）もそのまま読める。短い文字列は縮まないので圧縮しない。
// ★それより前の行を圧縮し直す機能は作らない（本人の判断。鍵は本番のサーバーにしか無く、
//   手元のコマンドではできないため。古い行は圧縮されないまま読める）
const COMPRESS_MIN_LENGTH = 256

const gzip = async (text: string): Promise<Uint8Array> => {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const gunzip = async (bytes: Uint8Array): Promise<string> => {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return await new Response(stream).text()
}

const fromBase64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

/** 暗号化する（テストのため鍵を引数で受け取る形にしてある） */
export const encryptWith = async (key: CryptoKey, text: string): Promise<string> => {
  if (!text) return text
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const compress = text.length >= COMPRESS_MIN_LENGTH
  const plain = compress ? await gzip(text) : new TextEncoder().encode(text)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain as BufferSource)
  return `${compress ? 'encz' : 'enc'}:${toBase64(iv)}:${toBase64(new Uint8Array(ciphertext))}`
}

/** 暗号文か（enc: / encz: で始まるか） */
export const isEncrypted = (text: string): boolean => text?.startsWith('enc:') || text?.startsWith('encz:')

/** 復号する。**失敗したら例外を投げる**（テストと decryptWith から使う） */
export const decryptStrict = async (key: CryptoKey, text: string): Promise<string> => {
  const [prefix, ivB64, ctB64] = text.split(':')
  if ((prefix !== 'enc' && prefix !== 'encz') || !ivB64 || !ctB64) throw new Error('暗号文の形ではありません')
  const decoded = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivB64) as BufferSource },
    key,
    fromBase64(ctB64) as BufferSource
  )
  return prefix === 'encz' ? await gunzip(new Uint8Array(decoded)) : new TextDecoder().decode(decoded)
}

/** 復号する。形が崩れている値（手で書き換えた行など）は復号を諦めてそのまま返す（画面に出すとき用） */
export const decryptWith = async (key: CryptoKey, text: string): Promise<string> => {
  try {
    return await decryptStrict(key, text)
  } catch {
    return text
  }
}

export const encryptText = async (event: H3Event, text: string): Promise<string> => {
  if (!text) return text
  return encryptWith(await getKey(event), text)
}

export const decryptText = async (event: H3Event, text: string): Promise<string> => {
  if (!isEncrypted(text)) return text
  return decryptWith(await getKey(event), text)
}

/** テスト用: 文字列から鍵を作る（本番の鍵の作り方と同じ） */
export const importKeyForTest = importKey
