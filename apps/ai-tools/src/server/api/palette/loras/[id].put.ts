import { requirePaletteUser, requirePaletteDb, ensurePaletteTables, parseLoraBody, toLora } from '~/server/utils/palette'
import type { PaletteLora } from '~/types/palette'

export default defineEventHandler(async (event): Promise<PaletteLora> => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteTables(db)
  const id = getRouterParam(event, 'id') ?? ''
  const v = parseLoraBody(await readBody(event))

  const res = await db
    .prepare('UPDATE palette_loras SET name = ?, url = ?, scale = ?, trigger_word = ?, memo = ? WHERE id = ? AND user_id = ?')
    .bind(v.name, v.url, v.scale, v.triggerWord, v.memo, id, user.id)
    .run()
  if (!res?.meta?.changes) throw createError({ statusCode: 404, message: 'LoRA が見つかりません' })
  const row = await db.prepare('SELECT * FROM palette_loras WHERE id = ?').bind(id).first()
  return toLora(row)
})
