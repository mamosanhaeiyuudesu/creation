import { requireNikkiUser, requireNikkiDb, deletePhoto } from '~/server/utils/nikki'

export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const id = getRouterParam(event, 'id') ?? ''

  const res = await deletePhoto(db, user.id, id)
  if (!res) throw createError({ statusCode: 404, message: '写真が見つかりません' })
  return { photos: res.photos }
})
