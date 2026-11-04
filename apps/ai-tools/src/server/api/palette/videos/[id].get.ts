import { requirePaletteUser, requirePaletteDb, ensurePaletteVideoTables, toVideo } from '~/server/utils/palette'
import type { PaletteVideo } from '~/types/palette'

export default defineEventHandler(async (event): Promise<PaletteVideo> => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteVideoTables(db)
  const id = String(getRouterParam(event, 'id') ?? '')
  const row = await db.prepare('SELECT * FROM palette_videos WHERE id = ? AND user_id = ?').bind(id, user.id).first()
  if (!row) throw createError({ statusCode: 404, message: '動画が見つかりません' })
  return toVideo(row)
})
