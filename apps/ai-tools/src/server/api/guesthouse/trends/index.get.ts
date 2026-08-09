import {
  requireGuesthouseUser,
  requireGuesthouseDb,
  ensureGuesthouseTables,
  loadStoredTrends,
  loadTrendsMeta,
} from '~/server/utils/guesthouse'
import type { Trends } from '~/types/guesthouse'

// 傾向ダッシュボード（管理トップ・全宿横断）。保存済みの前回結果を返す（Claudeは叩かない）。
// stale = 前回計算後に日記が変わっており、「更新」で再計算できる状態。
export default defineEventHandler(async (event): Promise<Trends> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const stored = await loadStoredTrends(db, user.id)
  const { fingerprint, diaryCount } = await loadTrendsMeta(db, user.id)
  const stale = (stored?.fingerprint ?? '') !== fingerprint

  return {
    items: stored?.items ?? [],
    basedOn: stored ? stored.basedOn : diaryCount, // 未計算なら現在の件数を出す（UIの「現在N件」表示用）
    computedAt: stored?.computedAt ?? null,
    stale,
  }
})
