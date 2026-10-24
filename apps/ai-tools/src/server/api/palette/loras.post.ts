import { requirePaletteUser, requirePaletteDb, ensurePaletteTables, parseLoraBody, toLora } from '~/server/utils/palette'
import type { PaletteLora } from '~/types/palette'

const MAX_LORAS = 200

// LoRA を名前をつけて保存する。
export default defineEventHandler(async (event): Promise<PaletteLora> => {
  const user = await requirePaletteUser(event)
  const db = requirePaletteDb(event)
  await ensurePaletteTables(db)
  const v = parseLoraBody(await readBody(event))

  const count = await db.prepare('SELECT COUNT(*) AS n FROM palette_loras WHERE user_id = ?').bind(user.id).first()
  if (Number(count?.n ?? 0) >= MAX_LORAS) throw createError({ statusCode: 400, message: `保存できる LoRA は ${MAX_LORAS} 件までです` })

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO palette_loras (id, user_id, name, url, scale, trigger_word, memo) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, v.name, v.url, v.scale, v.triggerWord, v.memo)
    .run()
  const row = await db.prepare('SELECT * FROM palette_loras WHERE id = ?').bind(id).first()
  return toLora(row)
})
