// ippon（Sketch2View）のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、案件は user_id でスコープする。
// 共有リンクは share_token で公開し、ログイン不要で閲覧できる（仕様§4.4）。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import type { Interpretation, Project, ProjectSummary, ProjectVersion, StylePreset } from '~/types/ippon'

export interface IpponUser {
  id: string
  username: string
}

/** ippon 用テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。 */
export async function ensureIpponTables(db: any): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ippon_projects (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '', style TEXT NOT NULL DEFAULT 'natural',
      share_token TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ippon_versions (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, label TEXT NOT NULL DEFAULT '',
      sketch_url TEXT NOT NULL DEFAULT '', interpretation TEXT NOT NULL DEFAULT '{}',
      model_url TEXT NOT NULL DEFAULT '', provider TEXT NOT NULL DEFAULT 'mock',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
}

/** ログイン必須。未ログインなら 401。 */
export async function requireIpponUser(event: any): Promise<IpponUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** DB が無ければ 503。 */
export function requireIpponDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  return db
}

/** 共有リンク用トークン（推測困難な32文字）。 */
export function makeShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function normalizeStyle(v: unknown): StylePreset {
  return (['natural', 'modern', 'industrial', 'white'].includes(v as string) ? v : 'natural') as StylePreset
}

interface ProjectRow {
  id: string
  title: string
  note: string
  style: string
  share_token: string
  created_at: string
  updated_at: string
}
interface VersionRow {
  id: string
  project_id: string
  label: string
  sketch_url: string
  interpretation: string
  model_url: string
  provider: string
  created_at: string
}

function shapeVersion(row: VersionRow): ProjectVersion {
  let interpretation: Interpretation
  try {
    interpretation = JSON.parse(row.interpretation)
  } catch {
    interpretation = {
      category: '', width_mm: null, depth_mm: null, height_mm: null, shelves: null,
      has_legs: false, material: '', prompt_en: '', completions: [], summary: '',
    }
  }
  return {
    id: row.id,
    label: row.label,
    sketchUrl: row.sketch_url,
    interpretation,
    modelUrl: row.model_url,
    provider: row.provider,
    createdAt: row.created_at,
  }
}

function shapeProject(row: ProjectRow, versions: VersionRow[]): Project {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    style: normalizeStyle(row.style),
    shareToken: row.share_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    versions: versions.map(shapeVersion),
  }
}

/** 一覧用サマリ（モデル本体は含めない。サムネはサイズ削減のため取得しない）。 */
export async function loadProjectSummaries(db: any, userId: string): Promise<ProjectSummary[]> {
  const rows = await db
    .prepare('SELECT * FROM ippon_projects WHERE user_id = ? ORDER BY updated_at DESC')
    .bind(userId)
    .all<ProjectRow>()
  const projects: ProjectRow[] = rows?.results ?? []
  if (!projects.length) return []

  const ids = projects.map((p) => p.id)
  const ph = ids.map(() => '?').join(',')
  // バージョン数と各案件の最初のスケッチ（サムネ用）を軽量に取得。
  const vRows = await db
    .prepare(`SELECT id, project_id, sketch_url, created_at FROM ippon_versions WHERE project_id IN (${ph}) ORDER BY created_at ASC`)
    .bind(...ids)
    .all<{ id: string; project_id: string; sketch_url: string; created_at: string }>()

  const countByProject = new Map<string, number>()
  const thumbByProject = new Map<string, string>()
  for (const v of vRows?.results ?? []) {
    countByProject.set(v.project_id, (countByProject.get(v.project_id) ?? 0) + 1)
    if (!thumbByProject.has(v.project_id)) thumbByProject.set(v.project_id, v.sketch_url)
  }

  return projects.map((p) => ({
    id: p.id,
    title: p.title,
    style: normalizeStyle(p.style),
    shareToken: p.share_token,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    versionCount: countByProject.get(p.id) ?? 0,
    thumbSketchUrl: thumbByProject.get(p.id) ?? null,
  }))
}

/** 案件をバージョン込みで取得。owner 指定なら所有者チェック、token 指定なら公開閲覧。 */
export async function loadProject(
  db: any,
  by: { userId?: string; projectId?: string; shareToken?: string }
): Promise<Project | null> {
  let row: ProjectRow | null = null
  if (by.shareToken) {
    row = await db.prepare('SELECT * FROM ippon_projects WHERE share_token = ?').bind(by.shareToken).first<ProjectRow>()
  } else if (by.projectId && by.userId) {
    row = await db.prepare('SELECT * FROM ippon_projects WHERE id = ? AND user_id = ?').bind(by.projectId, by.userId).first<ProjectRow>()
  }
  if (!row) return null
  const vRows = await db
    .prepare('SELECT * FROM ippon_versions WHERE project_id = ? ORDER BY created_at ASC')
    .bind(row.id)
    .all<VersionRow>()
  return shapeProject(row, vRows?.results ?? [])
}
