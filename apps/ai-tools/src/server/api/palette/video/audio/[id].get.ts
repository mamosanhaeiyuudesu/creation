import { requirePaletteUser, requirePaletteDb, ensurePaletteVideoTables } from '~/server/utils/palette'

// 保存したシーンの読み上げ（mp3）を返す。中身は作り直すたびに新しい id になるので、長くキャッシュしてよい。
export default defineEventHandler(async (event) => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteVideoTables(db)
  const id = String(getRouterParam(event, 'id') ?? '')
  const row = await db.prepare('SELECT data FROM palette_video_audio WHERE id = ? AND user_id = ?').bind(id, user.id).first()
  if (!row) throw createError({ statusCode: 404, message: '音声が見つかりません' })
  const bin = atob(String(row.data))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  setResponseHeader(event, 'Content-Type', 'audio/mpeg')
  setResponseHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')
  return bytes
})
