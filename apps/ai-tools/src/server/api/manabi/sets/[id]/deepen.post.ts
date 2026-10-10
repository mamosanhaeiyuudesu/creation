import { ensureManabiTables, getManabiDb, isValidSetId, loadDeepen, loadSet, saveDeepen } from '~/server/utils/manabi'
import { suggestDeeperThemes } from '~/server/utils/manabi-ai'

// 解き終えた人向けの「深掘りテーマ」の提案。問題セットごとに最初の1回だけAIで作って保存し、
// 以降（同じリンクを開いた別の人も）は保存済みを返す＝ログイン不要の口でAI代が増えないようにしている。
// 作るのに失敗した（保存されない）セットを連打で叩かれても AI を呼び続けないよう、同じセットは60秒あけてから再試行する。
const lastTry: Map<string, number> = ((globalThis as any).__manabiDeepenTry ??= new Map())
const RETRY_AFTER_MS = 60_000

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  if (!isValidSetId(id)) throw createError({ statusCode: 400, message: '不正なリンクです' })
  const db = getManabiDb(event)
  if (db) await ensureManabiTables(db)

  const cached = await loadDeepen(db, id)
  if (cached && cached.length) return { themes: cached }

  const now = Date.now()
  if (now - (lastTry.get(id) ?? 0) < RETRY_AFTER_MS) return { themes: [] as string[] }

  const set = await loadSet(db, id)
  if (!set) throw createError({ statusCode: 404, message: 'この問題は見つかりませんでした' })
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  lastTry.set(id, now)
  const themes = await suggestDeeperThemes(anthropicApiKey as string, set)
  // 空は保存しない（失敗を固定してしまわない）
  if (themes.length) await saveDeepen(db, id, themes)
  return { themes }
})
