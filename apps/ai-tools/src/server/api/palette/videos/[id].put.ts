import { requirePaletteUser, requirePaletteDb, ensurePaletteVideoTables, toVideo } from '~/server/utils/palette'
import { normalizeVideo } from '~/utils/palette-video'
import type { PaletteVideo } from '~/types/palette'

// 動画の下書きを保存する（無ければ作る）。id は画面が振る（読み上げの保存より先に行を作るため）。
// 使われなくなった読み上げ（作り直した前の版）はここで消す。ただし作ってから1時間たったものだけ＝
// 読み上げを作った直後に、それを知らない古い下書きの保存が届いても消してしまわないように。
export default defineEventHandler(async (event): Promise<PaletteVideo> => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteVideoTables(db)
  const id = String(getRouterParam(event, 'id') ?? '')
  if (!/^[\w-]{8,64}$/.test(id)) throw createError({ statusCode: 400, message: 'id が不正です' })

  const video = normalizeVideo(await readBody(event))
  const other = await db.prepare('SELECT user_id FROM palette_videos WHERE id = ?').bind(id).first()
  if (other && other.user_id !== user.id) throw createError({ statusCode: 404, message: '動画が見つかりません' })

  const json = JSON.stringify(video)
  await db
    .prepare(
      "INSERT INTO palette_videos (id, user_id, title, data) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, data = excluded.data, updated_at = datetime('now')"
    )
    .bind(id, user.id, video.title, json)
    .run()

  const used = video.scenes.map((s) => s.audio?.id).filter((x): x is string => !!x)
  await db
    .prepare(
      `DELETE FROM palette_video_audio WHERE video_id = ? AND user_id = ? AND created_at < datetime('now', '-1 hour')${used.length ? ` AND id NOT IN (${used.map(() => '?').join(',')})` : ''}`
    )
    .bind(id, user.id, ...used)
    .run()

  const row = await db.prepare('SELECT * FROM palette_videos WHERE id = ?').bind(id).first()
  return toVideo(row)
})
