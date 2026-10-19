import { requireNikkiUser, requireNikkiDb, requireDate, addPhoto } from '~/server/utils/nikki'

/** 日記に写真を1枚足す（1日3枚まで）。クライアントで縮小した data URL を受け取る。 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const body = await readBody<{ date?: string; dataUrl?: string }>(event)
  const date = requireDate(body?.date)
  const photos = await addPhoto(event, db, user.id, date, body?.dataUrl)
  return { photos }
})
