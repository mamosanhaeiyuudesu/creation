import { ensureManabiTables, getManabiDb, isValidSetId } from '~/server/utils/manabi'
import { ensureLikesTable, isValidVoter, loadLikes } from '~/server/utils/manabi-likes'

// 問題ごとのイイね数と、この端末（voter）がすでに押した問題。共有リンクで開いた人も見られるのでログインは要らない。
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  if (!isValidSetId(id)) throw createError({ statusCode: 400, message: '不正なリンクです' })
  const voter = String(getQuery(event).voter ?? '')
  const db = getManabiDb(event)
  if (db) {
    await ensureManabiTables(db)
    await ensureLikesTable(db)
  }
  return loadLikes(db, id, isValidVoter(voter) ? voter : null)
})
