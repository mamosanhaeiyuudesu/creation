// 工数管理ツール (kouba) の型定義。

/** サブタスク（「何をやったか」はタイトルで表す）。時間は日別に分けず hours にまとめて1個持つ（編集可能）。 */
export interface KoubaSubtask {
  id: string
  taskId: string
  title: string
  hours: number // 0.5〜30（30分刻み）
  createdAt: string
}

/** タスク（付箋1枚）。配下のサブタスクの合計時間を totalHours に持つ。 */
export interface KoubaTask {
  id: string
  categoryId: string
  title: string
  icon: string
  createdAt: string
  subtasks: KoubaSubtask[]
  totalHours: number
}

/** カテゴリ（3×3グリッドの1枠）。position は 0〜8。 */
export interface KoubaCategory {
  id: string
  name: string
  icon: string
  position: number
  createdAt: string
  tasks: KoubaTask[]
  totalHours: number
}

/**
 * アイコン未設定時のフォールバック（AI生成が終わるまで・失敗したときの表示）。
 * icon 列には AI が作った SVG 文字列が入る。旧データの絵文字もそのまま表示できる。
 */
export const KOUBA_DEFAULT_CATEGORY_ICON = '📁'
export const KOUBA_DEFAULT_TASK_ICON = '📝'

/** icon が AI 生成の SVG か（false なら絵文字として文字表示する）。 */
export function isSvgIcon(icon: string): boolean {
  return icon.trimStart().startsWith('<svg')
}

/**
 * SVG を <img> の src に使う data URL にする。v-html で埋め込まず <img> で表示するのは、
 * AI の出力にスクリプト等が紛れても <img> 内の SVG では実行されないため。
 */
export function svgIconDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** アイコン生成の対象。 */
export type KoubaIconTarget = 'category' | 'task'

/**
 * サブタスクの作業時間。+/- ボタンで 30 分（0.5時間）ずつ増減する。
 * 0.5 は2進小数で誤差なく表せるので、足し引きも合計も丸め無しで一致する。
 */
export const KOUBA_HOURS_STEP = 0.5
export const KOUBA_MIN_HOURS = 0.5
export const KOUBA_MAX_HOURS = 30

/** 30分刻みに丸めて 0.5〜30 に収める（+/- ボタンで範囲を超えないようにする用）。 */
export function clampKoubaHours(hours: number): number {
  const stepped = Math.round(hours / KOUBA_HOURS_STEP) * KOUBA_HOURS_STEP
  return Math.min(KOUBA_MAX_HOURS, Math.max(KOUBA_MIN_HOURS, stepped))
}

/** 1.5 →「1時間30分」、2 →「2時間」、0.5 →「30分」。30分刻みなので端数はこの2通りだけ。 */
export function formatKoubaHours(hours: number): string {
  const h = Math.floor(hours)
  const half = hours - h >= KOUBA_HOURS_STEP
  if (!h) return '30分'
  return half ? `${h}時間30分` : `${h}時間`
}
