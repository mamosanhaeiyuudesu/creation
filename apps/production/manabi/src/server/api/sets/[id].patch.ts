import { MANABI_TITLE_MAX } from '~/types/manabi'
import { ensureManabiTables, getManabiDb, isValidSetId, ownerHashOf, renameSet } from '~/server/utils/manabi'

// 問題の題名を変える。作った人の端末が持つ合言葉（ownerToken）が一致したときだけ。
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  if (!isValidSetId(id)) throw createError({ statusCode: 400, message: '不正なリンクです' })
  const body = await readBody<{ title?: string; ownerToken?: string }>(event)
  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: '題名を入力してください' })
  if (title.length > MANABI_TITLE_MAX) {
    throw createError({ statusCode: 400, message: `題名は${MANABI_TITLE_MAX}文字以内で入力してください` })
  }
  const db = getManabiDb(event)
  if (db) await ensureManabiTables(db)
  const ok = await renameSet(db, id, await ownerHashOf(body?.ownerToken), title)
  if (!ok) throw createError({ statusCode: 403, message: '題名を変えられるのは、この問題を作った人だけです' })
  return { title }
})
