import { initFarmManager, loadAccounts, loadTransaction, loadWorkers, saveTransaction } from '~/server/utils/farm-manager'

// その月の人件費を、登録済みの従事者の月額からまとめて1件の取引として計上する。
// 人件費は納品書が出ないので画像からは拾えない＝ここが唯一の入口になる。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const body = await readBody<{ month?: string }>(event)
  const month = /^\d{4}-\d{2}$/.test(body?.month ?? '') ? body!.month! : new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 7)

  const [workers, accounts] = await Promise.all([loadWorkers(db, user.id), loadAccounts(db, user.id)])
  const targets = workers.filter((w) => w.active && w.monthlyCost > 0)
  if (!targets.length) throw createError({ statusCode: 400, message: '月額を設定した従事者がいません。設定画面で登録してください。' })
  const account = accounts.find((a) => a.code === 'VAR001')
  if (!account) throw createError({ statusCode: 500, message: '人件費の科目が見つかりません' })

  // 月末日を発生日にする（その月の労務として計上する）
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
  const occurredAt = `${month}-${String(lastDay).padStart(2, '0')}`

  const id = await saveTransaction(db, user.id, {
    imageUrl: '',
    vendorName: '人件費',
    occurredAt,
    paidAt: occurredAt,
    paymentType: 'CASH',
    note: `${month} の人件費まとめ計上`,
    items: targets.map((w) => ({
      itemName: w.name,
      quantity: null,
      unitPrice: null,
      amount: Math.round(w.monthlyCost),
      accountCode: 'VAR001',
      costType: 'VARIABLE' as const,
      confidenceScore: 1,
      needsConfirmation: false,
      isProvisional: false,
      confirmedByUser: true,
      workerId: w.id,
      reason: '従事者の月額から計上',
    })),
  })

  return await loadTransaction(db, user.id, id)
})
