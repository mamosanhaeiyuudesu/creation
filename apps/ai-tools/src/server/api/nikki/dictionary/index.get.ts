import { requireNikkiUser, requireNikkiDb, loadDictionary } from '~/server/utils/nikki'

// 文字起こし用の辞書（本人のぶん）。
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  return { items: await loadDictionary(db, user.id) }
})
