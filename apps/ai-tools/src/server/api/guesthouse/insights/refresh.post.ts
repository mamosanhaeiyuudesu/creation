import {
  requireGuesthouseUser,
  requireGuesthouseDb,
  ensureGuesthouseTables,
  buildInsights,
  loadAllDiaries,
  loadAllHearingNotesBySession,
  loadGuestProfiles,
  saveGuestProfile,
  pruneGuestProfiles,
} from '~/server/utils/guesthouse'
import { extractGuestProfile } from '~/server/utils/guesthouse-ai'
import { VOCAB_VERSION } from '~/server/utils/guesthouse-insights'
import type { InsightsRefreshResult } from '~/types/guesthouse'

// 顧客分析の中間データを作り直す（「更新」ボタン）。
// 変わっていない日記は Claude を呼ばずに保存済みを使い回すので、定常状態では呼び出し0回で終わる。
export default defineEventHandler(async (event): Promise<InsightsRefreshResult> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const [diaries, cached, hearingNotes] = await Promise.all([
    loadAllDiaries(event, db, user.id),
    loadGuestProfiles(event, db, user.id),
    loadAllHearingNotesBySession(event, db, user.id),
  ])

  // 日記が消えたゲストの行を先に片付ける（セッションごと削除された場合）。
  await pruneGuestProfiles(db, user.id, diaries.map((d) => d.sessionId))

  // 抽出が必要なのは「未抽出」「日記が編集された（id が変わった）」「語彙が上がった」の3つ。
  const targets = diaries.filter((d) => {
    const hit = cached.get(d.sessionId)
    return !hit || hit.diaryId !== d.id || hit.vocabVersion !== VOCAB_VERSION
  })

  if (targets.length) {
    const { anthropicApiKey } = useRuntimeConfig(event)
    if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

    // 1件ずつ順に処理する（同時に投げると Workers の subrequest 上限とレート制限に当たりやすい）。
    for (const d of targets) {
      const data = await extractGuestProfile(anthropicApiKey as string, d, hearingNotes.get(d.sessionId) ?? [])
      await saveGuestProfile(event, db, d.sessionId, d.houseId, d.id, VOCAB_VERSION, data)
    }
  }

  const insights = await buildInsights(event, db, user.id, VOCAB_VERSION)
  return { ...insights, extracted: targets.length }
})
