import {
  requireGuesthouseUser,
  requireGuesthouseDb,
  ensureGuesthouseTables,
  loadAllDiaries,
  loadAllHearingNotesBySession,
} from '~/server/utils/guesthouse'
import { suggestAnalysisAxes } from '~/server/utils/guesthouse-ai'
import type { AxisSuggestResult } from '~/types/guesthouse'

// 「他に見るべき分析軸は？」を AI に提案させる（顧客分析ページの相談ボタン）。
// 構造化データ（固定語彙の集計結果）ではなく**生の日記**を読ませるのが要点。
// 決まった軸で数えるだけでは「その軸で良いのか」は分からないため。
// 結果は保存しない（提案であって設定ではないので、採用するときは人が固定語彙を書き換える）。
export default defineEventHandler(async (event): Promise<AxisSuggestResult> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  // 宿を絞り込んで見ているときは、その宿の日記だけを読ませる（画面の絞り込みと結果をそろえる）。
  const body = await readBody<{ houseId?: string }>(event).catch(() => ({}) as { houseId?: string })
  const houseId = String(body?.houseId ?? '').trim()

  const [all, hearingNotes] = await Promise.all([
    loadAllDiaries(event, db, user.id),
    loadAllHearingNotesBySession(event, db, user.id),
  ])
  const diaries = houseId ? all.filter((d) => d.houseId === houseId) : all
  if (!diaries.length) return { items: [], redundant: [], basedOn: 0 }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  return await suggestAnalysisAxes(anthropicApiKey as string, diaries, hearingNotes)
})
