import { initFarmSimulation } from '~/server/utils/farm-simulation'
import { suggestAssumptions } from '~/server/utils/farm-simulation-ai'
import type { AiSuggestion, TaxYear } from '~/types/farm-simulation'

// 前提条件（売上・資材費・人件費・その他）の初期値をAIに出してもらう。保存はクライアント側の状態に乗せる。

/** AIが極端な値を返しても画面が壊れないよう、ありえる幅に収める。 */
function clampRate(v: unknown, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.round(Math.min(max, Math.max(min, n)) * 10) / 10
}

export default defineEventHandler(async (event): Promise<AiSuggestion> => {
  await initFarmSimulation(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{ years?: TaxYear[] }>(event)
  const years = (Array.isArray(body?.years) ? body.years : []).filter((y) => y && y.status === 'confirmed').slice(0, 10)
  if (!years.length) throw createError({ statusCode: 400, message: '確定した実績がありません' })

  const out = await suggestAssumptions(anthropicApiKey as string, years)
  if (!out) throw createError({ statusCode: 502, message: 'AIの提案を受け取れませんでした。もう一度お試しください。' })

  const reason = (v: unknown) => String(v ?? '').trim().slice(0, 80)
  return {
    revenueRate: clampRate(out.revenueRate, -20, 20),
    materialRate: clampRate(out.materialRate, -10, 20),
    laborRate: clampRate(out.laborRate, -20, 20),
    otherRate: clampRate(out.otherRate, -10, 20),
    reasons: {
      revenue: reason(out.reasons?.revenue),
      material: reason(out.reasons?.material),
      labor: reason(out.reasons?.labor),
      other: reason(out.reasons?.other),
    },
    createdAt: new Date().toISOString(),
  }
})
