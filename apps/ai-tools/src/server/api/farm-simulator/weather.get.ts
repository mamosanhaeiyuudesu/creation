import { getAppDb, getSessionUser } from '~/server/utils/auth'
import { MAX_FETCH_PER_CALL, ensureFarmSimulatorTables, loadWeather } from '~/server/utils/farm-simulator-weather'

// かつらぎ（気象庁アメダス）の日ごとの天気と、週間予報を返す。
// 1回で取りに行くのは MAX_FETCH_PER_CALL か月まで。remaining が0になるまで画面が呼び直す。
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  await ensureFarmSimulatorTables(db)

  const q = getQuery(event)
  const ym = (v: unknown) => (typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : null)
  const from = ym(q.from)
  const to = ym(q.to)
  if (!from || !to || from > to) throw createError({ statusCode: 400, message: '期間の指定が正しくありません（YYYY-MM）' })
  // アメダスかつらぎの観測より前は取りに行かない
  const safeFrom = from < '2000-01' ? '2000-01' : from
  const res = await loadWeather(db, safeFrom, to, q.forecast !== '0')
  return { ...res, perCall: MAX_FETCH_PER_CALL }
})
