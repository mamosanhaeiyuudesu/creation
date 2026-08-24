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

/**
 * 1回の呼び出しで抽出する上限。
 * 語彙（VOCAB_VERSION）を上げた直後は全件が作り直しの対象になるが、日記1件ごとに Claude を
 * 1回呼ぶので、数十件をまとめて処理すると Workers の実行時間・subrequest 上限に当たる。
 * 少しずつ進めて、残りは画面側が続けて呼ぶ（stale が false になるまで繰り返される）。
 */
const MAX_EXTRACT_PER_CALL = 10

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

  const batch = targets.slice(0, MAX_EXTRACT_PER_CALL)
  if (batch.length) {
    const { anthropicApiKey } = useRuntimeConfig(event)
    if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

    // 1件ずつ順に処理する（同時に投げると Workers の subrequest 上限とレート制限に当たりやすい）。
    for (const d of batch) {
      const data = await extractGuestProfile(anthropicApiKey as string, d, hearingNotes.get(d.sessionId) ?? [])
      await saveGuestProfile(event, db, d.sessionId, d.houseId, d.id, VOCAB_VERSION, data)
    }
  }

  // まだ残っていれば insights.stale が true のままになるので、画面側がもう一度呼んで続きを進める。
  const insights = await buildInsights(event, db, user.id, VOCAB_VERSION)
  return { ...insights, extracted: batch.length }
})
