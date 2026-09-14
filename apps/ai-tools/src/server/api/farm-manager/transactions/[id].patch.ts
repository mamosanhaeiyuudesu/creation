import { initFarmManager, learnRules, loadAccounts, loadTransaction, normalizeSaveInput, saveTransaction } from '~/server/utils/farm-manager'

// 取引の上書き（明細は全入れ替え）。所有者チェックは UPDATE / DELETE の WHERE user_id で担保する。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const id = getRouterParam(event, 'id') ?? ''
  const existing = await loadTransaction(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: '取引が見つかりません' })

  const body = await readBody<any>(event)
  const accounts = await loadAccounts(db, user.id)
  const input = normalizeSaveInput(body, accounts)
  await saveTransaction(db, user.id, input, id)
  await learnRules(db, user.id, input.vendorName, input.items)

  return await loadTransaction(db, user.id, id)
})
