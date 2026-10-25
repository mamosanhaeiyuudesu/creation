// palette（FLUX LoRA 画像生成）の型。サーバー・画面で共有する。

export type PaletteMode = 't2i' | 'i2i'

export interface PaletteLora {
  id: string
  name: string
  /** .safetensors などの重みファイルの URL（fal.ai から取りに行ける公開 URL） */
  url: string
  /** 使うときの既定の強さ（0〜4） */
  scale: number
  /** 呼び出しに必要なトリガーワード（無ければ空） */
  triggerWord: string
  memo: string
}

export type PaletteImageSizePreset =
  | 'square_hd'
  | 'square'
  | 'portrait_4_3'
  | 'portrait_16_9'
  | 'landscape_4_3'
  | 'landscape_16_9'

/** 画面で選ぶ画像サイズ。'auto' は i2i 専用（元画像と同じ大きさ）、'custom' は幅×高さ指定。 */
export type PaletteImageSize = PaletteImageSizePreset | 'auto' | 'custom'

export interface PaletteParams {
  imageSize: PaletteImageSize
  width: number
  height: number
  steps: number
  guidance: number
  numImages: number
  /** null ならランダム。fal のシードは 20 桁近くあり JS の数値では丸められるので、数字の文字列で持つ */
  seed: string | null
  format: 'jpeg' | 'png'
  safety: boolean
  acceleration: 'none' | 'regular'
  /** i2i のみ。0.01〜1 */
  strength: number
}

export interface PaletteLoraUse {
  path: string
  scale: number
}

export interface PaletteImage {
  url: string
  width: number
  height: number
  contentType: string
}

export type PaletteStatus = 'pending' | 'completed' | 'failed'

export interface PaletteGeneration {
  id: string
  mode: PaletteMode
  promptJa: string
  prompt: string
  /** 生成時の PaletteParams と LoRA（復元用） */
  params: Partial<PaletteParams> & { loras?: (PaletteLoraUse & { name?: string })[] }
  status: PaletteStatus
  images: PaletteImage[]
  /** 結果のシード（数字の文字列） */
  seed: string | null
  error: string
  createdAt: string
}

export interface PaletteGenerateRequest {
  mode: PaletteMode
  promptJa: string
  prompt: string
  loras: (PaletteLoraUse & { name?: string })[]
  params: PaletteParams
  /** i2i の入力画像（data URL） */
  imageDataUrl?: string
}

export interface PaletteStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  queuePosition?: number
  generation?: PaletteGeneration
  error?: string
}

/** 入力の上限（サーバー側でも同じ値で丸める） */
export const PALETTE_LIMITS = {
  steps: { min: 1, max: 50 },
  guidance: { min: 0, max: 35 },
  numImages: { min: 1, max: 4 },
  scale: { min: 0, max: 4 },
  strength: { min: 0.01, max: 1 },
  size: { min: 256, max: 2048 },
} as const
