import { requirePaletteUser, requirePaletteDb, ensurePaletteTables, toLora } from '~/server/utils/palette'
import type { PaletteLora } from '~/types/palette'

// 保存した LoRA の一覧（名前順）。
export default defineEventHandler(async (event): Promise<PaletteLora[]> => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteTables(db)
  const { results } = await db
    .prepare('SELECT * FROM palette_loras WHERE user_id = ? ORDER BY name COLLATE NOCASE, created_at')
    .bind(user.id)
    .all()
  return (results ?? []).map(toLora)
})
