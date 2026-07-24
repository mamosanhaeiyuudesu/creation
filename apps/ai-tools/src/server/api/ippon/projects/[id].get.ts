import { requireIpponUser, requireIpponDb, ensureIpponTables, loadProject } from '~/server/utils/ippon'

// 案件詳細（所有者のみ）。バージョン込みで返す。
export default defineEventHandler(async (event) => {
  const user = await requireIpponUser(event)
  const db = requireIpponDb(event)
  await ensureIpponTables(db)
  const id = getRouterParam(event, 'id') || ''
  const project = await loadProject(db, { userId: user.id, projectId: id })
  if (!project) throw createError({ statusCode: 404, message: '案件が見つかりません' })
  return project
})
