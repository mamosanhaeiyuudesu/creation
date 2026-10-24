import {
  requirePaletteUser,
  requirePaletteDb,
  ensurePaletteTables,
  requireFalKey,
  falFetch,
  FAL_QUEUE,
  FAL_ENDPOINTS,
} from '~/server/utils/palette'
import { buildFalInput, falErrorMessage, isHttpsUrl } from '~/utils/palette-fal'
import type { PaletteGenerateRequest } from '~/types/palette'

// 生成をキューに投入して、すぐ返す（待ち続けると Workers の時間制限に当たる）。
// 結果の取得は画面が GET /api/palette/status?id=… を繰り返し呼んで行う。
const MAX_PROMPT = 4000
const MAX_IMAGE_DATA_URL = 12 * 1024 * 1024 // 12MB（画面側で縮小済みのはず）

export default defineEventHandler(async (event) => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteTables(db)
  const key = requireFalKey(event)

  const req = await readBody<PaletteGenerateRequest>(event)
  const mode = req?.mode === 'i2i' ? 'i2i' : 't2i'
  const prompt = String(req?.prompt ?? '').trim()
  if (!prompt) throw createError({ statusCode: 400, message: '英語のプロンプトが空です' })
  if (prompt.length > MAX_PROMPT) throw createError({ statusCode: 400, message: 'プロンプトが長すぎます' })
  for (const l of req.loras ?? []) {
    if (!isHttpsUrl(l?.path)) throw createError({ statusCode: 400, message: 'LoRA の URL が不正です' })
  }
  if (mode === 'i2i') {
    const img = String(req?.imageDataUrl ?? '')
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(img)) {
      throw createError({ statusCode: 400, message: '入力画像を選んでください' })
    }
    if (img.length > MAX_IMAGE_DATA_URL) throw createError({ statusCode: 400, message: '入力画像が大きすぎます' })
  }

  const input = buildFalInput({ ...req, mode, prompt })
  const res = await falFetch(key, `${FAL_QUEUE}/${FAL_ENDPOINTS[mode]}`, { method: 'POST', body: JSON.stringify(input) })
  const data: any = await res.json().catch(() => null)
  if (!res.ok || !data?.request_id) {
    throw createError({ statusCode: res.status === 401 || res.status === 403 ? 502 : res.status || 502, message: falErrorMessage(data, `fal.ai への送信に失敗しました（${res.status}）`) })
  }

  // 履歴に載せる設定（入力画像そのものは保存しない）
  const { imageSize, width, height, steps, guidance, numImages, seed, format, safety, acceleration, strength } = req.params ?? ({} as any)
  const saved = {
    imageSize, width, height, steps, guidance, numImages, seed, format, safety, acceleration, strength,
    loras: (req.loras ?? []).map((l) => ({ path: l.path, scale: l.scale, name: l.name })),
  }
  await db
    .prepare('INSERT OR REPLACE INTO palette_generations (id, user_id, mode, prompt_ja, prompt, params, status, status_url, response_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(data.request_id, user.id, mode, String(req.promptJa ?? '').slice(0, 2000), prompt, JSON.stringify(saved), 'pending', data.status_url ?? '', data.response_url ?? '')
    .run()

  return { id: data.request_id as string }
})
