import {
  OSARAI_THEME_MAX,
  assertUnderDailyLimit,
  clientIpHash,
  ensureOsaraiTables,
  getOsaraiDb,
  makeSetId,
  saveSet,
} from '~/server/utils/osarai'
import { generateSet } from '~/server/utils/osarai-ai'
import { OSARAI_COUNTS, type OsaraiSet } from '~/types/osarai'

// テーマと問題数を受け取り、AIで問題セットを作って保存する。ログイン不要。
// 返すのは id だけ（ページは /osarai/<id> に移って、共有された人と同じ経路で読み込む）。
export default defineEventHandler(async (event) => {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{ theme?: string; count?: number }>(event)
  const theme = (body?.theme ?? '').trim()
  if (!theme) throw createError({ statusCode: 400, message: 'テーマを入力してください' })
  if (theme.length > OSARAI_THEME_MAX) {
    throw createError({ statusCode: 400, message: `テーマは${OSARAI_THEME_MAX}文字以内で入力してください` })
  }
  const count = (OSARAI_COUNTS as readonly number[]).includes(Number(body?.count)) ? Number(body!.count) : 10

  const db = getOsaraiDb(event)
  if (db) await ensureOsaraiTables(db)
  const ipHash = await clientIpHash(event)
  await assertUnderDailyLimit(db, ipHash)

  const generated = await generateSet(anthropicApiKey as string, theme, count)
  const set: OsaraiSet = {
    id: makeSetId(),
    theme,
    title: generated.title,
    level: generated.level,
    questions: generated.questions,
    createdAt: new Date().toISOString(),
  }
  await saveSet(db, set, ipHash)
  return { id: set.id }
})
