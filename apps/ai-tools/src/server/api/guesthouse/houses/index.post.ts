import {
  requireGuesthouseUser,
  requireGuesthouseDb,
  ensureGuesthouseTables,
  makeGuesthouseShareToken,
  replaceFacts,
  loadHouse,
} from '~/server/utils/guesthouse'
import type { HouseInput } from '~/types/guesthouse'

// 宿を新規作成する（要ログイン）。案内項目もあわせて保存する。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const body = await readBody<HouseInput>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: '宿名を入力してください' })
  const welcome = (body?.welcome ?? '').trim()
  const facts = Array.isArray(body?.facts) ? body!.facts : []

  const houseId = crypto.randomUUID()
  await db
    .prepare('INSERT INTO guesthouse_houses (id, user_id, name, welcome, share_token) VALUES (?, ?, ?, ?, ?)')
    .bind(houseId, user.id, name, welcome, makeGuesthouseShareToken())
    .run()
  await replaceFacts(db, houseId, facts)

  return await loadHouse(db, { userId: user.id, houseId })
})
