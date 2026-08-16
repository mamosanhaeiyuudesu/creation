import { requireKeikoUser, requireKeikoDb, ensureKeikoTables, normalizeCount } from '~/server/utils/keiko'

// 練習項目の変更（やること・本数・1本あたりのポイント・表示/非表示）。
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const id = getRouterParam(event, 'id')!
  const existing = await db.prepare('SELECT id FROM keiko_items WHERE id = ? AND user_id = ?').bind(id, user.id).first<{ id: string }>()
  if (!existing) throw createError({ statusCode: 404, message: '項目が見つかりません' })

  const body = await readBody<{ name?: string; kind?: string; repCount?: number; pointPerRep?: number; active?: boolean }>(event)

  if (body?.kind === 'direct' || body?.kind === 'reps') {
    // 「本数×ポイント」から「直接ポイント」へ切り替えると、過去の記録は rate しか持たず0点になってしまう。
    // 切り替える前に、そのときの設定で計算した獲得ポイントを points へ焼き付けておく。
    if (body.kind === 'direct') {
      await db
        .prepare(
          'UPDATE keiko_records SET points = (SELECT ROUND(i.rep_count * i.point_per_rep * keiko_records.rate / 100.0) FROM keiko_items i WHERE i.id = keiko_records.item_id) ' +
            'WHERE item_id = ? AND points IS NULL'
        )
        .bind(id)
        .run()
    }
    await db.prepare('UPDATE keiko_items SET kind = ? WHERE id = ?').bind(body.kind, id).run()
  }

  if (typeof body?.name === 'string') {
    const name = body.name.trim()
    if (!name) throw createError({ statusCode: 400, message: 'やることを入力してください' })
    await db.prepare('UPDATE keiko_items SET name = ? WHERE id = ?').bind(name, id).run()
  }

  if (body?.repCount !== undefined) {
    await db.prepare('UPDATE keiko_items SET rep_count = ? WHERE id = ?').bind(normalizeCount(body.repCount, 1), id).run()
  }

  if (body?.pointPerRep !== undefined) {
    await db.prepare('UPDATE keiko_items SET point_per_rep = ? WHERE id = ?').bind(normalizeCount(body.pointPerRep, 1), id).run()
  }

  if (typeof body?.active === 'boolean') {
    await db.prepare('UPDATE keiko_items SET active = ? WHERE id = ?').bind(body.active ? 1 : 0, id).run()
  }

  return { ok: true }
})
