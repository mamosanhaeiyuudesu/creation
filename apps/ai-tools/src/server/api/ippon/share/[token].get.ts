import { requireIpponDb, ensureIpponTables, loadProject } from '~/server/utils/ippon'

// 共有リンク先の公開閲覧（ログイン不要・仕様§4.4）。share_token で解決する。
// 認証は要求しない。返すのは閲覧に必要な最小限（案件＋バージョン）。
export default defineEventHandler(async (event) => {
  const db = requireIpponDb(event)
  await ensureIpponTables(db)
  const token = getRouterParam(event, 'token') || ''
  if (!/^[0-9a-f]{32}$/.test(token)) throw createError({ statusCode: 400, message: '不正なリンクです' })
  const project = await loadProject(db, { shareToken: token })
  if (!project) throw createError({ statusCode: 404, message: 'この共有リンクは無効です' })
  return project
})
