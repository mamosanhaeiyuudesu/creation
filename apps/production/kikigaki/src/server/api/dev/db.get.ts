// ローカル dev 専用の確認口。テーブルの用意と中身を見る。
//
// ログインが要る口（/api/me 以下）はブラウザからしか叩けないので、
// D1 まわりのセットアップと、webhook が書いた契約状態を curl で確かめられるようにしてある。
// `import.meta.dev` が false の本番では 404 を返す（口そのものを出さない）。
//
//   curl 'http://localhost:3009/api/dev/db'                      ← テーブル一覧
//   curl 'http://localhost:3009/api/dev/db?table=subscriptions'  ← 中身（devのみ）

import { requireDb, ensureTables } from '~/server/utils/db'

/** 覗けるテーブルは決め打ちにする（任意のSQLを撃てる口にしない） */
const VIEWABLE = ['users', 'records', 'glossary', 'subscriptions', 'stripe_events', 'usage_monthly']

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404, message: 'Not Found' })

  const db = requireDb(event)
  await ensureTables(db)

  const table = String(getQuery(event).table ?? '')
  if (table) {
    if (!VIEWABLE.includes(table)) throw createError({ statusCode: 400, message: 'unknown table' })
    const res = await db.prepare(`SELECT * FROM ${table} LIMIT 50`).all()
    return { table, rows: res?.results ?? [] }
  }

  const res = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
  return { tables: (res?.results ?? []).map((r: any) => r.name) }
})
