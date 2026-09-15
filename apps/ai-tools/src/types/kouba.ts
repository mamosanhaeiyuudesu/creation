// 工数管理ツール (kouba) の型定義。
//
// **階層は カテゴリ → ジョブ（付箋1枚） → タスク（時間を持つ実作業） → サブタスク（タスクにぶら下がる細目）の4段**。
// 2026-09-15に「タスク」「サブタスク」の呼び名を1段ずつ繰り下げた（旧タスク→ジョブ、旧サブタスク→タスク）うえで、
// 新しく「サブタスク」という概念を追加した（DONEにすると紐づくタスクの時間へ加算される細目）。
// **この改名は画面の文言・TypeScriptの型名・APIパスにだけ及ぼし、D1のテーブル名・列名は変えていない**
// （データ移行が不要で最も安全という判断。既存の `kouba_tasks.category_id`・`kouba_achievements.impact` のような
// 「実装は残るが名前は古いまま」の列と同じ扱い）。対応は次のとおり:
//   UI「ジョブ」  = 型 KoubaJob     = DBテーブル kouba_tasks   （旧UI「タスク」）
//   UI「タスク」  = 型 KoubaTask    = DBテーブル kouba_subtasks（旧UI「サブタスク」）
//   UI「サブタスク」= 型 KoubaSubtask = DBテーブル kouba_task_subtasks（新規）
// サーバー側のSQLは旧テーブル名・列名のまま書く。`server/utils/kouba.ts` の shape 関数で新しいフィールド名に組み替える。

/**
 * サブタスク（タスクにぶら下がる細目。DONEにすると `hours` が紐づくタスクへ加算される）。2026-09-15追加。
 * "今のテーマ"の下に独立した一覧として出し、そこから直接追加・DONEの切り替えができる（板を深く辿らなくてよい）。
 * DBは新規テーブル `kouba_task_subtasks`。
 */
export interface KoubaSubtask {
  id: string
  taskId: string
  title: string
  hours: number // 0〜30（30分刻み）。DONEにした時点のこの値がタスクへ加算される
  done: boolean
  doneAt: string | null
  createdAt: string
}

/**
 * タスク（ジョブの中の実作業。「何をやったか」はタイトルで表す）。時間は日別に分けず hours にまとめて1個持つ
 * （手入力の+/-で自由に増減できる。加えて、紐づくサブタスクをDONEにするとその分が自動で加算される＝
 * サブタスクのON/OFFと手入力の+/-は同じ hours を触る2つの入り口で、どちらで動かしても以後は区別を持たない）。
 */
export interface KoubaTask {
  id: string
  jobId: string
  title: string
  hours: number // 0〜30（30分刻み。0時間のまま置いておける）
  /** このタスクにぶら下がるサブタスク（DONE/未DONEの両方を含む）。 */
  subtasks: KoubaSubtask[]
  createdAt: string
}

/**
 * ジョブ（付箋1枚）。配下のタスクの合計時間を totalHours に持つ。
 * **1つ以上のカテゴリに同時掲載できる**（2026-09-13〜）＝ categoryIds が複数なら、同じ内容（同じタスク・
 * 同じ合計時間）がその数だけカテゴリの枠に重複して表示される。ジョブとしては1つで、どのカテゴリ経由で
 * 開いても同じ `KoubaJob` を編集することになる＝表示が複数あっても中身は常に同期している。
 */
export interface KoubaJob {
  id: string
  categoryIds: string[]
  title: string
  icon: string
  createdAt: string
  tasks: KoubaTask[]
  totalHours: number
  /** 「直近で特に力を入れている」印。ONのジョブは付箋の枠をハイライトして目立たせる。 */
  focused: boolean
  /** 補足の説明文（任意）。 */
  description: string
}

/** カテゴリ（3×3グリッドの1枠）。position は 0〜8。 */
export interface KoubaCategory {
  id: string
  name: string
  icon: string
  position: number
  createdAt: string
  jobs: KoubaJob[]
  totalHours: number
  /** 補足の説明文（任意）。 */
  description: string
}

export const KOUBA_DESCRIPTION_MAX = 500

/**
 * アイコン未設定時のフォールバック（AI生成が終わるまで・失敗したときの表示）。
 * icon 列には AI が作った SVG 文字列が入る。旧データの絵文字もそのまま表示できる。
 */
export const KOUBA_DEFAULT_CATEGORY_ICON = '📁'
export const KOUBA_DEFAULT_JOB_ICON = '📝'

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

/** アイコン生成の対象（アイコンを持つのはカテゴリとジョブだけ。タスク・サブタスクは持たない）。 */
export type KoubaIconTarget = 'category' | 'job'

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

/** ISO日時を JST の 2026/5/4 形式にする。達成したことの一覧でも使う。 */
export function formatJstDate(iso: string): string {
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
 * 作業時間。+/- ボタンで 30 分（0.5時間）ずつ増減する。タスク（手入力の+/-）・サブタスク（DONE時に
 * タスクへ加算される分）の両方がこの刻みを共有する。
 * 0.5 は2進小数で誤差なく表せるので、足し引きも合計も丸め無しで一致する。
 * 下限は 0＝「やったことだけ先に書いて時間は後で入れる」ができるよう、0時間のまま置いておける。
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

// ── 達成したこと（画面下部の一覧）──────────────────────────────

/**
 * 達成したこと1件。`achievedAt` は「達成した日」を表すISO8601(UTC)＝日付選択(JST)を
 * その日の正午JSTに固定して変換した値（日付境界のズレを避けるため。時刻そのものに意味は無い）。
 */
export interface KoubaAchievement {
  id: string
  text: string
  achievedAt: string
  createdAt: string
}

export const KOUBA_ACHIEVEMENT_TEXT_MAX = 500
