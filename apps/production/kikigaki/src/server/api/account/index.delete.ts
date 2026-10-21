// 退会のうち「今すぐ消す」。本人のデータをその場で全部消す（猶予なし）。詳細は server/utils/account.ts。
// お休み中・削除予約中の人もここから消せる（allowWithdrawn）。
// 画面側は、これが成功したあとに Firebase のアカウントも消してログアウトする。

import { requireUser } from '~/server/utils/auth'
import { deleteAccount } from '~/server/utils/account'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { allowWithdrawn: true })
  const body = await readBody<{ confirm?: unknown; email?: unknown }>(event)
  // 誤って呼ばれても消えないよう、画面で確認したことの印を求める
  if (body?.confirm !== 'DELETE') {
    throw createError({ statusCode: 400, message: '削除の確認ができませんでした。もう一度お試しください。' })
  }
  // 画面の確認が通っていても、アカウントのメールアドレスを自分で打ち込んだ場合しか消さない
  const expected = (user.email ?? '').trim().toLowerCase()
  if (expected && (typeof body?.email !== 'string' || body.email.trim().toLowerCase() !== expected)) {
    throw createError({ statusCode: 400, message: 'メールアドレスが一致しません。アカウントのメールアドレスを入力してください。' })
  }
  await deleteAccount(event, user.id)
  return { ok: true }
})
