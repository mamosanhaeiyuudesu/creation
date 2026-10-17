// 退会（アカウントの削除）。本人のデータをすべて消す。詳細は server/utils/account.ts。
// 画面側は、これが成功したあとに Firebase のアカウントも消してログアウトする。

import { requireUser } from '~/server/utils/auth'
import { deleteAccount } from '~/server/utils/account'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ confirm?: unknown }>(event)
  // 誤って呼ばれても消えないよう、画面で確認したことの印を求める
  if (body?.confirm !== 'DELETE') {
    throw createError({ statusCode: 400, message: '削除の確認ができませんでした。もう一度お試しください。' })
  }
  await deleteAccount(event, user.id)
  return { ok: true }
})
