import { sanitizeSyncData } from '~/utils/manabi-sync'
import { clientIpHash, getManabiDb } from '~/server/utils/manabi'
import { assertUnderSyncLimit, createSync, ensureSyncTable, makeSyncCode } from '~/server/utils/manabi-sync'

// 同期コードを発行する。この端末のデータをそのまま最初の中身として預ける。ログイン不要。
export default defineEventHandler(async (event) => {
  const body = await readBody<{ data?: unknown }>(event)
  const data = sanitizeSyncData(body?.data)
  const db = getManabiDb(event)
  if (db) await ensureSyncTable(db)
  const ipHash = await clientIpHash(event)
  await assertUnderSyncLimit(db, ipHash)
  const code = makeSyncCode()
  await createSync(db, code, data, ipHash)
  return { code, data }
})
