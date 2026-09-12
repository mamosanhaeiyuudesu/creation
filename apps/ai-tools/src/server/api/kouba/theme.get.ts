import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, loadCurrentTheme, loadThemeHistory } from '~/server/utils/kouba'

// 板のトップに掲げる「今のテーマ」と、その履歴（1日以上掲げたものだけ）をまとめて返す。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const [current, history] = await Promise.all([loadCurrentTheme(db, user.id), loadThemeHistory(db, user.id)])
  return { current, history }
})
