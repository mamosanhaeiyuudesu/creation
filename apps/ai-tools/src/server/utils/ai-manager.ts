import { getAppDb } from '~/server/utils/auth'
import type { AiManagerIndex, AiManagerSite } from '~/types/ai-manager'
import data from '../data/ai-manager.json'

// AI管理（/ai-manager）。データは scripts/ai-manager/build.mjs が git の履歴から作った JSON をそのまま読む
// （Workers からは git を読めないので、ローカルで作ってビルドに含める）。D1 には何も保存しない。

const SESSION_COOKIE = 'app-session'

interface RawVersion {
  system: string | null
  user: string | null
  [key: string]: unknown
}

interface RawData {
  generatedAt: string
  head: string | null
  sites: Array<Omit<AiManagerSite, 'versions'> & { versions: RawVersion[] }>
  texts: Record<string, string>
}

const raw = data as unknown as RawData

/** プロンプトには個人名や運用の事情も入っているので、管理者（users.role='admin'）だけに見せる */
export async function requireAiManagerAdmin(event: any): Promise<void> {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) throw createError({ statusCode: 401, message: '未ログイン' })
  const row = await db
    .prepare(
      `SELECT COALESCE(u.role, 'guest') AS role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`,
    )
    .bind(token)
    .first<{ role: string }>()
  if (!row) throw createError({ statusCode: 401, message: '未ログイン' })
  // ローカル dev の D1 には role が入っていないことが多いので、ログインしていれば見せる
  if (import.meta.dev) return
  if (row.role !== 'admin') throw createError({ statusCode: 403, message: '管理者のみ利用できます' })
}

/** 一覧用。プロンプトの本文は含めない（全版ぶんだと重いので、詳細を開いたときに取る） */
export function aiManagerIndex(): AiManagerIndex {
  return {
    generatedAt: raw.generatedAt,
    head: raw.head,
    sites: raw.sites.map((s) => ({
      ...s,
      versions: s.versions.map(({ system: _s, user: _u, ...meta }) => meta as any),
    })),
  }
}

export function aiManagerSite(id: string): AiManagerSite | null {
  const site = raw.sites.find((s) => s.id === id)
  if (!site) return null
  const text = (h: string | null) => (h ? raw.texts[h] ?? null : null)
  return {
    ...site,
    versions: site.versions.map((v) => ({ ...v, system: text(v.system), user: text(v.user) })) as any,
  }
}
