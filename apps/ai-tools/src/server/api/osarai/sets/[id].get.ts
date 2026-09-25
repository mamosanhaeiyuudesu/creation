import { ensureOsaraiTables, getOsaraiDb, isValidSetId, loadSet } from '~/server/utils/osarai'

// 問題セットを返す。共有リンクで開いた人も同じものを読むのでログインは要求しない。
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  if (!isValidSetId(id)) throw createError({ statusCode: 400, message: '不正なリンクです' })
  const db = getOsaraiDb(event)
  if (db) await ensureOsaraiTables(db)
  const set = await loadSet(db, id)
  if (!set) throw createError({ statusCode: 404, message: 'この問題は見つかりませんでした' })
  return set
})
