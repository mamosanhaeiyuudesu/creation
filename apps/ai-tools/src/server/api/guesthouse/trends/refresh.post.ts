import {
  requireGuesthouseUser,
  requireGuesthouseDb,
  ensureGuesthouseTables,
  loadStoredTrends,
  loadTrendsMeta,
  loadAllDiaries,
  saveTrendsCache,
} from '~/server/utils/guesthouse'
import { computeTrends } from '~/server/utils/guesthouse-ai'
import type { TrendsRefreshResult } from '~/types/guesthouse'

// 傾向を再計算する（管理トップの「更新」ボタン）。材料＝お客さん日記。
// 前回計算時から日記が変わっていなければ再計算せず、前回結果をそのまま返す（updated=false）。
export default defineEventHandler(async (event): Promise<TrendsRefreshResult> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const { fingerprint, diaryCount } = await loadTrendsMeta(db, user.id)
  const stored = await loadStoredTrends(db, user.id)

  // 変化なし → 再計算しない。
  if (stored && stored.fingerprint === fingerprint) {
    return {
      items: stored.items,
      basedOn: stored.basedOn,
      computedAt: stored.computedAt,
      stale: false,
      updated: false,
    }
  }

  // 日記が2件未満なら傾向は出さない（指紋だけ保存して次回スキップできるようにする）。
  if (diaryCount < 2) {
    await saveTrendsCache(db, user.id, [], fingerprint, diaryCount)
    const s = await loadStoredTrends(db, user.id)
    return { items: [], basedOn: diaryCount, computedAt: s?.computedAt ?? null, stale: false, updated: true }
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const diaries = await loadAllDiaries(event, db, user.id)
  const items = await computeTrends(anthropicApiKey as string, diaries)
  await saveTrendsCache(db, user.id, items, fingerprint, diaries.length)
  const s = await loadStoredTrends(db, user.id)

  return {
    items,
    basedOn: diaries.length,
    computedAt: s?.computedAt ?? null,
    stale: false,
    updated: true,
  }
})
