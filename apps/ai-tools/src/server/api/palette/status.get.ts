import {
  requirePaletteUser,
  requirePaletteDb,
  ensurePaletteTables,
  requireFalKey,
  falFetch,
  toGeneration,
  FAL_QUEUE,
} from '~/server/utils/palette'
import { falErrorMessage } from '~/utils/palette-fal'
import type { PaletteStatusResponse } from '~/types/palette'

// 生成の進み具合を fal.ai に聞く。終わっていれば結果を取り、履歴の行を更新する（何度呼ばれても同じ結果）。
export default defineEventHandler(async (event): Promise<PaletteStatusResponse> => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteTables(db)
  const id = String(getQuery(event).id ?? '')
  const row = await db.prepare('SELECT * FROM palette_generations WHERE id = ? AND user_id = ?').bind(id, user.id).first()
  if (!row) throw createError({ statusCode: 404, message: '生成が見つかりません' })

  // すでに結果が出ている（二重ポーリングなど）
  if (row.status === 'completed') return { status: 'COMPLETED', generation: toGeneration(row) }
  if (row.status === 'failed') return { status: 'FAILED', generation: toGeneration(row), error: row.error }

  const key = requireFalKey(event)
  // 保存してある URL は fal.ai 自身が返したもの。念のためホストを確かめてから叩く。
  const statusUrl = String(row.status_url)
  const responseUrl = String(row.response_url)
  if (!statusUrl.startsWith(`${FAL_QUEUE}/`) || !responseUrl.startsWith(`${FAL_QUEUE}/`)) {
    throw createError({ statusCode: 500, message: '保存された問い合わせ先が不正です' })
  }

  const sres = await falFetch(key, statusUrl)
  const status: any = await sres.json().catch(() => null)
  if (!sres.ok) throw createError({ statusCode: 502, message: falErrorMessage(status, `状態の取得に失敗しました（${sres.status}）`) })
  if (status?.status !== 'COMPLETED') {
    return { status: status?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'IN_QUEUE', queuePosition: status?.queue_position }
  }

  const rres = await falFetch(key, responseUrl)
  const result: any = await rres.json().catch(() => null)
  if (!rres.ok || !Array.isArray(result?.images)) {
    const error = falErrorMessage(result, `生成に失敗しました（${rres.status}）`)
    await db.prepare("UPDATE palette_generations SET status = 'failed', error = ? WHERE id = ?").bind(error.slice(0, 1000), id).run()
    const failed = await db.prepare('SELECT * FROM palette_generations WHERE id = ?').bind(id).first()
    return { status: 'FAILED', generation: toGeneration(failed), error }
  }

  const images = result.images.map((i: any) => ({
    url: i.url,
    width: i.width,
    height: i.height,
    contentType: i.content_type ?? 'image/jpeg',
  }))
  await db
    .prepare("UPDATE palette_generations SET status = 'completed', images = ?, seed = ? WHERE id = ?")
    .bind(JSON.stringify(images), Number.isFinite(result.seed) ? result.seed : null, id)
    .run()
  const done = await db.prepare('SELECT * FROM palette_generations WHERE id = ?').bind(id).first()
  return { status: 'COMPLETED', generation: toGeneration(done) }
})
