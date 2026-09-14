import { initFarmManager, learnRulePairs, loadAccounts, normalizeCostType } from '~/server/utils/farm-manager'
import { CATEGORY_TO_COST_TYPE } from '~/types/farm-manager'

// 仮置き一覧からの一括振り替え（実装優先度3）。
// 選んだ明細をまとめて1つの科目へ移し、確定済みにする。確定した組み合わせは学習ルールにもなる（§3-4）。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const body = await readBody<{ itemIds?: string[]; accountCode?: string; costType?: string; learn?: boolean }>(event)

  const itemIds = (body?.itemIds ?? []).filter((id) => typeof id === 'string' && id).slice(0, 200)
  if (!itemIds.length) throw createError({ statusCode: 400, message: '振り替える明細を選んでください' })

  const accounts = await loadAccounts(db, user.id)
  const account = accounts.find((a) => a.code === String(body?.accountCode ?? '').trim().toUpperCase())
  if (!account) throw createError({ statusCode: 400, message: '振替先の科目が不正です' })

  const costType = normalizeCostType(body?.costType) ?? CATEGORY_TO_COST_TYPE[account.category]
  const placeholders = itemIds.map(() => '?').join(',')

  // 振替先が仮置き科目なら is_provisional は立てたまま（確定扱いにしない）。
  await db
    .prepare(
      `UPDATE farm_manager_items
       SET account_code = ?, cost_type = ?, is_provisional = ?, needs_confirmation = 0,
           confirmed_by_user = ?, confidence_score = 1, reason = ?
       WHERE user_id = ? AND id IN (${placeholders})`
    )
    .bind(
      account.code,
      costType,
      account.isProvisionalBucket ? 1 : 0,
      account.isProvisionalBucket ? 0 : 1,
      account.isProvisionalBucket ? '仮置きのまま' : '仮置き一覧から人が振り替え',
      user.id,
      ...itemIds
    )
    .run()

  // 学習は「取引先 × 品目」単位なので、振り替えた明細の取引先を引き直してから1回でまとめて登録する。
  if (body?.learn !== false && !account.isProvisionalBucket) {
    const rows = await db
      .prepare(
        `SELECT i.item_name AS item_name, t.vendor_name AS vendor_name
         FROM farm_manager_items i JOIN farm_manager_transactions t ON t.id = i.transaction_id
         WHERE i.user_id = ? AND i.id IN (${placeholders})`
      )
      .bind(user.id, ...itemIds)
      .all<{ item_name: string; vendor_name: string }>()

    await learnRulePairs(
      db,
      user.id,
      (rows?.results ?? []).map((r: any) => ({
        vendorName: r.vendor_name ?? '',
        itemName: r.item_name ?? '',
        accountCode: account.code,
        costType,
      }))
    )
  }

  return { ok: true, moved: itemIds.length, accountCode: account.code }
})
