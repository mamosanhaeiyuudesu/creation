import { ensureManabiTables, getManabiDb, isValidSetId, loadSet } from '~/server/utils/manabi'
import { addClear, ensureClearsTable } from '~/server/utils/manabi-clears'
import { isValidVoter } from '~/server/utils/manabi-likes'

// 問題集を最後まで解き終えたことを記録する。同じ voter は1回だけ数える（2回目以降は回数を返すだけ）。
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  if (!isValidSetId(id)) throw createError({ statusCode: 400, message: '不正なリンクです' })
  const body = await readBody<{ voter?: unknown }>(event)
  if (!isValidVoter(body?.voter)) throw createError({ statusCode: 400, message: '不正なリクエストです' })
  const db = getManabiDb(event)
  if (db) {
    await ensureManabiTables(db)
    await ensureClearsTable(db)
  }
  const set = await loadSet(db, id)
  if (!set) throw createError({ statusCode: 404, message: 'この問題は見つかりませんでした' })
  return { clearCount: await addClear(db, id, body.voter) }
})
