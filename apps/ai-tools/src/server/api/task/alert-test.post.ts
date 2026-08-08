/**
 * アラートのテスト送信。設定画面から「テスト送信」で叩く。
 * 保存済みの設定ではなく、画面で入力中のアドレス宛に今すぐ1通送る。
 */
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { isValidEmail, collectImportantTasksForUser, collectDoneTasksForUser, buildPraiseText, buildAlertMail, sendAlertMail } from '~/server/utils/task-alert'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const body = await readBody<{ email?: string }>(event)
  const email = (body?.email ?? '').trim()
  if (!isValidEmail(email)) throw createError({ statusCode: 400, message: 'メールアドレスの形式が正しくありません' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const env = event.context.cloudflare?.env
  const { encryptionKey } = useRuntimeConfig(event)

  const tasks = await collectImportantTasksForUser(db, (encryptionKey as string) ?? '', user.id)
  const doneTasks = await collectDoneTasksForUser(db, (encryptionKey as string) ?? '', user.id)
  const praiseText = await buildPraiseText(env, doneTasks)
  // 定期便は0件なら送らないが、テストは届くこと自体の確認なので0件でも送る
  const mail = buildAlertMail(tasks, env?.NUXT_APP_URL ?? '', doneTasks, praiseText)

  try {
    await sendAlertMail(env, email, { ...mail, subject: `[テスト] ${mail.subject}` })
  } catch (e: any) {
    throw createError({ statusCode: 502, message: `メール送信に失敗しました: ${e?.message ?? e}` })
  }

  return { ok: true, count: tasks.length }
})
