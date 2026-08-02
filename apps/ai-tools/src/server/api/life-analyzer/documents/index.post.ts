import { ensureLifeTables, insertDocument, loadDocument, requireLifeDb, requireLifeUser } from '~/server/utils/life-analyzer'
import { generateTitle } from '~/server/utils/life-analyzer-ai'

// 貼り付けられたテキストを保存する。名前は AI が付ける（失敗しても保存は通す）。
const MAX_CHARS = 200000

export default defineEventHandler(async (event) => {
  const user = await requireLifeUser(event)
  const db = requireLifeDb(event)
  await ensureLifeTables(db)

  const body = await readBody<{ text?: string; title?: string }>(event)
  const text = (body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: 'テキストを入力してください' })
  if (text.length > MAX_CHARS) {
    throw createError({ statusCode: 413, message: `テキストが長すぎます（${MAX_CHARS.toLocaleString()}文字まで）` })
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  // 名前は付けられなくても記録自体は失わせない。日付ベースの名前でフォールバックする。
  const aiTitle = anthropicApiKey ? await generateTitle(anthropicApiKey as string, text) : ''
  const title = (body?.title ?? '').trim() || aiTitle || `記録 ${new Date().toISOString().slice(0, 10)}`

  const id = crypto.randomUUID()
  await insertDocument(event, db, user.id, { id, title, content: text })
  return await loadDocument(event, db, user.id, id)
})
