import { getDevDb } from '~/server/utils/miyako-dev'

// 会期一覧を取得する
export default defineEventHandler(async (event) => {
  const { db, dev, sample } = getDevDb(event)

  if (dev) {
    return [sample.session]
  }

  const { results } = await db
    .prepare(
      `SELECT session_id, session_type, session_name, session_date, close_date, year, term
       FROM sessions
       ORDER BY session_date DESC`
    )
    .all()

  return results as {
    session_id: string
    session_type: string
    session_name: string
    session_date: string
    close_date: string | null
    year: number
    term: number | null
  }[]
})
