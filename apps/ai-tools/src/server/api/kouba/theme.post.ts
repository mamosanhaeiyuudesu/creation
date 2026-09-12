import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, setCurrentTheme, loadThemeHistory } from '~/server/utils/kouba'

// 「今のテーマ」を書き換える。今のものは終了時刻が入って履歴に落ち、新しいものの掲載が始まる。
// 空文字を送るとテーマを下ろす（今のものを履歴に落として、掲載中を無しにする）。
// 履歴も返すのは、書き換えた結果その場で履歴が1件増えることがあるため（クライアントが取り直さずに済む）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ text?: string }>(event)
  const text = (body?.text ?? '').trim()
  if (text.length > 200) throw createError({ statusCode: 400, message: 'テーマは200文字までです' })

  const current = await setCurrentTheme(db, user.id, text)
  const history = await loadThemeHistory(db, user.id)
  return { current, history }
})
