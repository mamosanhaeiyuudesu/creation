import { initFarmManager, loadSettings, toNumber } from '~/server/utils/farm-manager'

export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const body = await readBody<{ farmName?: string; cultivatedAreaA?: number; openingCash?: number }>(event)

  await db
    .prepare(
      `INSERT INTO farm_manager_settings (user_id, farm_name, cultivated_area_a, opening_cash, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET farm_name = excluded.farm_name,
                                          cultivated_area_a = excluded.cultivated_area_a,
                                          opening_cash = excluded.opening_cash,
                                          updated_at = datetime('now')`
    )
    .bind(
      user.id,
      (body?.farmName ?? '').trim().slice(0, 60),
      Math.max(0, toNumber(body?.cultivatedAreaA) ?? 0),
      toNumber(body?.openingCash) ?? 0
    )
    .run()

  return await loadSettings(db, user.id)
})
