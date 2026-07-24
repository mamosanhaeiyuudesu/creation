import { requireIpponUser, requireIpponDb, ensureIpponTables, loadProjectSummaries } from '~/server/utils/ippon'

// 自分の案件一覧（サムネイル表示用の軽量サマリ。モデル本体は含めない）。
export default defineEventHandler(async (event) => {
  const user = await requireIpponUser(event)
  const db = requireIpponDb(event)
  await ensureIpponTables(db)
  return await loadProjectSummaries(db, user.id)
})
