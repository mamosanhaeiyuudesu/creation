import { requirePaletteUser, requirePaletteDb, ensurePaletteTables, toGeneration } from '~/server/utils/palette'
import type { PaletteGeneration } from '~/types/palette'

// 生成の履歴（新しい順、完了・失敗したものだけ）。
export default defineEventHandler(async (event): Promise<PaletteGeneration[]> => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteTables(db)
  const { results } = await db
    .prepare("SELECT * FROM palette_generations WHERE user_id = ? AND status != 'pending' ORDER BY created_at DESC LIMIT 60")
    .bind(user.id)
    .all()
  return (results ?? []).map(toGeneration)
})
