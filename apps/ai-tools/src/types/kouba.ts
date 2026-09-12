// 工数管理ツール (kouba) の型定義。

/** サブタスク（「何をやったか」はタイトルで表す）。時間は日別に分けず hours にまとめて1個持つ（編集可能）。 */
export interface KoubaSubtask {
  id: string
  taskId: string
  title: string
  hours: number // 0〜30（30分刻み。0時間のまま置いておける）
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

// ── 今のテーマ（板のトップに掲げる一言）──────────────────────────────

/**
 * トップに掲げるテーマ。掲載中は1件だけ（endedAt が null）で、書き換えるとそれまでの分は endedAt が入って履歴になる。
 * 日時は ISO8601(UTC)。SQLite の `datetime('now')` 形式（"YYYY-MM-DD HH:MM:SS"）は
 * ブラウザによってローカル時刻として解釈されてしまうので、サーバー側で必ず toISOString() を入れること。
 */
export interface KoubaTheme {
  id: string
  text: string
  startedAt: string
  endedAt: string | null
}

/** 履歴一覧に出す下限。これ未満しか掲げていないものは、書き換えの途中経過とみなして履歴に出さない。 */
export const KOUBA_THEME_MIN_HISTORY_MS = 24 * 60 * 60 * 1000

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** ISO日時を JST の「何日目か」を表す通し番号にする（日付だけの引き算に使う）。 */
function jstDayIndex(time: number): number {
  return Math.floor((time + JST_OFFSET_MS) / 86400000)
}

/** ISO日時を JST の 2026/5/4 形式にする。 */
function formatJstDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + JST_OFFSET_MS)
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

/**
 * 掲載日数。開始日と終了日の両方を数える（2026/4/5〜2026/5/4 なら30日）＝
 * 時刻の差ではなく JST の日付の差で数えるので、「何日ぶん掲げたか」の見た目と合う。
 * 掲載中のものは今日までで数える。
 */
export function koubaThemeDays(theme: KoubaTheme, now: Date = new Date()): number {
  const start = jstDayIndex(new Date(theme.startedAt).getTime())
  const end = jstDayIndex(theme.endedAt ? new Date(theme.endedAt).getTime() : now.getTime())
  return Math.max(1, end - start + 1)
}

/** 「2026/4/5〜2026/5/4（30日）」／掲載中は「2026/5/4〜（掲載中・9日目）」。 */
export function formatKoubaThemePeriod(theme: KoubaTheme, now: Date = new Date()): string {
  const days = koubaThemeDays(theme, now)
  if (!theme.endedAt) return `${formatJstDate(theme.startedAt)}〜（掲載中・${days}日目）`
  return `${formatJstDate(theme.startedAt)}〜${formatJstDate(theme.endedAt)}（${days}日）`
}

/**
 * サブタスクの作業時間。+/- ボタンで 30 分（0.5時間）ずつ増減する。
 * 0.5 は2進小数で誤差なく表せるので、足し引きも合計も丸め無しで一致する。
 * 下限は 0＝「やったことだけ先に書いて時間は後で入れる」ができるよう、0時間のサブタスクを許す。
 */
export const KOUBA_HOURS_STEP = 0.5
export const KOUBA_MIN_HOURS = 0
export const KOUBA_MAX_HOURS = 30

/** 30分刻みに丸めて 0〜30 に収める（+/- ボタンで範囲を超えないようにする用）。 */
export function clampKoubaHours(hours: number): number {
  const stepped = Math.round(hours / KOUBA_HOURS_STEP) * KOUBA_HOURS_STEP
  return Math.min(KOUBA_MAX_HOURS, Math.max(KOUBA_MIN_HOURS, stepped))
}

/** 1.5 →「1時間30分」、2 →「2時間」、0.5 →「30分」、0 →「0時間」。30分刻みなので端数はこの2通りだけ。 */
export function formatKoubaHours(hours: number): string {
  const h = Math.floor(hours)
  const half = hours - h >= KOUBA_HOURS_STEP
  if (!h) return half ? '30分' : '0時間'
  return half ? `${h}時間30分` : `${h}時間`
}
