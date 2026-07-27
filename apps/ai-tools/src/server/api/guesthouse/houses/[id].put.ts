import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, replaceFacts, loadHouse } from '~/server/utils/guesthouse'
import type { HouseInput } from '~/types/guesthouse'

// 宿を更新（名前・ウェルカム文・案内項目を一括置換）。所有者チェック込み。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const existing = await db
    .prepare('SELECT id FROM guesthouse_houses WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first<{ id: string }>()
  if (!existing) throw createError({ statusCode: 404, message: '宿が見つかりません' })

  const body = await readBody<HouseInput>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: '宿名を入力してください' })
  const welcome = (body?.welcome ?? '').trim()
  const facts = Array.isArray(body?.facts) ? body!.facts : []

  await db
    .prepare("UPDATE guesthouse_houses SET name = ?, welcome = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(name, welcome, id)
    .run()
  await replaceFacts(db, id, facts)

  return await loadHouse(db, { userId: user.id, houseId: id })
})
