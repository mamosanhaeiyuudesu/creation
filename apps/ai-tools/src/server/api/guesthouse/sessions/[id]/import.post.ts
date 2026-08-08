import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadSessionDetail, importMessages } from '~/server/utils/guesthouse'
import type { ImportedMessage } from '~/types/guesthouse'

// 取り込みプレビューを確認・修正した内容を、会話の続きとして確定保存する。
export default defineEventHandler(async (event): Promise<{ saved: number }> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const detail = await loadSessionDetail(event, db, user.id, id)
  if (!detail) throw createError({ statusCode: 404, message: '会話が見つかりません' })

  const body = await readBody<{ items: ImportedMessage[] }>(event)
  const items = Array.isArray(body?.items) ? body.items : []
  if (!items.length) throw createError({ statusCode: 400, message: '取り込む内容がありません' })

  const saved = await importMessages(event, db, id, items)
  return { saved }
})
