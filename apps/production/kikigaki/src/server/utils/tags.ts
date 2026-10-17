// タグの一覧・名前の変更・削除（本人の議事録だけが対象）。
//
// ★変更と削除は、そのタグが付いた議事録をまとめて書き換える。議事録の数だけ問い合わせを積むと
//   Workers の subrequest 上限に当たるので、読み出し1回＋書き込み1回（batch）で済ませる。
//   タグは議事録本体（minutes）と一覧用（record_tags）の両方に入っているので、両方を書き換える。

import type { H3Event } from 'h3'
import { requireDb, ensureTables } from '~/server/utils/db'
import { decryptText, encryptText } from '~/server/utils/encrypt'
import { decryptTags, normalizeMinutes, tagsStatement } from '~/server/utils/minutes'
import { countTags, normalizeTag, renameTagIn } from '~/utils/tags'

export async function listUserTags(event: H3Event, userId: string): Promise<{ tag: string; count: number }[]> {
  const db = requireDb(event)
  await ensureTables(db)
  const res = await db.prepare('SELECT tags FROM record_tags WHERE user_id = ?').bind(userId).all()
  const rows = (res?.results ?? []) as { tags: string }[]
  const records = await Promise.all(rows.map(async (r) => ({ tags: await decryptTags(event, r.tags) })))
  return countTags(records)
}

/**
 * タグの名前を変える。to が空なら、そのタグを全部の議事録から外す（削除）。
 * to が既にあるタグなら1つにまとまる。戻り値は書き換えた議事録の数。
 */
export async function renameUserTag(event: H3Event, userId: string, from: string, to: string): Promise<number> {
  const source = normalizeTag(from)
  if (!source) throw createError({ statusCode: 400, message: '変えるタグを指定してください。' })

  const db = requireDb(event)
  await ensureTables(db)
  const res = await db
    .prepare(
      `SELECT r.id, r.minutes, t.tags FROM record_tags t
       JOIN records r ON r.id = t.record_id AND r.user_id = t.user_id
       WHERE t.user_id = ?`
    )
    .bind(userId)
    .all()
  const rows = (res?.results ?? []) as { id: string; minutes: string; tags: string }[]

  const statements: any[] = []
  for (const row of rows) {
    const tags = await decryptTags(event, row.tags)
    if (!tags.includes(source)) continue

    let parsed: any = null
    try {
      parsed = JSON.parse(await decryptText(event, row.minutes ?? ''))
    } catch {
      parsed = null
    }
    // 議事録本体が読めないものは触らない（壊れた中身を空の議事録で上書きしないため）
    if (!parsed) continue
    const minutes = normalizeMinutes(parsed)
    minutes.tags = renameTagIn(minutes.tags, source, to)

    statements.push(
      db
        .prepare('UPDATE records SET minutes = ? WHERE id = ? AND user_id = ?')
        .bind(await encryptText(event, JSON.stringify(minutes)), row.id, userId),
      await tagsStatement(db, event, userId, row.id, minutes.tags)
    )
  }
  if (statements.length) await db.batch(statements)
  return statements.length / 2
}
