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
  KOUBA_IMPACT_MIN,
  KOUBA_IMPACT_MAX,
} from '~/types/kouba'
import type { KoubaCategory, KoubaTask, KoubaSubtask, KoubaTheme, KoubaAchievement } from '~/types/kouba'

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
    // タスク×カテゴリの中間テーブル（1タスクを複数カテゴリに同時掲載できるようにする。2026-09-13〜）。
    // kouba_tasks.category_id/sort_order は旧・単一カテゴリ時代の名残の列として残るが、これ以降は読み書きしない。
    `CREATE TABLE IF NOT EXISTS kouba_task_categories (
      task_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (task_id, category_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_task_categories_category ON kouba_task_categories(category_id, sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_task_categories_task ON kouba_task_categories(task_id)`,
    // 達成したこと（画面下部の一覧。インパクト5段階・達成日つき）
    `CREATE TABLE IF NOT EXISTS kouba_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL DEFAULT '',
      impact INTEGER NOT NULL DEFAULT 3,
      achieved_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_achievements_user ON kouba_achievements(user_id, achieved_at DESC)`,
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

  // 旧・単一カテゴリ時代のタスク（kouba_tasks.category_id）を中間テーブルへ複製する後方互換の橋渡し。
  // WHERE NOT EXISTS があるので、複製済みのタスクには何もしない＝毎回実行しても安全。
  await db
    .prepare(
      `INSERT INTO kouba_task_categories (task_id, category_id, user_id, sort_order)
       SELECT id, category_id, user_id, sort_order FROM kouba_tasks
       WHERE category_id != '' AND NOT EXISTS (SELECT 1 FROM kouba_task_categories WHERE task_id = kouba_tasks.id)`
    )
    .run()
    .catch(() => {})
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

/** インパクト（1〜5の整数）の正規化。範囲外・非整数なら null。 */
export function normalizeImpact(raw: unknown): number | null {
  const n = Number(raw)
  if (!Number.isInteger(n)) return null
  if (n < KOUBA_IMPACT_MIN || n > KOUBA_IMPACT_MAX) return null
  return n
}

/**
 * 達成日（"YYYY-MM-DD"の日付入力）の正規化。JST正午に固定してUTCのISO8601へ変換する
 * （0時基準だと日付境界のタイムゾーン差でズレることがあるため、正午を基準に取って避ける）。
 * 形式が違えば null。
 */
export function normalizeAchievedAt(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T12:00:00+09:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
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
  title: string
  icon: string
  created_at: string
}
interface TaskCategoryLinkRow {
  task_id: string
  category_id: string
  sort_order: number
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

function shapeTask(row: TaskRow, categoryIds: string[], subtasks: KoubaSubtask[]): KoubaTask {
  const totalHours = subtasks.reduce((sum, s) => sum + s.hours, 0)
  return {
    id: row.id,
    categoryIds,
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

/**
 * ユーザーのカテゴリ→タスク→サブタスクをまとめて取得（板の表示用）。
 * タスクは複数カテゴリに同時掲載できる（kouba_task_categories）ので、1つのタスクが複数カテゴリの
 * tasks 配列に重複して入ることがある＝どの配列に入っている分も同じDB行（同じサブタスク・同じ合計時間）
 * から作るので中身は必ず一致する（=同期している。オブジェクトの参照を使い回してはいない）。
 */
export async function loadBoard(db: any, userId: string): Promise<KoubaCategory[]> {
  const catRows = await db
    .prepare('SELECT * FROM kouba_categories WHERE user_id = ? ORDER BY position ASC')
    .bind(userId)
    .all<CategoryRow>()
  const categories: CategoryRow[] = catRows?.results ?? []
  if (!categories.length) return []

  const catIds = categories.map((c) => c.id)
  const catPlaceholders = catIds.map(() => '?').join(',')
  const linkRows = await db
    .prepare(`SELECT task_id, category_id, sort_order FROM kouba_task_categories WHERE category_id IN (${catPlaceholders}) ORDER BY sort_order ASC`)
    .bind(...catIds)
    .all<TaskCategoryLinkRow>()
  const links: TaskCategoryLinkRow[] = linkRows?.results ?? []

  const taskIds = [...new Set(links.map((l) => l.task_id))]

  const taskRowsById = new Map<string, TaskRow>()
  const subtasksByTask = new Map<string, KoubaSubtask[]>()
  if (taskIds.length) {
    const taskPlaceholders = taskIds.map(() => '?').join(',')
    const taskRows = await db
      .prepare(`SELECT id, title, icon, created_at FROM kouba_tasks WHERE id IN (${taskPlaceholders})`)
      .bind(...taskIds)
      .all<TaskRow>()
    for (const r of taskRows?.results ?? []) taskRowsById.set(r.id, r)

    const subtaskRows = await db
      .prepare(`SELECT * FROM kouba_subtasks WHERE task_id IN (${taskPlaceholders}) ORDER BY created_at ASC`)
      .bind(...taskIds)
      .all<SubtaskRow>()
    for (const s of subtaskRows?.results ?? []) {
      const shaped = shapeSubtask(s)
      if (!subtasksByTask.has(s.task_id)) subtasksByTask.set(s.task_id, [])
      subtasksByTask.get(s.task_id)!.push(shaped)
    }
  }

  // タスクごとの所属カテゴリID一覧（表示用。タスク詳細モーダルの多重選択チェックに使う）
  const categoryIdsByTask = new Map<string, string[]>()
  for (const l of links) {
    if (!categoryIdsByTask.has(l.task_id)) categoryIdsByTask.set(l.task_id, [])
    categoryIdsByTask.get(l.task_id)!.push(l.category_id)
  }

  const tasksByCategory = new Map<string, KoubaTask[]>()
  for (const l of links) {
    const row = taskRowsById.get(l.task_id)
    if (!row) continue
    const task = shapeTask(row, categoryIdsByTask.get(l.task_id) ?? [], subtasksByTask.get(l.task_id) ?? [])
    if (!tasksByCategory.has(l.category_id)) tasksByCategory.set(l.category_id, [])
    tasksByCategory.get(l.category_id)!.push(task)
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
export async function findOwnedTask(db: any, userId: string, taskId: string): Promise<{ id: string } | null> {
  const row = await db.prepare('SELECT id FROM kouba_tasks WHERE id = ? AND user_id = ?').bind(taskId, userId).first<{ id: string }>()
  return row ? { id: row.id } : null
}

/** 渡したカテゴリIDのうち、本人が所有しているものだけの集合を返す（1つでも他人のIDが混じっていれば呼び出し側で弾ける）。 */
export async function ownedCategoryIds(db: any, userId: string, categoryIds: string[]): Promise<Set<string>> {
  if (!categoryIds.length) return new Set()
  const placeholders = categoryIds.map(() => '?').join(',')
  const rows = await db
    .prepare(`SELECT id FROM kouba_categories WHERE id IN (${placeholders}) AND user_id = ?`)
    .bind(...categoryIds, userId)
    .all<{ id: string }>()
  return new Set((rows?.results ?? []).map((r: { id: string }) => r.id))
}

/** タスクが今属しているカテゴリID一覧（順不同）。カテゴリの多重選択チェックボックスの現在値・差分更新に使う。 */
export async function loadTaskCategoryIds(db: any, taskId: string): Promise<string[]> {
  const rows = await db
    .prepare('SELECT category_id FROM kouba_task_categories WHERE task_id = ?')
    .bind(taskId)
    .all<{ category_id: string }>()
  return (rows?.results ?? []).map((r: { category_id: string }) => r.category_id)
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
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM kouba_task_categories WHERE category_id = ?')
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

// ── 達成したこと ──────────────────────────────

interface AchievementRow {
  id: string
  text: string
  impact: number
  achieved_at: string
  created_at: string
}

function shapeAchievement(row: AchievementRow): KoubaAchievement {
  return { id: row.id, text: row.text, impact: row.impact, achievedAt: row.achieved_at, createdAt: row.created_at }
}

/** 達成したことの一覧（達成日の新しい順）。 */
export async function loadAchievements(db: any, userId: string): Promise<KoubaAchievement[]> {
  const rows = await db
    .prepare('SELECT * FROM kouba_achievements WHERE user_id = ? ORDER BY achieved_at DESC, created_at DESC')
    .bind(userId)
    .all<AchievementRow>()
  return (rows?.results ?? []).map(shapeAchievement)
}

export async function createAchievement(
  db: any,
  userId: string,
  text: string,
  impact: number,
  achievedAt: string
): Promise<KoubaAchievement> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  await db
    .prepare('INSERT INTO kouba_achievements (id, user_id, text, impact, achieved_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, userId, text, impact, achievedAt)
    .run()
  return { id, text, impact, achievedAt, createdAt }
}

/** 達成記録の所有者チェック。無ければ null。 */
export async function findOwnedAchievement(db: any, userId: string, id: string): Promise<{ id: string } | null> {
  const row = await db.prepare('SELECT id FROM kouba_achievements WHERE id = ? AND user_id = ?').bind(id, userId).first<{ id: string }>()
  return row ? { id: row.id } : null
}

export async function deleteAchievement(db: any, id: string): Promise<void> {
  await db.prepare('DELETE FROM kouba_achievements WHERE id = ?').bind(id).run()
}
