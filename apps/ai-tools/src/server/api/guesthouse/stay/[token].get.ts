import { requireGuesthouseDb, ensureGuesthouseTables, loadStaySession, factCategories } from '~/server/utils/guesthouse'
import type { StayInfo } from '~/types/guesthouse'

// 共有リンク先の公開情報（ログイン不要）。token はお客様1人ぶんの滞在セッションのトークン。
// お客様には案内本文は直接返さず、宿名・ウェルカム文・案内できる話題の見出しだけ渡す。
export default defineEventHandler(async (event): Promise<StayInfo> => {
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const token = getRouterParam(event, 'token') || ''
  const resolved = await loadStaySession(db, token)
  if (!resolved) throw createError({ statusCode: 404, message: 'この共有リンクは無効です' })
  const { house } = resolved
  return {
    name: house.name,
    welcome: house.welcome,
    categories: factCategories(house.facts),
  }
})
