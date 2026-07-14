import { getSessionUser } from '~/server/utils/auth'
import { encryptComment } from '~/server/utils/encrypt'

// ログイン中ユーザーの既存の平文データ（app_history 全体・hagemashi の相談/プロフィール等）を暗号化する。
// 既に暗号化済み（enc: 接頭辞あり）の値はスキップするため、何度呼び出しても安全。
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const isPlain = (v: string | null | undefined): v is string => !!v && !v.startsWith('enc:')

  const result = { appHistory: 0, consultMessages: 0, profiles: 0, kokoro: 0, moods: 0, achievements: 0 }

  const historyRows = await db
    .prepare('SELECT id, text, title, notes FROM app_history WHERE user_id = ?')
    .bind(user.id)
    .all<{ id: string; text: string; title: string; notes: string | null }>()

  for (const r of historyRows.results ?? []) {
    const needsText = isPlain(r.text)
    const needsTitle = isPlain(r.title)
    const needsNotes = isPlain(r.notes)
    if (!needsText && !needsTitle && !needsNotes) continue

    const text = needsText ? await encryptComment(event, r.text) : r.text
    const title = needsTitle ? await encryptComment(event, r.title) : r.title
    const notes = needsNotes ? await encryptComment(event, r.notes as string) : r.notes

    await db
      .prepare('UPDATE app_history SET text = ?, title = ?, notes = ? WHERE id = ? AND user_id = ?')
      .bind(text, title, notes, r.id, user.id)
      .run()
    result.appHistory++
  }

  const consultRows = await db
    .prepare('SELECT id, content FROM hagemashi_consult_messages WHERE user_id = ?')
    .bind(user.id)
    .all<{ id: string; content: string }>()

  for (const r of consultRows.results ?? []) {
    if (!isPlain(r.content)) continue
    const content = await encryptComment(event, r.content)
    await db
      .prepare('UPDATE hagemashi_consult_messages SET content = ? WHERE id = ? AND user_id = ?')
      .bind(content, r.id, user.id)
      .run()
    result.consultMessages++
  }

  const jsonTables: { table: string; key: 'profiles' | 'kokoro' | 'moods' | 'achievements' }[] = [
    { table: 'hagemashi_profiles', key: 'profiles' },
    { table: 'hagemashi_kokoro', key: 'kokoro' },
    { table: 'hagemashi_moods', key: 'moods' },
    { table: 'hagemashi_achievements', key: 'achievements' },
  ]

  for (const { table, key } of jsonTables) {
    const row = await db
      .prepare(`SELECT data FROM ${table} WHERE user_id = ?`)
      .bind(user.id)
      .first() as { data: string } | null
    if (!row || !isPlain(row.data)) continue

    const data = await encryptComment(event, row.data)
    await db.prepare(`UPDATE ${table} SET data = ? WHERE user_id = ?`).bind(data, user.id).run()
    result[key]++
  }

  return result
})
