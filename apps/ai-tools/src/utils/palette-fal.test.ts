import { describe, expect, it } from 'vitest'
import { buildFalInput, clamp, falErrorMessage, isHttpsUrl } from './palette-fal'
import type { PaletteGenerateRequest, PaletteParams } from '../types/palette'

const baseParams: PaletteParams = {
  imageSize: 'landscape_4_3',
  width: 1024,
  height: 1024,
  steps: 28,
  guidance: 3.5,
  numImages: 1,
  seed: null,
  format: 'jpeg',
  safety: true,
  acceleration: 'none',
  strength: 0.85,
}
const req = (over: Partial<PaletteGenerateRequest> = {}, params: Partial<PaletteParams> = {}): PaletteGenerateRequest => ({
  mode: 't2i',
  promptJa: '',
  prompt: 'a cat',
  loras: [],
  params: { ...baseParams, ...params },
  ...over,
})

describe('buildFalInput', () => {
  it('テキスト→画像の既定値を fal の名前に写す', () => {
    expect(buildFalInput(req())).toEqual({
      prompt: 'a cat',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: 'jpeg',
      enable_safety_checker: true,
      acceleration: 'none',
      loras: [],
      image_size: 'landscape_4_3',
    })
  })

  it('範囲外の値は丸める（課金が膨らむ入力を通さない）', () => {
    const i = buildFalInput(req({}, { steps: 999, guidance: -5, numImages: 40 }))
    expect(i.num_inference_steps).toBe(50)
    expect(i.guidance_scale).toBe(0)
    expect(i.num_images).toBe(4)
  })

  it('seed は null なら送らず、数値なら送る（0 も有効）', () => {
    expect('seed' in buildFalInput(req())).toBe(false)
    expect(buildFalInput(req({}, { seed: 0 })).seed).toBe(0)
    expect(buildFalInput(req({}, { seed: 123 })).seed).toBe(123)
  })

  it('LoRA の強さを 0〜4 に丸め、5 件までにする', () => {
    const loras = Array.from({ length: 8 }, (_, n) => ({ path: `https://x/${n}.safetensors`, scale: n === 0 ? 9 : 0.8 }))
    const i = buildFalInput(req({ loras }))
    const out = i.loras as { path: string; scale: number }[]
    expect(out).toHaveLength(5)
    expect(out[0]).toEqual({ path: 'https://x/0.safetensors', scale: 4 })
    expect(out[1]!.scale).toBe(0.8)
  })

  it('カスタムサイズは 256〜2048 に丸める', () => {
    const i = buildFalInput(req({}, { imageSize: 'custom', width: 100, height: 5000 }))
    expect(i.image_size).toEqual({ width: 256, height: 2048 })
  })

  it('画像→画像: auto なら image_size を送らず、画像と strength を足す', () => {
    const i = buildFalInput(req({ mode: 'i2i', imageDataUrl: 'data:image/jpeg;base64,AAA' }, { imageSize: 'auto', strength: 7 }))
    expect('image_size' in i).toBe(false)
    expect(i.image_url).toBe('data:image/jpeg;base64,AAA')
    expect(i.strength).toBe(1)
  })

  it('テキスト→画像に auto や未知のサイズが来ても横長 4:3 にする', () => {
    expect(buildFalInput(req({}, { imageSize: 'auto' })).image_size).toBe('landscape_4_3')
    expect(buildFalInput(req({}, { imageSize: 'bogus' as any })).image_size).toBe('landscape_4_3')
  })

  it('png / acceleration / セーフティの切り替え', () => {
    const i = buildFalInput(req({}, { format: 'png', acceleration: 'regular', safety: false }))
    expect(i.output_format).toBe('png')
    expect(i.acceleration).toBe('regular')
    expect(i.enable_safety_checker).toBe(false)
  })
})

describe('helpers', () => {
  it('clamp は数でないとき既定値を返す', () => {
    expect(clamp('abc', 1, 5, 3)).toBe(3)
    expect(clamp(NaN, 1, 5, 3)).toBe(3)
    expect(clamp('4', 1, 5, 3)).toBe(4)
  })

  it('isHttpsUrl は https だけ通す', () => {
    expect(isHttpsUrl('https://huggingface.co/a/b/resolve/main/x.safetensors')).toBe(true)
    expect(isHttpsUrl('http://example.com/x')).toBe(false)
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpsUrl('not a url')).toBe(false)
    expect(isHttpsUrl(123)).toBe(false)
  })

  it('falErrorMessage は detail が文字列でも配列でも読める', () => {
    expect(falErrorMessage({ detail: 'boom' }, 'x')).toBe('boom')
    expect(falErrorMessage({ detail: [{ msg: 'bad a' }, { msg: 'bad b' }] }, 'x')).toBe('bad a / bad b')
    expect(falErrorMessage(null, 'fallback')).toBe('fallback')
  })
})
