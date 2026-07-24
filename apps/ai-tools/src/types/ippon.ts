// 紙のスケッチを撮影して顧客提案用の3Dビジュアルを作る ippon（Sketch2View）の型定義。
// 目的は「イメージを伝えること」であり製作精度は求めない（仕様§1）。

// ── スタイルプリセット（仕様§4.1）──
export type StylePreset = 'natural' | 'modern' | 'industrial' | 'white'

export const STYLE_PRESETS: { value: StylePreset; label: string }[] = [
  { value: 'natural', label: 'ナチュラル' },
  { value: 'modern', label: 'モダン' },
  { value: 'industrial', label: 'インダストリアル' },
  { value: 'white', label: 'ホワイト' },
]

// ── Claude がスケッチを読み解いた結果（仕様§3.3 / §4.2）──
// スネークケースは Claude が返す生JSONに合わせる。
export interface Interpretation {
  // 何の家具・什器か（例: 壁面収納棚 / カウンター）
  category: string
  // 概算サイズ（mm）。読めなければ null（推測はするが不明は無理に埋めない）
  width_mm: number | null
  depth_mm: number | null
  height_mm: number | null
  // 収納什器なら棚段数。該当しなければ null
  shelves: number | null
  // 脚部の有無（テーブル/カウンター等）
  has_legs: boolean
  // 材質の推定（例: オーク突板、マットな仕上げ）
  material: string
  // 3D生成AIへ渡す英語プロンプト（形状記述）
  prompt_en: string
  // 顧客に見せる前に気づけるよう、AIが補った点を列挙（仕様§3.4）
  completions: string[]
  // 入力メッセージ（顧客の要望）を、この読み取り/形状にどう反映したか（空メッセージなら空配列）
  applied_requests: string[]
  // ひとことの読み取りサマリ（日本語）
  summary: string
}

/** マッシングモデル生成に使う正規化済みスペック（サーバー内部）。 */
export interface MassingSpec {
  category: string
  widthMm: number
  depthMm: number
  heightMm: number
  shelves: number
  hasLegs: boolean
  style: StylePreset
}

// ── 3D生成プロバイダの契約（仕様§5：複数社を差し替え可能に抽象化）──
export interface GenerateInput {
  /** 前処理済みの線画（base64 data URL）。1枚が基本 */
  sketch: string
  /** Claude が作った形状記述（英語プロンプト） */
  prompt: string
  /** 正規化済みスペック（mock のマッシング生成に使う。実API は主に prompt/sketch を使う） */
  spec: MassingSpec
}

export interface GenerateResult {
  /** モデル本体（GLB の data URL もしくはリモートURL） */
  modelUrl: string
  format: 'glb'
  /** 生成に使ったプロバイダ名（例: mock / tripo） */
  provider: string
  /** 実API のジョブID等（あれば）。デバッグ・再取得用 */
  externalId?: string
}

// ── 永続化するプロジェクト（案件）とバージョン ──
export interface ProjectVersion {
  id: string
  label: string
  sketchUrl: string
  interpretation: Interpretation
  modelUrl: string
  provider: string
  createdAt: string
}

export interface Project {
  id: string
  title: string
  note: string
  style: StylePreset
  shareToken: string
  createdAt: string
  updatedAt: string
  versions: ProjectVersion[]
}

/** 一覧用の軽量サマリ（モデル本体は含めない）。 */
export interface ProjectSummary {
  id: string
  title: string
  style: StylePreset
  shareToken: string
  createdAt: string
  updatedAt: string
  versionCount: number
  thumbSketchUrl: string | null
}

// ── リクエストボディ ──
export interface InterpretRequest {
  sketch: string // base64 data URL
  note?: string
  style?: StylePreset
}

export interface CreateProjectRequest {
  title?: string
  note?: string
  style: StylePreset
  sketch: string
  interpretation: Interpretation
}
