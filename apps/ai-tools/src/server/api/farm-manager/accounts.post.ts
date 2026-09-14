import { initFarmManager, loadAccounts, newId } from '~/server/utils/farm-manager'
import type { AccountCategory } from '~/types/farm-manager'

// 科目を自分で足す。Excelの運用ポイント①「発生している項目を追加する」に対応。
// コードは区分ごとの連番（VAR900〜 / FIX900〜 …）を自動採番する。
const PREFIX: Record<AccountCategory, string> = {
  A_REVENUE: 'REV',
  B_VARIABLE: 'VAR',
  D_FIXED: 'FIX',
  F_NON_OPERATING: 'NOP',
  H_FINANCE: 'FIN',
}

export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const body = await readBody<{ name?: string; category?: string; note?: string }>(event)

  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: '科目名を入力してください' })
  const category = (['A_REVENUE', 'B_VARIABLE', 'D_FIXED', 'F_NON_OPERATING', 'H_FINANCE'] as string[]).includes(body?.category ?? '')
    ? (body!.category as AccountCategory)
    : 'B_VARIABLE'

  const accounts = await loadAccounts(db, user.id)
  const prefix = PREFIX[category]
  // 900番台をユーザー追加ぶんに使う（仮置きの999は避ける）
  const used = accounts
    .filter((a) => a.code.startsWith(prefix))
    .map((a) => Number(a.code.slice(prefix.length)))
    .filter((n) => Number.isFinite(n) && n >= 900 && n < 999)
  const next = (used.length ? Math.max(...used) + 1 : 900)
  if (next >= 999) throw createError({ statusCode: 400, message: 'この区分に追加できる科目の上限に達しました' })
  const code = `${prefix}${next}`

  await db
    .prepare(
      `INSERT INTO farm_manager_accounts (id, user_id, code, name, category, note, is_custom, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    )
    .bind(newId(), user.id, code, name, category, (body?.note ?? '').trim().slice(0, 100), 900 + next)
    .run()

  return { code, name, category }
})
