import { requireKoubaUser, requireKoubaDb, ensureKoubaTables } from '~/server/utils/kouba'

// ドラッグ&ドロップ用: サブタスクの並び順を丸ごと差し替える。subtaskIds には「そのユーザーの全サブタスクID」を
// 新しい並び順どおりに渡す。sort_order は 0 から振り直すので、件数が合わなければ 400 で弾く
// （カテゴリの並べ替え・タスクの並べ替えと同じ安全策）。
// メソッドが POST なのも他の reorder 系と同じ理由（[id].patch.ts / [id].delete.ts と同じ親配下に
// 同名メソッドの兄弟ルートを置くと Nuxt の $fetch 型推論が壊れるため）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ subtaskIds?: string[] }>(event)
  const subtaskIds = Array.isArray(body?.subtaskIds) ? body!.subtaskIds.filter((v) => typeof v === 'string') : []
  if (!subtaskIds.length) return { ok: true }
  if (new Set(subtaskIds).size !== subtaskIds.length) {
    throw createError({ statusCode: 400, message: 'サブタスクの並び順が不正です' })
  }

  const placeholders = subtaskIds.map(() => '?').join(',')
  const owned = await db
    .prepare(`SELECT COUNT(*) AS n FROM kouba_task_subtasks WHERE id IN (${placeholders}) AND user_id = ?`)
    .bind(...subtaskIds, user.id)
    .first<{ n: number }>()
  if ((owned?.n ?? 0) !== subtaskIds.length) throw createError({ statusCode: 404, message: 'サブタスクが見つかりません' })

  const total = await db
    .prepare('SELECT COUNT(*) AS n FROM kouba_task_subtasks WHERE user_id = ?')
    .bind(user.id)
    .first<{ n: number }>()
  if ((total?.n ?? 0) !== subtaskIds.length) {
    throw createError({ statusCode: 400, message: 'サブタスクの並び順が最新ではありません。読み込み直してください' })
  }

  await db.batch(subtaskIds.map((id, i) => db.prepare('UPDATE kouba_task_subtasks SET sort_order = ? WHERE id = ?').bind(i, id)))
  return { ok: true }
})
