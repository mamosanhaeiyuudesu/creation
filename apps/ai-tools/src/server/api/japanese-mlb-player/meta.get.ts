import { getDevMeta } from '~/server/utils/mlb-dev'

export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const db = env?.MLB_DB as D1Database | undefined

  if (!db) return getDevMeta()

  const row = await db
    .prepare('SELECT value FROM mlb_meta WHERE key = ?')
    .bind('last_synced_at')
    .first<{ value: string }>()

  return { lastSyncedAt: row?.value ?? null }
})
