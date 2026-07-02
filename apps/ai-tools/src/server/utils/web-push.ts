/**
 * Cloudflare Workers（WebCrypto のみ）で動作する Web Push 送信ユーティリティ。
 * - VAPID: ES256 JWT 署名（RFC 8292）
 * - ペイロード暗号化: aes128gcm（RFC 8188 / RFC 8291）
 *
 * Node の `web-push` ライブラリは Workers で動かないため自前実装している。
 */

export interface PushSubscriptionRecord {
  endpoint: string
  p256dh: string // base64url（クライアント公開鍵、65バイト）
  auth: string // base64url（16バイトの auth secret）
}

export interface VapidKeys {
  publicKey: string // base64url（65バイト）
  privateKey: string // base64url（32バイトの秘密スカラー）
  subject: string // mailto: または https: の連絡先
}

export interface SendResult {
  ok: boolean
  statusCode: number
  /** 購読が失効している（404/410）→ DB から削除すべき */
  expired: boolean
}

// ArrayBuffer 由来であることを型で保証（WebCrypto / fetch の BufferSource 要件）
type Bytes = Uint8Array<ArrayBuffer>

// ---- base64url ヘルパー ----
function b64urlToBytes(s: string): Bytes {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) b64 += '='
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64url(bytes: Uint8Array | ArrayBuffer): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function utf8(s: string): Bytes {
  return new Uint8Array(new TextEncoder().encode(s))
}

function concat(...arrs: Uint8Array[]): Bytes {
  const total = arrs.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrs) {
    out.set(a, off)
    off += a.length
  }
  return out
}

// ---- VAPID JWT（ES256）----
async function importVapidPrivateKey(vapid: VapidKeys): Promise<CryptoKey> {
  const pub = b64urlToBytes(vapid.publicKey) // 0x04 || X(32) || Y(32)
  const d = vapid.privateKey
  const x = bytesToB64url(pub.slice(1, 33))
  const y = bytesToB64url(pub.slice(33, 65))
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
}

function endpointOrigin(endpoint: string): string {
  const u = new URL(endpoint)
  return `${u.protocol}//${u.host}`
}

async function buildVapidAuthHeader(vapid: VapidKeys, audience: string): Promise<string> {
  const header = bytesToB64url(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600
  const payload = bytesToB64url(utf8(JSON.stringify({ aud: audience, exp, sub: vapid.subject })))
  const signingInput = `${header}.${payload}`

  const key = await importVapidPrivateKey(vapid)
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    utf8(signingInput)
  )
  const jwt = `${signingInput}.${bytesToB64url(sig)}`
  return `vapid t=${jwt}, k=${vapid.publicKey}`
}

// ---- HKDF ----
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8)
  return new Uint8Array(bits)
}

// ---- ペイロード暗号化（aes128gcm）----
async function encryptPayload(sub: PushSubscriptionRecord, plaintext: Uint8Array): Promise<Uint8Array> {
  const clientPub = b64urlToBytes(sub.p256dh)
  const authSecret = b64urlToBytes(sub.auth)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // 送信側エフェメラル鍵
  const asKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey)) // 65バイト

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPub,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, asKeyPair.privateKey, 256)
  )

  // RFC 8291: PRK / IKM
  const keyInfo = concat(utf8('WebPush: info\0'), clientPub, asPublicRaw)
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32)

  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12)

  // レコード = plaintext || 0x02（最終レコード区切り）
  const record = concat(plaintext, new Uint8Array([0x02]))
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, record)
  )

  // aes128gcm ヘッダ: salt(16) || rs(4) || idlen(1) || keyid(as_public 65) || ciphertext
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]) // 4096
  const idlen = new Uint8Array([asPublicRaw.length])
  return concat(salt, rs, idlen, asPublicRaw, ciphertext)
}

/**
 * 1件の購読へプッシュ通知を送信する。
 */
export async function sendPush(
  sub: PushSubscriptionRecord,
  payload: Record<string, unknown>,
  vapid: VapidKeys,
  ttlSeconds = 24 * 3600
): Promise<SendResult> {
  const body = await encryptPayload(sub, utf8(JSON.stringify(payload)))
  const auth = await buildVapidAuthHeader(vapid, endpointOrigin(sub.endpoint))

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttlSeconds),
    },
    body: body as BodyInit,
  })

  return {
    ok: res.ok,
    statusCode: res.status,
    expired: res.status === 404 || res.status === 410,
  }
}
