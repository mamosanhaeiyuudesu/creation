import { getDeepheartDb, clearDeepheartSessionCookie, DEEPHEART_SESSION_COOKIE } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const db = getDeepheartDb(event)
  const token = getCookie(event, DEEPHEART_SESSION_COOKIE)
  if (db && token) {
    await db.prepare('DELETE FROM deepheart_sessions WHERE id = ?').bind(token).run()
  }
  clearDeepheartSessionCookie(event)
  return { ok: true }
})
