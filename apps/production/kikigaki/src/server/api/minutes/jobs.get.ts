// 議事録を作る仕事のうち、まだ画面に知らせていないもの（作成中・できた・失敗）。
// 画面は作成中のあいだ数秒おきと、開き直したとき・スマホで戻ってきたときにここを見る。

import { requireUser } from '~/server/utils/auth'
import { listJobs } from '~/server/utils/minuteJobs'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { jobs: await listJobs(event, user.id) }
})
