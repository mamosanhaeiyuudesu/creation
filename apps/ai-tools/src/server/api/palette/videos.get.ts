import { requirePaletteUser, requirePaletteDb, ensurePaletteVideoTables, toVideo } from '~/server/utils/palette'
import type { PaletteVideoSummary } from '~/types/palette'

// 動画の下書きの一覧（新しく触った順）。サムネイルは最初のシーンの絵。
export default defineEventHandler(async (event): Promise<PaletteVideoSummary[]> => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteVideoTables(db)
  const { results } = await db
    .prepare('SELECT * FROM palette_videos WHERE user_id = ? ORDER BY updated_at DESC LIMIT 40')
    .bind(user.id)
    .all()
  return (results ?? []).map((r: any) => {
    const v = toVideo(r)
    return {
      id: v.id,
      title: v.title,
      sceneCount: v.scenes.length,
      thumbUrl: v.scenes.find((s) => s.image)?.image?.url ?? '',
      updatedAt: v.updatedAt,
    }
  })
})
