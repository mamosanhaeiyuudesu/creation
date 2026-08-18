import { getSessionUser } from '~/server/utils/auth'
import { decryptComment } from '~/server/utils/encrypt'

// できごと（Moment）は「1ユーザー1行に JSON をまとめて保存」する既存パターンに従う。
// items だけでなく processedIds / migratedAchievements も同じ JSON に入れているため、
// 配列ではなくオブジェクトを返す（旧形式の配列も読めるようにしておく）。
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const row = await db
    .prepare('SELECT data FROM hagemashi_moments WHERE user_id = ?')
    .bind(user.id)
    .first() as { data: string } | null

  if (!row) return { items: [], processedIds: [], migratedAchievements: false }

  try {
    const parsed = JSON.parse(await decryptComment(event, row.data))
    if (Array.isArray(parsed)) return { items: parsed, processedIds: [], migratedAchievements: false }
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      processedIds: Array.isArray(parsed.processedIds) ? parsed.processedIds : [],
      migratedAchievements: !!parsed.migratedAchievements,
    }
  } catch {
    return { items: [], processedIds: [], migratedAchievements: false }
  }
})
