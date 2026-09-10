// 工数管理ツール (kouba) の型定義。

/** サブタスクの日別作業時間1件（その日ぶんの時間のみ。1日1件・編集可能）。 */
export interface KoubaSubtaskLog {
  id: string
  workDate: string // YYYY-MM-DD
  hours: number // 1〜30
  createdAt: string
}

/** サブタスク（「何をやったか」はタイトルで表す）。日別作業時間の合計を totalHours に持つ。 */
export interface KoubaSubtask {
  id: string
  taskId: string
  title: string
  createdAt: string
  logs: KoubaSubtaskLog[]
  totalHours: number
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

/** アイコン未設定時のフォールバック。 */
export const KOUBA_DEFAULT_CATEGORY_ICON = '📁'
export const KOUBA_DEFAULT_TASK_ICON = '📝'

/** アイコン選択の候補（カテゴリ・タスク共通）。 */
export const KOUBA_ICON_PRESETS = [
  '📁', '📝', '📈', '🎯', '💡', '🧠', '❤️', '💰',
  '🏃', '📚', '🎨', '🛠️', '🌱', '📣', '🗓️', '✅',
  '🔥', '⭐', '💬', '🔍',
]

/** サブタスクの日別作業時間の入力範囲（select式）。 */
export const KOUBA_MIN_HOURS = 1
export const KOUBA_MAX_HOURS = 30
