// 工数管理ツール (kouba) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、カテゴリ・タスクは user_id でスコープする。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { KOUBA_DEFAULT_CATEGORY_ICON, KOUBA_DEFAULT_TASK_ICON } from '~/types/kouba'
import type { KoubaCategory, KoubaTask, KoubaLog } from '~/types/kouba'

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
    `CREATE TABLE IF NOT EXISTS kouba_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      work_date TEXT NOT NULL,
      hours REAL NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_logs_task ON kouba_logs(task_id, work_date)`,
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
interface LogRow {
  id: string
  task_id: string
  work_date: string
  hours: number
  note: string
  created_at: string
}

function shapeLog(row: LogRow): KoubaLog {
  return { id: row.id, workDate: row.work_date, hours: row.hours, note: row.note, createdAt: row.created_at }
}

function shapeTask(row: TaskRow, logRows: LogRow[]): KoubaTask {
  const logs = logRows
    .map(shapeLog)
    .sort((a, b) => (a.workDate !== b.workDate ? (a.workDate < b.workDate ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1))
  const totalHours = logs.reduce((sum, l) => sum + l.hours, 0)
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    icon: normalizeIcon(row.icon, KOUBA_DEFAULT_TASK_ICON),
    createdAt: row.created_at,
    logs,
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

/** ユーザーのカテゴリ→タスク→ログをまとめて取得（板の表示用）。カテゴリはposition昇順、タスクはsort_order昇順。 */
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

  let logs: LogRow[] = []
  if (tasks.length) {
    const taskIds = tasks.map((t) => t.id)
    const taskPlaceholders = taskIds.map(() => '?').join(',')
    const logRows = await db
      .prepare(`SELECT * FROM kouba_logs WHERE task_id IN (${taskPlaceholders})`)
      .bind(...taskIds)
      .all<LogRow>()
    logs = logRows?.results ?? []
  }

  const logsByTask = new Map<string, LogRow[]>()
  for (const l of logs) {
    if (!logsByTask.has(l.task_id)) logsByTask.set(l.task_id, [])
    logsByTask.get(l.task_id)!.push(l)
  }
  const tasksByCategory = new Map<string, KoubaTask[]>()
  for (const t of tasks) {
    const shaped = shapeTask(t, logsByTask.get(t.id) ?? [])
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

/** 指定カテゴリ内で次に使う sort_order（末尾に追加する値）。 */
export async function nextTaskSortOrder(db: any, categoryId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM kouba_tasks WHERE category_id = ?')
    .bind(categoryId)
    .first<{ m: number }>()
  return (row?.m ?? -1) + 1
}
