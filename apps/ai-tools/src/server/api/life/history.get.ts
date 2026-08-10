import { getSessionUser } from '~/server/utils/auth'
import { readThemeHistory } from '~/server/utils/life-google'
import { findLifeTheme } from '~/utils/life-themes'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) return { messages: [] }

  const q = getQuery(event)
  const theme = findLifeTheme(String(q.theme ?? ''))
  if (!theme) throw createError({ statusCode: 404, statusMessage: 'テーマが見つかりません' })

  const rows = await readThemeHistory(event, user.id, theme.sheetName)
  return { messages: rows }
})
