import { ensureLifeTables, requireLifeDb, requireLifeUser } from '~/server/utils/life-analyzer'

// テキストを削除する。そのテキストを含む分析キャッシュ（と出来事要約）も一緒に片付ける
// ＝元テキストが無い分析を残しても、要約のときに引用元を引けないため。
export default defineEventHandler(async (event) => {
  const user = await requireLifeUser(event)
  const db = requireLifeDb(event)
  await ensureLifeTables(db)

  const id = getRouterParam(event, 'id') ?? ''
  const row = await db.prepare('SELECT id FROM life_documents WHERE id = ? AND user_id = ?').bind(id, user.id).first<{ id: string }>()
  if (!row) throw createError({ statusCode: 404, message: 'テキストが見つかりません' })

  const stale = await db
    .prepare('SELECT id FROM life_analyses WHERE user_id = ? AND signature LIKE ?')
    .bind(user.id, `%${id}%`)
    .all<{ id: string }>()
  for (const a of stale?.results ?? []) {
    await db.prepare('DELETE FROM life_episode_summaries WHERE analysis_id = ?').bind(a.id).run()
    await db.prepare('DELETE FROM life_analyses WHERE id = ?').bind(a.id).run()
  }

  await db.prepare('DELETE FROM life_documents WHERE id = ? AND user_id = ?').bind(id, user.id).run()
  return { ok: true }
})
