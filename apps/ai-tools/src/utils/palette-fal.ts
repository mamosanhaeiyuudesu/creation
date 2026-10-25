// fal.ai に渡す入力の組み立てと検証（純関数。サーバー・テストの両方から使う）。
import { PALETTE_LIMITS } from '../types/palette'
import type { PaletteGenerateRequest, PaletteParams } from '../types/palette'

export function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(max, Math.max(min, v))
}

export function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== 'string' || s.length > 1000) return false
  try {
    return new URL(s).protocol === 'https:'
  } catch {
    return false
  }
}

/** fal のシードは 20 桁近くあり、JS の number では下の桁が丸められる（再現できなくなる）ので文字列で扱う */
export const SEED_PATTERN = /^\d{1,20}$/

/** fal に送る JSON 文字列にする。シードだけ、文字列のまま数値として書き出す（精度を落とさない）。 */
export function stringifyFalInput(input: Record<string, unknown>): string {
  return JSON.stringify(input).replace(/"seed":"(\d+)"/, '"seed":$1')
}

const SIZE_PRESETS = ['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9']

/** 画面の入力から fal.ai に渡す入力 JSON を作る。範囲外の値は丸める（課金が膨らむ入力を通さない）。 */
export function buildFalInput(req: PaletteGenerateRequest): Record<string, unknown> {
  const p: Partial<PaletteParams> = req.params ?? {}
  const L = PALETTE_LIMITS
  const input: Record<string, unknown> = {
    prompt: req.prompt,
    num_inference_steps: Math.round(clamp(p.steps, L.steps.min, L.steps.max, 28)),
    guidance_scale: clamp(p.guidance, L.guidance.min, L.guidance.max, 3.5),
    num_images: Math.round(clamp(p.numImages, L.numImages.min, L.numImages.max, 1)),
    output_format: p.format === 'png' ? 'png' : 'jpeg',
    enable_safety_checker: p.safety !== false,
    acceleration: p.acceleration === 'regular' ? 'regular' : 'none',
    loras: (req.loras ?? []).slice(0, 5).map((l) => ({
      path: l.path,
      scale: clamp(l.scale, L.scale.min, L.scale.max, 1),
    })),
  }
  const seed = p.seed === null || p.seed === undefined ? '' : String(p.seed).trim()
  if (SEED_PATTERN.test(seed)) input.seed = seed // 文字列のまま持ち、stringifyFalInput で数値として出す
  if (p.imageSize === 'custom') {
    input.image_size = {
      width: Math.round(clamp(p.width, L.size.min, L.size.max, 1024)),
      height: Math.round(clamp(p.height, L.size.min, L.size.max, 1024)),
    }
  } else if (typeof p.imageSize === 'string' && SIZE_PRESETS.includes(p.imageSize)) {
    input.image_size = p.imageSize
  } else if (req.mode === 't2i') {
    input.image_size = 'landscape_4_3'
  }
  // i2i で 'auto' のときは image_size を送らない＝元画像と同じ大きさ
  if (req.mode === 'i2i') {
    input.image_url = req.imageDataUrl
    input.strength = clamp(p.strength, L.strength.min, L.strength.max, 0.85)
  }
  return input
}

/** fal.ai のエラー応答から人に読める文を取り出す（detail が文字列・配列のどちらでも来る）。 */
export function falErrorMessage(body: any, fallback: string): string {
  const d = body?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d.length) {
    return d.map((x: any) => (typeof x === 'string' ? x : x?.msg || JSON.stringify(x))).join(' / ')
  }
  if (typeof body?.message === 'string') return body.message
  return fallback
}
