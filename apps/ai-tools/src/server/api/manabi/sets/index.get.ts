import type { ManabiListItem } from '~/types/manabi'
import { MANABI_LIST_MAX, ensureManabiTables, getManabiDb, listPublicSets } from '~/server/utils/manabi'

// 「みんなの問題」＝公開にされた問題セットの一覧（新しい順）。ログイン不要。問題の中身は返さない。
export default defineEventHandler(async (event): Promise<ManabiListItem[]> => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 30
  const q = typeof query.q === 'string' ? query.q : ''
  const db = getManabiDb(event)
  if (db) await ensureManabiTables(db)
  return listPublicSets(db, { limit: Math.min(limit, MANABI_LIST_MAX), q })
})
