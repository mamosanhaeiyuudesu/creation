import { requireAdmin, requireDb, ensureKakiTables, shapeTree, type TreeRow } from '~/server/utils/kaki'

// 木の編集（管理者のみ）。渡されたフィールドだけ更新する。
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = requireDb(event)
  await ensureKakiTables(db)

  const id = getRouterParam(event, 'id') ?? ''
  if (!id) throw createError({ statusCode: 400, message: 'id は必須です' })

  const body = await readBody<Record<string, any>>(event)

  const sets: string[] = []
  const binds: any[] = []
  const push = (col: string, val: any) => { sets.push(`${col} = ?`); binds.push(val) }

  if (body.nickname !== undefined) push('nickname', String(body.nickname).trim())
  if (body.number !== undefined) push('number', Number(body.number) || 0)
  if (body.fosterUserId !== undefined) push('foster_user_id', body.fosterUserId || null)
  if (body.plantedYear !== undefined) push('planted_year', body.plantedYear === null || body.plantedYear === '' ? null : Number(body.plantedYear))
  if (body.locationNote !== undefined) push('location_note', String(body.locationNote))
  if (body.personality !== undefined) push('personality', String(body.personality))
  if (body.strengths !== undefined) push('strengths', JSON.stringify(Array.isArray(body.strengths) ? body.strengths : []))
  if (body.weaknesses !== undefined) push('weaknesses', JSON.stringify(Array.isArray(body.weaknesses) ? body.weaknesses : []))
  if (body.status !== undefined && ['healthy', 'watching', 'sick'].includes(body.status)) push('status', body.status)

  if (sets.length) {
    binds.push(id)
    await db.prepare(`UPDATE kaki_trees SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run()
  }

  const row = await db.prepare('SELECT * FROM kaki_trees WHERE id = ?').bind(id).first<TreeRow>()
  if (!row) throw createError({ statusCode: 404, message: '木が見つかりません' })
  return shapeTree(row)
})
