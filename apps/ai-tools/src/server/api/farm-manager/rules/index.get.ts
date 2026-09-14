import { initFarmManager, loadAccounts, loadRules } from '~/server/utils/farm-manager'

// 学習ルール一覧（仕様§3-4）。「なぜこの科目に自動で入ったのか」を人が見て直せるようにする。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const [rules, accounts] = await Promise.all([loadRules(db, user.id), loadAccounts(db, user.id)])
  const nameByCode = new Map(accounts.map((a) => [a.code, a.name]))
  return rules.map((r) => ({ ...r, accountName: nameByCode.get(r.accountCode) ?? r.accountCode }))
})
