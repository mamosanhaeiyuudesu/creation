// 工数管理ツール (kouba) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、カテゴリ・タスクは user_id でスコープする。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import {
  KOUBA_DEFAULT_CATEGORY_ICON,
  KOUBA_DEFAULT_TASK_ICON,
  KOUBA_MIN_HOURS,
  KOUBA_MAX_HOURS,
  KOUBA_HOURS_STEP,
  KOUBA_THEME_MIN_HISTORY_MS,
} from '~/types/kouba'
import type { KoubaCategory, KoubaTask, KoubaSubtask, KoubaTheme } from '~/types/kouba'

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
      hours REAL NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_subtasks_task ON kouba_subtasks(task_id)`,
    `CREATE TABLE IF NOT EXISTS kouba_themes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_themes_user ON kouba_themes(user_id, started_at DESC)`,
  ]
  for (const sql of statements) await db.prepare(sql).run().catch(() => {})

  // 既存テーブルへの列追加（icon/sort_order/hours を後から足した分）。無ければ足す、あれば失敗を握りつぶす。
  const columns = [
    `ALTER TABLE kouba_categories ADD COLUMN icon TEXT NOT NULL DEFAULT '${KOUBA_DEFAULT_CATEGORY_ICON}'`,
    `ALTER TABLE kouba_tasks ADD COLUMN icon TEXT NOT NULL DEFAULT '${KOUBA_DEFAULT_TASK_ICON}'`,
    `ALTER TABLE kouba_tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE kouba_subtasks ADD COLUMN hours REAL NOT NULL DEFAULT 1`,
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

/**
 * 作業時間（0〜30、30分刻み）の正規化。範囲外・非数値なら null。**0 は有効な値**（時間を入れずに置いておける）
 * なので、呼び出し側は返り値を `=== null` で見ること（falsy 判定だと 0 を弾いてしまう）。
 * 刻みからずれた値は 30分単位に丸める（画面は +/- しか出さないので、ずれるのは直接APIを叩いたときだけ）。
 * 本番の既存テーブルの hours は INTEGER 宣言のままだが（新規作成分だけ REAL）、SQLite の型アフィニティは
 * 整数にできない実数を REAL のまま保存するので 1.5 はそのまま入る（実測で確認済み＝列の作り直しは不要）。
 */
export function normalizeHours(raw: unknown): number | null {
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  const stepped = Math.round(n / KOUBA_HOURS_STEP) * KOUBA_HOURS_STEP
  if (stepped < KOUBA_MIN_HOURS || stepped > KOUBA_MAX_HOURS) return null
  return stepped
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
  hours: number
  created_at: string
}

function shapeSubtask(row: SubtaskRow): KoubaSubtask {
  return { id: row.id, taskId: row.task_id, title: row.title, hours: row.hours, createdAt: row.created_at }
}

function shapeTask(row: TaskRow, subtasks: KoubaSubtask[]): KoubaTask {
  const totalHours = subtasks.reduce((sum, s) => sum + s.hours, 0)
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

/** ユーザーのカテゴリ→タスク→サブタスクをまとめて取得（板の表示用）。 */
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

  const subtasksByTask = new Map<string, KoubaSubtask[]>()
  for (const s of subtasks) {
    const shaped = shapeSubtask(s)
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

/**
 * カテゴリの position を今の並び順のまま 0 から詰め直し、カテゴリ数を返す。
 * 削除で空いた枠を残さず後ろのカテゴリを前へ寄せるため（削除後と、作成前＝旧データの穴埋めに呼ぶ）。
 */
export async function compactCategoryPositions(db: any, userId: string): Promise<number> {
  const rows = await db
    .prepare('SELECT id, position FROM kouba_categories WHERE user_id = ? ORDER BY position ASC, created_at ASC')
    .bind(userId)
    .all<{ id: string; position: number }>()
  const categories: { id: string; position: number }[] = rows?.results ?? []
  const updates = categories
    .map((c, i) => (c.position === i ? null : db.prepare('UPDATE kouba_categories SET position = ? WHERE id = ?').bind(i, c.id)))
    .filter(Boolean)
  if (updates.length) await db.batch(updates)
  return categories.length
}

/** 指定カテゴリ内で次に使う sort_order（末尾に追加する値）。 */
export async function nextTaskSortOrder(db: any, categoryId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM kouba_tasks WHERE category_id = ?')
    .bind(categoryId)
    .first<{ m: number }>()
  return (row?.m ?? -1) + 1
}

// ── 今のテーマ ──────────────────────────────

interface ThemeRow {
  id: string
  text: string
  started_at: string
  ended_at: string | null
}

function shapeTheme(row: ThemeRow): KoubaTheme {
  return { id: row.id, text: row.text, startedAt: row.started_at, endedAt: row.ended_at }
}

/** 今掲げているテーマ（ended_at が NULL の1件）。無ければ null。 */
export async function loadCurrentTheme(db: any, userId: string): Promise<KoubaTheme | null> {
  const row = await db
    .prepare('SELECT id, text, started_at, ended_at FROM kouba_themes WHERE user_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1')
    .bind(userId)
    .first<ThemeRow>()
  return row ? shapeTheme(row) : null
}

/**
 * 掲載を終えたテーマの履歴（新しい順）。**1日（24時間）以上掲げたものだけ**を返す＝
 * 書き間違いの直しのような短命な版まで並べても読む価値が無いため。
 * julianday() は "...Z" 付きの ISO8601 をそのまま読める（実測確認済み）ので、絞り込みはSQL側で済ませる。
 */
export async function loadThemeHistory(db: any, userId: string): Promise<KoubaTheme[]> {
  const rows = await db
    .prepare(
      `SELECT id, text, started_at, ended_at FROM kouba_themes
       WHERE user_id = ? AND ended_at IS NOT NULL
         AND (julianday(ended_at) - julianday(started_at)) * 86400000 >= ?
       ORDER BY started_at DESC`
    )
    .bind(userId, KOUBA_THEME_MIN_HISTORY_MS)
    .all<ThemeRow>()
  return (rows?.results ?? []).map(shapeTheme)
}

/**
 * テーマを書き換える。今のものに終了時刻を入れて履歴に落とし、新しいものを掲げ始める（空文字なら掲げない）。
 * 中身が同じなら何もしない＝ただ入力欄からフォーカスが外れただけで履歴が1件増えるのを防ぐ。
 */
export async function setCurrentTheme(db: any, userId: string, text: string): Promise<KoubaTheme | null> {
  const current = await loadCurrentTheme(db, userId)
  if (current && current.text === text) return current

  const now = new Date().toISOString()
  const writes: any[] = []
  if (current) writes.push(db.prepare('UPDATE kouba_themes SET ended_at = ? WHERE id = ?').bind(now, current.id))

  let next: KoubaTheme | null = null
  if (text) {
    const id = crypto.randomUUID()
    writes.push(
      db.prepare('INSERT INTO kouba_themes (id, user_id, text, started_at) VALUES (?, ?, ?, ?)').bind(id, userId, text, now)
    )
    next = { id, text, startedAt: now, endedAt: null }
  }
  if (writes.length) await db.batch(writes)
  return next
}
