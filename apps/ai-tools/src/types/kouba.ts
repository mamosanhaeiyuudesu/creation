// 工数管理ツール (kouba) の型定義。

/** 作業ログ1件（日付・時間・箇条書きメモ）。 */
export interface KoubaLog {
  id: string
  workDate: string // YYYY-MM-DD
  hours: number
  note: string
  createdAt: string
}

/** タスク（付箋1枚）。ログの合計時間を totalHours に持つ。 */
export interface KoubaTask {
  id: string
  categoryId: string
  title: string
  createdAt: string
  logs: KoubaLog[]
  totalHours: number
}

/** カテゴリ（3×3グリッドの1枠）。position は 0〜8。 */
export interface KoubaCategory {
  id: string
  name: string
  position: number
  createdAt: string
  tasks: KoubaTask[]
  totalHours: number
}
