import { requirePaletteUser } from '~/server/utils/palette'
import type { PaletteBalanceResponse } from '~/types/palette'

// fal.ai の残りクレジット。残高は ADMIN スコープの鍵でしか読めない（生成用の API スコープの鍵では 403）ので、
// 別の鍵 NUXT_FAL_ADMIN_KEY を使う。未設定・失敗のときは画面に出さないだけで、生成には影響させない。
export default defineEventHandler(async (event): Promise<PaletteBalanceResponse> => {
  await requirePaletteUser(event)
  const { falAdminKey } = useRuntimeConfig(event)
  if (!falAdminKey) return { available: false, reason: 'no-key' }

  const res = await fetch('https://api.fal.ai/v1/account/billing?expand=credits', {
    headers: { Authorization: `Key ${falAdminKey}` },
  })
  if (!res.ok) return { available: false, reason: res.status === 403 ? 'forbidden' : 'error' }
  const data: any = await res.json().catch(() => null)
  const balance = Number(data?.credits?.current_balance)
  if (!Number.isFinite(balance)) return { available: false, reason: 'error' }
  return { available: true, balance, currency: String(data?.credits?.currency ?? 'USD') }
})
