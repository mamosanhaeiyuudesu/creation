import { resolveLifeUserId, getLifeGoogleStatus } from '~/server/utils/life-google'

export default defineEventHandler(async (event) => {
  const userId = await resolveLifeUserId(event)
  if (!userId) return { connected: false }
  return await getLifeGoogleStatus(event, userId)
})
