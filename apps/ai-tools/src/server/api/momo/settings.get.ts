import { requireMomoUser, requireMomoDb, ensureMomoTables, loadSettings } from '~/server/utils/momo'

// ご依頼主（自分）情報を返す。佐川CSVの依頼主欄に使う。
export default defineEventHandler(async (event) => {
  const user = await requireMomoUser(event)
  const db = requireMomoDb(event)
  await ensureMomoTables(db)
  return await loadSettings(db, user.id)
})
