import { initFarmManager, learnRules, loadAccounts, loadTransaction, normalizeSaveInput, saveTransaction } from '~/server/utils/farm-manager'

// 確認画面で人が確定した取引を保存し、確定した「取引先 × 品目」を学習ルールへ追加する（仕様§4-1 の 6）。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const body = await readBody<any>(event)

  const accounts = await loadAccounts(db, user.id)
  const input = normalizeSaveInput(body, accounts)
  const id = await saveTransaction(db, user.id, input)
  await learnRules(db, user.id, input.vendorName, input.items)

  return await loadTransaction(db, user.id, id)
})
