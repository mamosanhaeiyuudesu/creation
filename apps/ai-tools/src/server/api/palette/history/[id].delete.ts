import { requirePaletteUser, requirePaletteDb, ensurePaletteTables } from '~/server/utils/palette'

export default defineEventHandler(async (event) => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteTables(db)
  const id = getRouterParam(event, 'id') ?? ''
  await db.prepare('DELETE FROM palette_generations WHERE id = ? AND user_id = ?').bind(id, user.id).run()
  return { ok: true }
})
