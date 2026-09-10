// 工数管理ツール (kouba) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、カテゴリ・タスクは user_id でスコープする。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { KOUBA_DEFAULT_CATEGORY_ICON, KOUBA_DEFAULT_TASK_ICON, KOUBA_MIN_HOURS, KOUBA_MAX_HOURS } from '~/types/kouba'
import type { KoubaCategory, KoubaTask, KoubaSubtask, KoubaSubtaskLog } from '~/types/kouba'

export interface KoubaUser {
  id: string
  username: string
}

/** カテゴリは 3×3 グリッドに収める運用のため、position は 0〜8 の9枠まで。 */
export const KOUBA_GRID_SIZE = 9

/**
 * kouba 用テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。
 * D1 の exec() は改行を文区切りとして扱い複数行のCREATE TABLEを渡すと壊れるため、
 * kikigaki.ts と同様に prepare().run() を1文ずつ実行する。
 */
export async function ensureKoubaTables(db: any): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS kouba_categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '${KOUBA_DEFAULT_CATEGORY_ICON}',
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_categories_user ON kouba_categories(user_id, position)`,
    `CREATE TABLE IF NOT EXISTS kouba_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '${KOUBA_DEFAULT_TASK_ICON}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_tasks_category ON kouba_tasks(category_id, sort_order)`,
    `CREATE TABLE IF NOT EXISTS kouba_subtasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_subtasks_task ON kouba_subtasks(task_id)`,
    `CREATE TABLE IF NOT EXISTS kouba_subtask_logs (
      id TEXT PRIMARY KEY,
      subtask_id TEXT NOT NULL,
      work_date TEXT NOT NULL,
      hours INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (subtask_id, work_date)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_subtask_logs_subtask ON kouba_subtask_logs(subtask_id, work_date)`,
  ]
  for (const sql of statements) await db.prepare(sql).run().catch(() => {})

  // 既存テーブルへの列追加（icon/sort_order を後から足した分）。無ければ足す、あれば失敗を握りつぶす。
  const columns = [
    `ALTER TABLE kouba_categories ADD COLUMN icon TEXT NOT NULL DEFAULT '${KOUBA_DEFAULT_CATEGORY_ICON}'`,
    `ALTER TABLE kouba_tasks ADD COLUMN icon TEXT NOT NULL DEFAULT '${KOUBA_DEFAULT_TASK_ICON}'`,
    `ALTER TABLE kouba_tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
  ]
  for (const sql of columns) await db.prepare(sql).run().catch(() => {})
}

/** ログイン必須。未ログインなら 401 を throw。 */
export async function requireKoubaUser(event: any): Promise<KoubaUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** DB が無い場合に 503 を throw して返す。 */
export function requireKoubaDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  return db
}

/** 絵文字アイコンの正規化（空文字ならフォールバック。長すぎる入力はそのまま弾かず先頭だけ使う想定は取らず、trimのみ）。 */
export function normalizeIcon(raw: unknown, fallback: string): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  return s || fallback
}

/** 作業時間（1〜30の整数）の正規化。範囲外・非数値なら null。 */
export function normalizeHours(raw: unknown): number | null {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < KOUBA_MIN_HOURS || n > KOUBA_MAX_HOURS) return null
  return n
}

/** "YYYY-MM-DD" 形式かどうか。 */
export function isValidDateString(raw: unknown): raw is string {
  return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)
}

// ── 読み取り・整形 ──────────────────────────────

interface CategoryRow {
  id: string
  name: string
  icon: string
  position: number
  created_at: string
}
interface TaskRow {
  id: string
  category_id: string
  title: string
  icon: string
  created_at: string
}
interface SubtaskRow {
  id: string
  task_id: string
  title: string
  created_at: string
}
interface SubtaskLogRow {
  id: string
  subtask_id: string
  work_date: string
  hours: number
  created_at: string
}

function shapeSubtaskLog(row: SubtaskLogRow): KoubaSubtaskLog {
  return { id: row.id, workDate: row.work_date, hours: row.hours, createdAt: row.created_at }
}

function shapeSubtask(row: SubtaskRow, logRows: SubtaskLogRow[]): KoubaSubtask {
  const logs = logRows.map(shapeSubtaskLog).sort((a, b) => (a.workDate < b.workDate ? 1 : a.workDate > b.workDate ? -1 : 0))
  const totalHours = logs.reduce((sum, l) => sum + l.hours, 0)
  return { id: row.id, taskId: row.task_id, title: row.title, createdAt: row.created_at, logs, totalHours }
}

function shapeTask(row: TaskRow, subtasks: KoubaSubtask[]): KoubaTask {
  const totalHours = subtasks.reduce((sum, s) => sum + s.totalHours, 0)
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    icon: normalizeIcon(row.icon, KOUBA_DEFAULT_TASK_ICON),
    createdAt: row.created_at,
    subtasks,
    totalHours,
  }
}

function shapeCategory(row: CategoryRow, tasks: KoubaTask[]): KoubaCategory {
  const totalHours = tasks.reduce((sum, t) => sum + t.totalHours, 0)
  return {
    id: row.id,
    name: row.name,
    icon: normalizeIcon(row.icon, KOUBA_DEFAULT_CATEGORY_ICON),
    position: row.position,
    createdAt: row.created_at,
    tasks,
    totalHours,
  }
}

/** ユーザーのカテゴリ→タスク→サブタスク→日別作業時間をまとめて取得（板の表示用）。 */
export async function loadBoard(db: any, userId: string): Promise<KoubaCategory[]> {
  const catRows = await db
    .prepare('SELECT * FROM kouba_categories WHERE user_id = ? ORDER BY position ASC')
    .bind(userId)
    .all<CategoryRow>()
  const categories: CategoryRow[] = catRows?.results ?? []
  if (!categories.length) return []

  const catIds = categories.map((c) => c.id)
  const catPlaceholders = catIds.map(() => '?').join(',')
  const taskRows = await db
    .prepare(`SELECT * FROM kouba_tasks WHERE category_id IN (${catPlaceholders}) ORDER BY sort_order ASC, created_at ASC`)
    .bind(...catIds)
    .all<TaskRow>()
  const tasks: TaskRow[] = taskRows?.results ?? []

  let subtasks: SubtaskRow[] = []
  if (tasks.length) {
    const taskIds = tasks.map((t) => t.id)
    const taskPlaceholders = taskIds.map(() => '?').join(',')
    const subtaskRows = await db
      .prepare(`SELECT * FROM kouba_subtasks WHERE task_id IN (${taskPlaceholders}) ORDER BY created_at ASC`)
      .bind(...taskIds)
      .all<SubtaskRow>()
    subtasks = subtaskRows?.results ?? []
  }

  let logs: SubtaskLogRow[] = []
  if (subtasks.length) {
    const subtaskIds = subtasks.map((s) => s.id)
    const subtaskPlaceholders = subtaskIds.map(() => '?').join(',')
    const logRows = await db
      .prepare(`SELECT * FROM kouba_subtask_logs WHERE subtask_id IN (${subtaskPlaceholders})`)
      .bind(...subtaskIds)
      .all<SubtaskLogRow>()
    logs = logRows?.results ?? []
  }

  const logsBySubtask = new Map<string, SubtaskLogRow[]>()
  for (const l of logs) {
    if (!logsBySubtask.has(l.subtask_id)) logsBySubtask.set(l.subtask_id, [])
    logsBySubtask.get(l.subtask_id)!.push(l)
  }
  const subtasksByTask = new Map<string, KoubaSubtask[]>()
  for (const s of subtasks) {
    const shaped = shapeSubtask(s, logsBySubtask.get(s.id) ?? [])
    if (!subtasksByTask.has(s.task_id)) subtasksByTask.set(s.task_id, [])
    subtasksByTask.get(s.task_id)!.push(shaped)
  }
  const tasksByCategory = new Map<string, KoubaTask[]>()
  for (const t of tasks) {
    const shaped = shapeTask(t, subtasksByTask.get(t.id) ?? [])
    if (!tasksByCategory.has(t.category_id)) tasksByCategory.set(t.category_id, [])
    tasksByCategory.get(t.category_id)!.push(shaped)
  }

  return categories.map((c) => shapeCategory(c, tasksByCategory.get(c.id) ?? []))
}

/** カテゴリの所有者チェック。無ければ null。 */
export async function findOwnedCategory(db: any, userId: string, categoryId: string): Promise<{ id: string } | null> {
  return await db
    .prepare('SELECT id FROM kouba_categories WHERE id = ? AND user_id = ?')
    .bind(categoryId, userId)
    .first<{ id: string }>()
}

/** タスクの所有者チェック（kouba_tasks は user_id を直接持つので join 不要）。無ければ null。 */
export async function findOwnedTask(db: any, userId: string, taskId: string): Promise<{ id: string; categoryId: string } | null> {
  const row = await db
    .prepare('SELECT id, category_id FROM kouba_tasks WHERE id = ? AND user_id = ?')
    .bind(taskId, userId)
    .first<{ id: string; category_id: string }>()
  return row ? { id: row.id, categoryId: row.category_id } : null
}

/** サブタスクの所有者チェック（kouba_subtasks も user_id を直接持つ）。無ければ null。 */
export async function findOwnedSubtask(db: any, userId: string, subtaskId: string): Promise<{ id: string; taskId: string } | null> {
  const row = await db
    .prepare('SELECT id, task_id FROM kouba_subtasks WHERE id = ? AND user_id = ?')
    .bind(subtaskId, userId)
    .first<{ id: string; task_id: string }>()
  return row ? { id: row.id, taskId: row.task_id } : null
}

/** 指定カテゴリ内で次に使う sort_order（末尾に追加する値）。 */
export async function nextTaskSortOrder(db: any, categoryId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM kouba_tasks WHERE category_id = ?')
    .bind(categoryId)
    .first<{ m: number }>()
  return (row?.m ?? -1) + 1
}
