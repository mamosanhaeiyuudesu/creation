import {
  MANABI_THEME_MAX,
  assertUnderDailyLimit,
  clientIpHash,
  ensureManabiTables,
  getManabiDb,
  makeSetId,
  saveSet,
} from '~/server/utils/manabi'
import { generateSet } from '~/server/utils/manabi-ai'
import { MANABI_COUNTS, type ManabiSet } from '~/types/manabi'

// テーマと問題数を受け取り、AIで問題セットを作って保存する。ログイン不要。
// 返すのは id だけ（ページは /manabi/<id> に移って、共有された人と同じ経路で読み込む）。
export default defineEventHandler(async (event) => {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{ theme?: string; count?: number; isPublic?: boolean }>(event)
  const theme = (body?.theme ?? '').trim()
  if (!theme) throw createError({ statusCode: 400, message: 'テーマを入力してください' })
  if (theme.length > MANABI_THEME_MAX) {
    throw createError({ statusCode: 400, message: `テーマは${MANABI_THEME_MAX}文字以内で入力してください` })
  }
  const count = (MANABI_COUNTS as readonly number[]).includes(Number(body?.count)) ? Number(body!.count) : 10
  // 公開は本人が明示したときだけ（省略・不明な値は非公開＝リンクを知っている人だけ）
  const isPublic = body?.isPublic === true

  const db = getManabiDb(event)
  if (db) await ensureManabiTables(db)
  const ipHash = await clientIpHash(event)
  await assertUnderDailyLimit(db, ipHash)

  const generated = await generateSet(anthropicApiKey as string, theme, count)
  const set: ManabiSet = {
    id: makeSetId(),
    theme,
    title: generated.title,
    level: generated.level,
    questions: generated.questions,
    createdAt: new Date().toISOString(),
    isPublic,
  }
  await saveSet(db, set, ipHash)
  return { id: set.id }
})
