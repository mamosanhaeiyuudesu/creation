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
  /** 動画のシーン用に作るとき、その動画の id（画像の履歴には出さない） */
  videoId?: string
}

export interface PaletteStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  queuePosition?: number
  generation?: PaletteGeneration
  error?: string
}

export type PaletteBalanceResponse =
  | { available: true; balance: number; currency: string }
  | { available: false; reason: 'no-key' | 'forbidden' | 'error' }

/** 入力の上限（サーバー側でも同じ値で丸める） */
export const PALETTE_LIMITS = {
  steps: { min: 1, max: 50 },
  guidance: { min: 0, max: 35 },
  numImages: { min: 1, max: 4 },
  scale: { min: 0, max: 4 },
  strength: { min: 0.01, max: 1 },
  size: { min: 256, max: 2048 },
} as const

// ── テキスト → 動画（インスタのリール用） ──────────────────────────────

/** 読み上げの声（OpenAI gpt-4o-mini-tts） */
export const PALETTE_VOICES = ['coral', 'nova', 'shimmer', 'sage', 'alloy', 'ballad', 'verse', 'ash', 'echo', 'fable', 'onyx'] as const
export type PaletteVoice = (typeof PALETTE_VOICES)[number]

/** 画像の大きさ。どちらも 9:16 で、書き出しは 1080×1920 にそろえる */
export type PaletteVideoQuality = 'standard' | 'high'
export const PALETTE_VIDEO_SIZES: Record<PaletteVideoQuality, { width: number; height: number }> = {
  standard: { width: 864, height: 1536 },
  high: { width: 1152, height: 2048 },
}

export const PALETTE_VIDEO_LIMITS = {
  scenes: { min: 3, max: 20 },
  articleChars: 20000,
  /** 1シーンの読み上げの上限（TTS の音声を D1 の1行に収めるため） */
  narrationChars: 200,
} as const

export interface PaletteVideoScene {
  /** シーンの id（クライアントで振る） */
  id: string
  /** 読み上げる文（字幕にもなる） */
  narration: string
  /** 絵の説明（日本語） */
  sceneJa: string
  /** 画像。生成のたびに差し替える */
  image: {
    /** palette_generations の id（fal の request_id） */
    generationId: string
    url: string
    seed: string | null
    /** 生成したときの「共通設定＋絵の説明＋LoRA」。今の値と違えば作り直しの対象 */
    key: string
  } | null
  /** 読み上げ。palette_video_audio の id と、作ったときの文・声・長さ（秒） */
  audio: {
    id: string
    text: string
    voice: PaletteVoice
    duration: number
  } | null
}

export interface PaletteVideo {
  id: string
  title: string
  article: string
  /** 全シーン共通の「人物・画風の設定」（日本語） */
  style: string
  voice: PaletteVoice
  quality: PaletteVideoQuality
  loras: (PaletteLoraUse & { name?: string })[]
  scenes: PaletteVideoScene[]
  createdAt: string
  updatedAt: string
}

export interface PaletteVideoSummary {
  id: string
  title: string
  sceneCount: number
  thumbUrl: string
  updatedAt: string
}

/** AI のシーン分けの結果 */
export interface PaletteVideoPlan {
  title: string
  style: string
  scenes: { narration: string; sceneJa: string }[]
}
