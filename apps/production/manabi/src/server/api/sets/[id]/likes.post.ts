import { ensureManabiTables, getManabiDb, isValidSetId, loadSet } from '~/server/utils/manabi'
import { addLike, ensureLikesTable, isValidVoter } from '~/server/utils/manabi-likes'

// 問題にイイねを付ける。同じ voter が同じ問題に付けられるのは1回だけ（2回目以降は件数を返すだけ）。
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  if (!isValidSetId(id)) throw createError({ statusCode: 400, message: '不正なリンクです' })
  const body = await readBody<{ q?: unknown; voter?: unknown }>(event)
  const q = body?.q
  if (!Number.isInteger(q) || (q as number) < 0 || !isValidVoter(body?.voter)) {
    throw createError({ statusCode: 400, message: '不正なリクエストです' })
  }
  const db = getManabiDb(event)
  if (db) {
    await ensureManabiTables(db)
    await ensureLikesTable(db)
  }
  const set = await loadSet(db, id)
  if (!set) throw createError({ statusCode: 404, message: 'この問題は見つかりませんでした' })
  if ((q as number) >= set.questions.length) throw createError({ statusCode: 400, message: '不正なリクエストです' })
  const count = await addLike(db, id, q as number, body.voter as string)
  return { count }
})
