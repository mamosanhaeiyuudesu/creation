import { requireNikkiUser, requireNikkiDb, loadPhotoData } from '~/server/utils/nikki'

/** 写真の本体を画像として返す（<img src> から Cookie 付きで読む）。 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const id = getRouterParam(event, 'id') ?? ''

  const dataUrl = await loadPhotoData(event, db, user.id, id)
  const m = dataUrl?.match(/^data:(image\/[a-z]+);base64,(.+)$/)
  if (!m) throw createError({ statusCode: 404, message: '写真が見つかりません' })

  const binary = atob(m[2]!)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  setHeader(event, 'Content-Type', m[1]!)
  // 写真は作り直さず消すだけ＝IDごとに中身が変わらないので長くキャッシュしてよい
  setHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')
  return bytes
})
