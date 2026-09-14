import { initFarmManager, loadWorkers, toNumber } from '~/server/utils/farm-manager'

export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ name?: string; employmentType?: string; monthlyCost?: number; active?: boolean }>(event)

  const sets: string[] = []
  const binds: any[] = []
  if (typeof body?.name === 'string') { sets.push('name = ?'); binds.push(body.name.trim().slice(0, 40)) }
  if ((['FAMILY', 'EMPLOYEE', 'PART_TIME'] as string[]).includes(body?.employmentType ?? '')) { sets.push('employment_type = ?'); binds.push(body!.employmentType) }
  if (body?.monthlyCost !== undefined) { sets.push('monthly_cost = ?'); binds.push(Math.max(0, toNumber(body.monthlyCost) ?? 0)) }
  if (body?.active !== undefined) { sets.push('active = ?'); binds.push(body.active ? 1 : 0) }
  if (!sets.length) return await loadWorkers(db, user.id)

  await db.prepare(`UPDATE farm_manager_workers SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).bind(...binds, id, user.id).run()
  return await loadWorkers(db, user.id)
})
