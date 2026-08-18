import { getSessionUser } from '~/server/utils/auth'
import { encryptComment } from '~/server/utils/encrypt'

interface Moment {
  id: string
  sourceId: string
  sourceType: string
  ts: string
  kind: string
  text: string
  impact: number
  who?: string
  edited?: { text?: boolean; impact?: boolean; kind?: boolean }
  createdAt: string
  updatedAt: string
}

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const body = await readBody<{ items: Moment[]; processedIds?: string[]; migratedAchievements?: boolean }>(event)
  if (!Array.isArray(body?.items)) throw createError({ statusCode: 400, message: '不正なデータ形式' })

  const payload = JSON.stringify({
    items: body.items,
    processedIds: Array.isArray(body.processedIds) ? body.processedIds : [],
    migratedAchievements: !!body.migratedAchievements,
  })
  const storedData = await encryptComment(event, payload)

  await db
    .prepare("INSERT OR REPLACE INTO hagemashi_moments (user_id, data, updated_at) VALUES (?, ?, datetime('now'))")
    .bind(user.id, storedData)
    .run()

  return { ok: true }
})
