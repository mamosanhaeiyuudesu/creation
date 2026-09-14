import { initFarmManager, loadWorkers, newId, toNumber } from '~/server/utils/farm-manager'
import type { EmploymentType } from '~/types/farm-manager'

// 従事者の登録。Excelでは家族従事者を個人名で管理している（純子/康平/千絵美…）ので、
// 人件費(VAR001)を人ごとに分けられるようにする（仕様§2-1 VAR001の備考）。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const body = await readBody<{ name?: string; employmentType?: string; monthlyCost?: number }>(event)

  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: '名前を入力してください' })
  const employmentType = (['FAMILY', 'EMPLOYEE', 'PART_TIME'] as string[]).includes(body?.employmentType ?? '')
    ? (body!.employmentType as EmploymentType)
    : 'FAMILY'

  await db
    .prepare('INSERT INTO farm_manager_workers (id, user_id, name, employment_type, monthly_cost) VALUES (?, ?, ?, ?, ?)')
    .bind(newId(), user.id, name.slice(0, 40), employmentType, Math.max(0, toNumber(body?.monthlyCost) ?? 0))
    .run()

  return await loadWorkers(db, user.id)
})
