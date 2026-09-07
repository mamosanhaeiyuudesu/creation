import { resolveKikigakiUserId, saveKikigakiDriveFolder } from '~/server/utils/kikigaki-google'

// 設定画面で「保存先フォルダ」を登録・変更する。フォルダの共有リンクまたはIDを受け取り、
// Drive APIに渡せるIDへ変換して保存する（saveKikigakiDriveFolder 側で読み取れなければ400）。
export default defineEventHandler(async (event) => {
  const userId = await resolveKikigakiUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const body = await readBody<{ folderInput?: string }>(event)
  const folderInput = (body?.folderInput ?? '').trim()
  if (!folderInput) throw createError({ statusCode: 400, message: 'フォルダのリンクまたはIDを入力してください' })

  return await saveKikigakiDriveFolder(event, userId, folderInput)
})
