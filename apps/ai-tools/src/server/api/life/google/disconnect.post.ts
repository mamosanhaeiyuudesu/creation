import { resolveLifeUserId, disconnectLifeGoogle } from '~/server/utils/life-google'

// 連携解除は D1側の参照とリフレッシュトークンを削除するのみ。
// 本人のGoogleドライブに作成済みのスプレッドシート自体は消さない（データは本人のものであり続ける）。
export default defineEventHandler(async (event) => {
  const userId = await resolveLifeUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })
  await disconnectLifeGoogle(event, userId)
  return { ok: true }
})
