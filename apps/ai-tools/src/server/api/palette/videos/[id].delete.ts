import { requirePaletteUser, requirePaletteDb, ensurePaletteVideoTables } from '~/server/utils/palette'

// 動画の下書きと、その読み上げをまとめて消す。シーンの絵（palette_generations の行）は残る（画像の履歴には出ない）。
export default defineEventHandler(async (event) => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteVideoTables(db)
  const id = String(getRouterParam(event, 'id') ?? '')
  await db.batch([
    db.prepare('DELETE FROM palette_video_audio WHERE video_id = ? AND user_id = ?').bind(id, user.id),
    db.prepare('DELETE FROM palette_videos WHERE id = ? AND user_id = ?').bind(id, user.id),
  ])
  return { ok: true }
})
