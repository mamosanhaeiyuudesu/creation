import { requireKoubaUser, requireKoubaDb, ensureKoubaTables } from '~/server/utils/kouba'
import { generateKoubaIcon } from '~/server/utils/kouba-ai'
import type { KoubaIconTarget } from '~/types/kouba'

// カテゴリ・タスクのアイコンを AI で作る／作り直す。名前（＋任意の指示）から SVG を描かせて icon 列に保存する。
// 作成直後の自動生成と、編集時の「AIに指示して作り直す」の両方がこれを呼ぶ。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ target?: KoubaIconTarget; id?: string; instruction?: string }>(event)
  const target = body?.target
  if (target !== 'category' && target !== 'task') throw createError({ statusCode: 400, message: '対象が不正です' })
  const id = body?.id ?? ''
  const table = target === 'category' ? 'kouba_categories' : 'kouba_tasks'
  const nameColumn = target === 'category' ? 'name' : 'title'

  const row = await db
    .prepare(`SELECT ${nameColumn} AS name, icon FROM ${table} WHERE id = ? AND user_id = ?`)
    .bind(id, user.id)
    .first<{ name: string; icon: string }>()
  if (!row) throw createError({ statusCode: 404, message: target === 'category' ? 'カテゴリが見つかりません' : 'タスクが見つかりません' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const instruction = typeof body?.instruction === 'string' ? body.instruction.trim().slice(0, 200) : ''
  const icon = await generateKoubaIcon(anthropicApiKey as string, { target, name: row.name, instruction, currentIcon: row.icon })

  await db.prepare(`UPDATE ${table} SET icon = ? WHERE id = ?`).bind(icon, id).run()
  return { icon }
})
