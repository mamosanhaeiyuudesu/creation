import { describe, expect, it } from 'vitest'
import { decryptStrict, decryptWith, encryptWith, importKeyForTest, isEncrypted } from './encrypt'

const keyOf = async (k: string) => (await importKeyForTest(k))!

describe('暗号化と圧縮', () => {
  it('長い文章は圧縮して暗号化し（encz:）、元に戻せる。圧縮で小さくなる', async () => {
    const key = await keyOf('test-key-0123456789-0123456789-abcdef')
    const text = '田中：秋祭りの件ですが、テントは役場から借りられそうです。\n'.repeat(200)
    const enc = await encryptWith(key, text)
    expect(enc.startsWith('encz:')).toBe(true)
    expect(await decryptStrict(key, enc)).toBe(text)
    // 日本語は1文字3バイト。圧縮しない場合の暗号文（3バイト×文字数×base64の4/3）より十分小さい
    expect(enc.length).toBeLessThan(text.length * 3 * (4 / 3) * 0.5)
  })

  it('短い文字列は圧縮しない（enc:）', async () => {
    const key = await keyOf('test-key-0123456789-0123456789-abcdef')
    const enc = await encryptWith(key, '秋祭りの打ち合わせ')
    expect(enc.startsWith('enc:')).toBe(true)
    expect(await decryptStrict(key, enc)).toBe('秋祭りの打ち合わせ')
  })

  it('別の鍵では復号できず、strict は例外・画面用はそのまま返す', async () => {
    const enc = await encryptWith(await keyOf('key-A-0123456789-0123456789-abcdef'), 'x'.repeat(300))
    const other = await keyOf('key-B-0123456789-0123456789-abcdef')
    await expect(decryptStrict(other, enc)).rejects.toThrow()
    expect(await decryptWith(other, enc)).toBe(enc)
  })

  it('暗号文かどうかを頭の印で見分ける', () => {
    expect(isEncrypted('enc:a:b')).toBe(true)
    expect(isEncrypted('encz:a:b')).toBe(true)
    expect(isEncrypted('ふつうの文')).toBe(false)
  })
})
