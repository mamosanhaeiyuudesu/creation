// 工数管理ツール (kouba) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、カテゴリ・ジョブ・タスク・サブタスクは user_id でスコープする。
//
// **命名とテーブルの対応**（2026-09-15、呼び名を1段ずつ繰り下げてサブタスクを新設した際の対応表。詳しい経緯は
// types/kouba.ts 冒頭コメント参照）:
//   UI「ジョブ」    = 型 KoubaJob     = DBテーブル kouba_tasks       （旧UI「タスク」。列名もtask時代のまま）
//   UI「タスク」    = 型 KoubaTask    = DBテーブル kouba_subtasks    （旧UI「サブタスク」。列名もsubtask時代のまま）
//   UI「サブタスク」= 型 KoubaSubtask = DBテーブル kouba_task_subtasks（新規）
// このファイルの中では、SQLを書く行だけ旧名（task/subtask）のままにしてある。関数名・返り値の型は新しい呼び名に揃えた。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import {
  KOUBA_DEFAULT_CATEGORY_ICON,
  KOUBA_DEFAULT_JOB_ICON,
  KOUBA_MIN_HOURS,
  KOUBA_MAX_HOURS,
  KOUBA_HOURS_STEP,
  KOUBA_THEME_MIN_HISTORY_MS,
  KOUBA_DESCRIPTION_MAX,
  clampKoubaHours,
} from '~/types/kouba'
import type { KoubaCategory, KoubaJob, KoubaTask, KoubaSubtask, KoubaTheme, KoubaAchievement } from '~/types/kouba'

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
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_categories_user ON kouba_categories(user_id, position)`,
    // UI「ジョブ」（旧UI「タスク」。列名もtask時代のまま）
    `CREATE TABLE IF NOT EXISTS kouba_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '${KOUBA_DEFAULT_JOB_ICON}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      focused INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_tasks_category ON kouba_tasks(category_id, sort_order)`,
    // UI「タスク」（旧UI「サブタスク」。列名もsubtask時代のまま。task_id はジョブ(kouba_tasks)のID）
    `CREATE TABLE IF NOT EXISTS kouba_subtasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      hours REAL NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
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
    // ジョブ×カテゴリの中間テーブル（1ジョブを複数カテゴリに同時掲載できるようにする。2026-09-13〜）。
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
    // 達成したこと（画面下部の一覧。達成日つき）。impact列はインパクト機能を廃止した名残＝以後は読み書きしない
    `CREATE TABLE IF NOT EXISTS kouba_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL DEFAULT '',
      impact INTEGER NOT NULL DEFAULT 3,
      achieved_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_achievements_user ON kouba_achievements(user_id, achieved_at DESC)`,
    // UI「サブタスク」（2026-09-15新規）。task_id はタスク(kouba_subtasks)のID＝**任意（NULL可）**、
    // どのタスクにも紐付けずに書き留めるだけのメモとしても使える。DONEにすると hours が
    // （taskIdがあれば）そのタスクの kouba_subtasks.hours へ加算される（サーバー側は toggleSubtaskDone に集約）。
    `CREATE TABLE IF NOT EXISTS kouba_task_subtasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT,
      title TEXT NOT NULL DEFAULT '',
      hours REAL NOT NULL DEFAULT 0,
      done INTEGER NOT NULL DEFAULT 0,
      done_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_task_subtasks_task ON kouba_task_subtasks(task_id)`,
    `CREATE INDEX IF NOT EXISTS idx_kouba_task_subtasks_user ON kouba_task_subtasks(user_id, created_at DESC)`,
  ]
  for (const sql of statements) await db.prepare(sql).run().catch(() => {})

  // 既存テーブルへの列追加（icon/sort_order/hours を後から足した分）。無ければ足す、あれば失敗を握りつぶす。
  const columns = [
    `ALTER TABLE kouba_categories ADD COLUMN icon TEXT NOT NULL DEFAULT '${KOUBA_DEFAULT_CATEGORY_ICON}'`,
    `ALTER TABLE kouba_tasks ADD COLUMN icon TEXT NOT NULL DEFAULT '${KOUBA_DEFAULT_JOB_ICON}'`,
    `ALTER TABLE kouba_tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE kouba_subtasks ADD COLUMN hours REAL NOT NULL DEFAULT 1`,
    `ALTER TABLE kouba_tasks ADD COLUMN focused INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE kouba_categories ADD COLUMN description TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE kouba_tasks ADD COLUMN description TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE kouba_subtasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
  ]
  for (const sql of columns) await db.prepare(sql).run().catch(() => {})

  // 旧・単一カテゴリ時代のジョブ（kouba_tasks.category_id）を中間テーブルへ複製する後方互換の橋渡し。
  // WHERE NOT EXISTS があるので、複製済みのジョブには何もしない＝毎回実行しても安全。
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

/** カテゴリ・ジョブの説明文の正規化（trimのみ。空文字＝説明なしで許す）。文字数超過はnull。 */
export function normalizeDescription(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s.length > KOUBA_DESCRIPTION_MAX) return null
  return s
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
  description: string
}
/** kouba_tasks の行＝UI「ジョブ」。 */
interface JobRow {
  id: string
  title: string
  icon: string
  created_at: string
  focused: number
  description: string
}
interface TaskCategoryLinkRow {
  task_id: string
  category_id: string
  sort_order: number
}
/** kouba_subtasks の行＝UI「タスク」。列名はtask_id（ジョブのID）のまま。 */
interface TaskRow {
  id: string
  task_id: string
  title: string
  hours: number
  created_at: string
}
/** kouba_task_subtasks の行＝UI「サブタスク」。task_id はタスク(kouba_subtasks)のID（任意＝NULL可）。 */
interface SubtaskRow {
  id: string
  task_id: string | null
  title: string
  hours: number
  done: number
  done_at: string | null
  created_at: string
}

function shapeSubtask(row: SubtaskRow): KoubaSubtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    hours: row.hours,
    done: !!row.done,
    doneAt: row.done_at,
    createdAt: row.created_at,
  }
}

function shapeTask(row: TaskRow): KoubaTask {
  return { id: row.id, jobId: row.task_id, title: row.title, hours: row.hours, createdAt: row.created_at }
}

function shapeJob(row: JobRow, categoryIds: string[], tasks: KoubaTask[]): KoubaJob {
  const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0)
  return {
    id: row.id,
    categoryIds,
    title: row.title,
    icon: normalizeIcon(row.icon, KOUBA_DEFAULT_JOB_ICON),
    createdAt: row.created_at,
    tasks,
    totalHours,
    focused: !!row.focused,
    description: row.description ?? '',
  }
}

function shapeCategory(row: CategoryRow, jobs: KoubaJob[]): KoubaCategory {
  const totalHours = jobs.reduce((sum, j) => sum + j.totalHours, 0)
  return {
    id: row.id,
    name: row.name,
    icon: normalizeIcon(row.icon, KOUBA_DEFAULT_CATEGORY_ICON),
    position: row.position,
    createdAt: row.created_at,
    jobs,
    totalHours,
    description: row.description ?? '',
  }
}

/**
 * ユーザーのカテゴリ→ジョブ→タスクをまとめて取得（板の表示用）。**サブタスクはここには含まない**
 * （タスクに紐付けずに書き留められる＝板の入れ子だけでは表現できないため、`loadSubtasks()` で別に取得する）。
 * ジョブは複数カテゴリに同時掲載できる（kouba_task_categories）ので、1つのジョブが複数カテゴリの
 * jobs 配列に重複して入ることがある＝どの配列に入っている分も同じDB行（同じタスク・同じ合計時間）
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

  const jobIds = [...new Set(links.map((l) => l.task_id))]

  const jobRowsById = new Map<string, JobRow>()
  const tasksByJob = new Map<string, KoubaTask[]>()
  if (jobIds.length) {
    const jobPlaceholders = jobIds.map(() => '?').join(',')
    const jobRows = await db
      .prepare(`SELECT id, title, icon, created_at, focused, description FROM kouba_tasks WHERE id IN (${jobPlaceholders})`)
      .bind(...jobIds)
      .all<JobRow>()
    for (const r of jobRows?.results ?? []) jobRowsById.set(r.id, r)

    const taskRows = await db
      .prepare(`SELECT * FROM kouba_subtasks WHERE task_id IN (${jobPlaceholders}) ORDER BY sort_order ASC, created_at ASC`)
      .bind(...jobIds)
      .all<TaskRow>()
    for (const t of taskRows?.results ?? []) {
      const shaped = shapeTask(t)
      if (!tasksByJob.has(t.task_id)) tasksByJob.set(t.task_id, [])
      tasksByJob.get(t.task_id)!.push(shaped)
    }
  }

  // ジョブごとの所属カテゴリID一覧（表示用。ジョブ詳細モーダルの多重選択チェックに使う）
  const categoryIdsByJob = new Map<string, string[]>()
  for (const l of links) {
    if (!categoryIdsByJob.has(l.task_id)) categoryIdsByJob.set(l.task_id, [])
    categoryIdsByJob.get(l.task_id)!.push(l.category_id)
  }

  const jobsByCategory = new Map<string, KoubaJob[]>()
  for (const l of links) {
    const row = jobRowsById.get(l.task_id)
    if (!row) continue
    const job = shapeJob(row, categoryIdsByJob.get(l.task_id) ?? [], tasksByJob.get(l.task_id) ?? [])
    if (!jobsByCategory.has(l.category_id)) jobsByCategory.set(l.category_id, [])
    jobsByCategory.get(l.category_id)!.push(job)
  }

  return categories.map((c) => shapeCategory(c, jobsByCategory.get(c.id) ?? []))
}

/** カテゴリの所有者チェック。無ければ null。 */
export async function findOwnedCategory(db: any, userId: string, categoryId: string): Promise<{ id: string } | null> {
  return await db
    .prepare('SELECT id FROM kouba_categories WHERE id = ? AND user_id = ?')
    .bind(categoryId, userId)
    .first<{ id: string }>()
}

/** ジョブの所有者チェック（kouba_tasks は user_id を直接持つので join 不要）。無ければ null。 */
export async function findOwnedJob(db: any, userId: string, jobId: string): Promise<{ id: string } | null> {
  const row = await db.prepare('SELECT id FROM kouba_tasks WHERE id = ? AND user_id = ?').bind(jobId, userId).first<{ id: string }>()
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

/** ジョブが今属しているカテゴリID一覧（順不同）。カテゴリの多重選択チェックボックスの現在値・差分更新に使う。 */
export async function loadJobCategoryIds(db: any, jobId: string): Promise<string[]> {
  const rows = await db
    .prepare('SELECT category_id FROM kouba_task_categories WHERE task_id = ?')
    .bind(jobId)
    .all<{ category_id: string }>()
  return (rows?.results ?? []).map((r: { category_id: string }) => r.category_id)
}

/** タスクの所有者チェック（kouba_subtasks も user_id を直接持つ）。無ければ null。 */
export async function findOwnedTask(db: any, userId: string, taskId: string): Promise<{ id: string; jobId: string } | null> {
  const row = await db
    .prepare('SELECT id, task_id FROM kouba_subtasks WHERE id = ? AND user_id = ?')
    .bind(taskId, userId)
    .first<{ id: string; task_id: string }>()
  return row ? { id: row.id, jobId: row.task_id } : null
}

/** サブタスクの所有者チェック（kouba_task_subtasks も user_id を直接持つ）。無ければ null。 */
export async function findOwnedSubtask(
  db: any,
  userId: string,
  subtaskId: string
): Promise<{ id: string; taskId: string | null; hours: number; done: boolean } | null> {
  const row = await db
    .prepare('SELECT id, task_id, hours, done FROM kouba_task_subtasks WHERE id = ? AND user_id = ?')
    .bind(subtaskId, userId)
    .first<{ id: string; task_id: string | null; hours: number; done: number }>()
  return row ? { id: row.id, taskId: row.task_id, hours: row.hours, done: !!row.done } : null
}

/** サブタスクの一覧（新しい順）。板の入れ子は辿らない＝タスクに紐付かない分（taskId が null）も含む。 */
export async function loadSubtasks(db: any, userId: string): Promise<KoubaSubtask[]> {
  const rows = await db
    .prepare('SELECT * FROM kouba_task_subtasks WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<SubtaskRow>()
  return (rows?.results ?? []).map(shapeSubtask)
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

/** 指定カテゴリ内で次に使う sort_order（末尾に追加するジョブの値）。 */
export async function nextJobSortOrder(db: any, categoryId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM kouba_task_categories WHERE category_id = ?')
    .bind(categoryId)
    .first<{ m: number }>()
  return (row?.m ?? -1) + 1
}

/** 指定ジョブ内で次に使う sort_order（末尾に追加するタスクの値）。タスクのドラッグ&ドロップ並べ替えで使う。 */
export async function nextTaskSortOrder(db: any, jobId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM kouba_subtasks WHERE task_id = ?')
    .bind(jobId)
    .first<{ m: number }>()
  return (row?.m ?? -1) + 1
}

/** 指定タスク内で次に使う sort_order（末尾に追加するサブタスクの値）。 */
export async function nextSubtaskSortOrder(db: any, taskId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM kouba_task_subtasks WHERE task_id = ?')
    .bind(taskId)
    .first<{ m: number }>()
  return (row?.m ?? -1) + 1
}

/**
 * サブタスクのDONE/未DONEを切り替え、紐づくタスクの時間へ増減を反映する（"今のテーマ"下の一覧共通）。
 * **DONEにする→タスクの hours へこのサブタスクの hours を加算**、**外す→同じ分を引き戻す**
 * （押し間違いを直せるようにするための対称な設計。タスクの hours は手入力の+/-でも独立に動かせるので、
 * 「サブタスクが加えた分」を専用の列で追跡はしていない＝サブタスクのDONEを外す前提はこのAPIを通ることだけ）。
 * **taskId が null（どのタスクにも紐付いていない）ならタスク側の更新はせず、DONEの記録だけ行う**。
 * すでに目的の状態なら何もしない（連打での二重加算・二重減算を防ぐ）。
 */
export async function toggleSubtaskDone(
  db: any,
  subtask: { id: string; taskId: string | null; hours: number; done: boolean },
  done: boolean
): Promise<void> {
  if (subtask.done === done) return

  const now = new Date().toISOString()
  const writes: any[] = [
    db
      .prepare('UPDATE kouba_task_subtasks SET done = ?, done_at = ? WHERE id = ?')
      .bind(done ? 1 : 0, done ? now : null, subtask.id),
  ]

  if (subtask.taskId) {
    const taskRow = await db.prepare('SELECT hours FROM kouba_subtasks WHERE id = ?').bind(subtask.taskId).first<{ hours: number }>()
    if (taskRow) {
      const delta = done ? subtask.hours : -subtask.hours
      const nextHours = clampKoubaHours(taskRow.hours + delta)
      writes.push(db.prepare('UPDATE kouba_subtasks SET hours = ? WHERE id = ?').bind(nextHours, subtask.taskId))
    }
  }

  await db.batch(writes)
}

/** サブタスクの削除。DONE中に消すと加算されたままになるため、消す前に未DONEへ戻して時間を引き戻す。 */
export async function deleteSubtask(db: any, subtask: { id: string; taskId: string | null; hours: number; done: boolean }): Promise<void> {
  if (subtask.done) await toggleSubtaskDone(db, subtask, false)
  await db.prepare('DELETE FROM kouba_task_subtasks WHERE id = ?').bind(subtask.id).run()
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
  achieved_at: string
  created_at: string
}

function shapeAchievement(row: AchievementRow): KoubaAchievement {
  return { id: row.id, text: row.text, achievedAt: row.achieved_at, createdAt: row.created_at }
}

/** 達成したことの一覧（達成日の新しい順）。 */
export async function loadAchievements(db: any, userId: string): Promise<KoubaAchievement[]> {
  const rows = await db
    .prepare('SELECT id, text, achieved_at, created_at FROM kouba_achievements WHERE user_id = ? ORDER BY achieved_at DESC, created_at DESC')
    .bind(userId)
    .all<AchievementRow>()
  return (rows?.results ?? []).map(shapeAchievement)
}

/** impact 列は今は書き込まない（廃止済み。列自体はデフォルト値のまま残る）。 */
export async function createAchievement(db: any, userId: string, text: string, achievedAt: string): Promise<KoubaAchievement> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  await db
    .prepare('INSERT INTO kouba_achievements (id, user_id, text, achieved_at) VALUES (?, ?, ?, ?)')
    .bind(id, userId, text, achievedAt)
    .run()
  return { id, text, achievedAt, createdAt }
}

/** 達成記録の所有者チェック。無ければ null。 */
export async function findOwnedAchievement(db: any, userId: string, id: string): Promise<{ id: string } | null> {
  const row = await db.prepare('SELECT id FROM kouba_achievements WHERE id = ? AND user_id = ?').bind(id, userId).first<{ id: string }>()
  return row ? { id: row.id } : null
}

export async function deleteAchievement(db: any, id: string): Promise<void> {
  await db.prepare('DELETE FROM kouba_achievements WHERE id = ?').bind(id).run()
}
