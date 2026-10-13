// PDFダウンロードのたびに [id].vue から呼ばれる。Googleドライブと連携し、保存先フォルダも
// 設定しているユーザーだけ実際にアップロードする。連携・設定が無ければ何もせず { saved: false } を返す
// （ドライブ保存は付加機能なので、未設定のユーザーの操作を妨げない）。

import { requireKikigakiUser } from '~/server/utils/kikigaki'
import { getKikigakiGoogleStatus, uploadPdfToDrive } from '~/server/utils/kikigaki-google'

export default defineEventHandler(async (event) => {
  const user = await requireKikigakiUser(event)
  // PDFは base64 のJSONではなくバイナリのまま受け取る（巨大な文字列を作らずメモリを抑えるため）。
  const pdf = await readRawBody(event, false)
  if (!pdf || !pdf.length) throw createError({ statusCode: 400, message: 'PDFデータがありません' })
  let fileName = 'キキガキ議事録.pdf'
  try {
    fileName = decodeURIComponent(getHeader(event, 'x-file-name') || '') || fileName
  } catch {
    /* 壊れたヘッダーは既定名のまま */
  }
  fileName = fileName.slice(0, 200)

  const status = await getKikigakiGoogleStatus(event, user.id)
  if (!status.connected || !status.driveFolderId) {
    return { saved: false }
  }
  if (status.needsReconnect) {
    // 2026-09-04以前の古いスコープの連携が残っているケース。Google側の生エラーより先にこちらで案内する。
    throw createError({
      statusCode: 400,
      message: '権限が古いため保存できません。一覧ページで「連携する」からGoogleと再連携してください',
    })
  }

  try {
    const uploaded = await uploadPdfToDrive(event, user.id, status.driveFolderId, fileName, new Uint8Array(pdf))
    return { saved: true, fileUrl: uploaded.url }
  } catch (e: any) {
    const d = e?.data
    const detail =
      (typeof d?.error === 'string' ? d.error : d?.error?.message) ||
      (typeof d === 'string' ? d.slice(0, 300) : '') ||
      e?.statusMessage ||
      e?.message ||
      String(e)
    throw createError({ statusCode: 502, message: `Googleドライブへの保存に失敗しました: ${detail}` })
  }
})
