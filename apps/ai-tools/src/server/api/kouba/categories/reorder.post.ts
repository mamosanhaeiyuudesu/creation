import { requireKoubaUser, requireKoubaDb, ensureKoubaTables } from '~/server/utils/kouba'

// ドラッグ&ドロップ用: カテゴリの並び順（＝3×3グリッド内の位置）を丸ごと差し替える。
// categoryIds には「そのユーザーの全カテゴリID」を新しい並び順どおりに渡す。position は 0 から順に振り直すので、
// 一部だけ送られると position が重複したり穴が空いたりする＝件数が合わなければ 400 で弾く。
// メソッドが POST なのは tasks/reorder.post.ts と同じ理由（[id].patch.ts / [id].delete.ts と
// 同じ親配下に同名メソッドの兄弟ルートを置くと $fetch の型推論が壊れる）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ categoryIds?: string[] }>(event)
  const categoryIds = Array.isArray(body?.categoryIds) ? body!.categoryIds.filter((v) => typeof v === 'string') : []
  if (!categoryIds.length) return { ok: true }
  if (new Set(categoryIds).size !== categoryIds.length) {
    throw createError({ statusCode: 400, message: 'カテゴリの並び順が不正です' })
  }

  const placeholders = categoryIds.map(() => '?').join(',')
  const owned = await db
    .prepare(`SELECT COUNT(*) AS n FROM kouba_categories WHERE id IN (${placeholders}) AND user_id = ?`)
    .bind(...categoryIds, user.id)
    .first<{ n: number }>()
  if ((owned?.n ?? 0) !== categoryIds.length) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  const total = await db
    .prepare('SELECT COUNT(*) AS n FROM kouba_categories WHERE user_id = ?')
    .bind(user.id)
    .first<{ n: number }>()
  if ((total?.n ?? 0) !== categoryIds.length) {
    throw createError({ statusCode: 400, message: 'カテゴリの並び順が最新ではありません。読み込み直してください' })
  }

  // 9件までなので1回の batch で収まる（1文ずつ await すると subrequest を無駄に使う）
  await db.batch(
    categoryIds.map((id, i) => db.prepare('UPDATE kouba_categories SET position = ? WHERE id = ?').bind(i, id))
  )
  return { ok: true }
})
