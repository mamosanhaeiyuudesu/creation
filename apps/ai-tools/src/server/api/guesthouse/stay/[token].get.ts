import { requireGuesthouseDb, ensureGuesthouseTables, loadHouse, factCategories } from '~/server/utils/guesthouse'
import type { StayInfo } from '~/types/guesthouse'

// 共有リンク先の公開情報（ログイン不要）。share_token で解決する。
// お客様には案内本文は直接返さず、宿名・ウェルカム文・案内できる話題の見出しだけ渡す。
export default defineEventHandler(async (event): Promise<StayInfo> => {
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const token = getRouterParam(event, 'token') || ''
  if (!/^[0-9a-f]{32}$/.test(token)) throw createError({ statusCode: 400, message: '不正なリンクです' })
  const house = await loadHouse(db, { shareToken: token })
  if (!house) throw createError({ statusCode: 404, message: 'この共有リンクは無効です' })
  return {
    name: house.name,
    welcome: house.welcome,
    categories: factCategories(house.facts),
  }
})
