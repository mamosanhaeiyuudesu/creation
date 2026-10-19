import { isValidSyncCode, mergeSyncData, normalizeSyncCode, sanitizeSyncData } from '~/utils/manabi-sync'
import { getManabiDb } from '~/server/utils/manabi'
import { ensureSyncTable, loadSync, saveSync } from '~/server/utils/manabi-sync'

// 同期する。端末のデータを預かっているデータと統合して保存し、統合後を返す（1往復で読み書きが済む）。
// 統合はサーバーでやるので、2台が同時に同期しても片方が上書きで消えない。
export default defineEventHandler(async (event) => {
  const code = normalizeSyncCode(getRouterParam(event, 'code') ?? '')
  if (!isValidSyncCode(code)) throw createError({ statusCode: 404, message: 'コードが見つかりません' })
  const body = await readBody<{ data?: unknown }>(event)
  const db = getManabiDb(event)
  if (db) await ensureSyncTable(db)
  const stored = await loadSync(db, code)
  if (!stored) throw createError({ statusCode: 404, message: 'コードが見つかりません' })
  const merged = mergeSyncData(stored, sanitizeSyncData(body?.data))
  await saveSync(db, code, merged)
  return { data: merged }
})
