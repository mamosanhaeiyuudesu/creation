/**
 * miyako「直近の傾向」のバズ度の比較対象（過去3年の定例会の本文）を D1 に入れる、初回だけのスクリプト。
 *
 * 最初の前処理パイプラインで Vector Store に入れた会期（src/server/data/miyako-file-ids.json）の本文を
 * Vector Store から取り出し、cron と同じ整形（空白・改行を詰める）をして miyako_texts に入れる。
 * cron（Worker）側でやらないのは CPU 時間のため（1会期ぶんの本文の受け取りと整形で数ms かかり、
 * Free プランの上限10msでは1回の呼び出しで1会期がやっと）。これ以降の会期は cron が自分で入れる。
 *
 * 実行（apps/ai-tools で）:
 *   node scripts/miyako-trends-backfill.mjs --remote     # 本番の D1（取り込み中の数秒は D1 が応答しなくなる）
 *   node scripts/miyako-trends-backfill.mjs --local      # wrangler dev 用のローカル D1
 *   node scripts/miyako-trends-backfill.mjs --dry-run    # SQL ファイルを書き出すだけ
 *   オプション: --since 2023-01-01（既定は3年前の1月1日。これ以降に始まった定例会を入れる）
 * .env に NUXT_OPENAI_API_KEY と NUXT_MIYAKO_VECTOR_STORE_ID（vs_ で始まるID）が必要
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
config({ path: resolve(root, '.env') })

// src/server/utils/miyako-trends.ts の MIYAKO_TEXT_CHUNK_CHARS と同じ値にすること
const CHUNK_CHARS = 25_000

const args = process.argv.slice(2)
const target = args.includes('--remote') ? '--remote' : args.includes('--local') ? '--local' : null
const dryRun = args.includes('--dry-run')
const sinceArg = args[args.indexOf('--since') + 1]
const since = args.includes('--since') ? sinceArg : `${new Date().getFullYear() - 3}-01-01`

if (!target && !dryRun) {
  console.error('--remote / --local / --dry-run のどれかを指定してください')
  process.exit(1)
}

const API_KEY = process.env.NUXT_OPENAI_API_KEY
const VS_ID = process.env.NUXT_MIYAKO_VECTOR_STORE_ID
if (!API_KEY || !VS_ID?.startsWith('vs_')) {
  console.error('.env の NUXT_OPENAI_API_KEY と NUXT_MIYAKO_VECTOR_STORE_ID（vs_ で始まるID）を確認してください')
  process.exit(1)
}

// src/server/utils/miyako-trends.ts の normalizeMinutesText と同じ処理（変えるときは両方そろえる）
function normalizeMinutesText(raw) {
  return raw
    .replace(/<PARSED TEXT FOR PAGE: \d+ \/ \d+>/g, '')
    .replace(/^====[^\n]*====/, '')
    .replace(/\s+/g, '')
}

const sql = (s) => `'${String(s).replaceAll("'", "''")}'`

// 会期の日付は miyako-features.json のキー（例: 令和7年 第9回 定例会 2025-12-03〜2025-12-17）から取る
const features = JSON.parse(readFileSync(resolve(root, 'src/public/data/miyako-features.json'), 'utf-8'))
const fileIds = JSON.parse(readFileSync(resolve(root, 'src/server/data/miyako-file-ids.json'), 'utf-8'))

const sessions = Object.keys(features)
  .map((k) => {
    const m = k.match(/^(.+?(定例会|臨時会))\s+(\d{4}-\d{2}-\d{2})(?:〜(\d{4}-\d{2}-\d{2}))?/)
    if (!m) return null
    const key = m[1].replace(/\s/g, '')
    return { key, label: m[1], kind: m[2], heldFrom: m[3], heldTo: m[4] ?? m[3], fileId: fileIds[key] }
  })
  .filter((s) => s && s.kind === '定例会' && s.fileId && s.heldFrom >= since)
  .sort((a, b) => a.heldFrom.localeCompare(b.heldFrom))

console.log(`${since} 以降の定例会 ${sessions.length}件の本文を取り出します`)

const lines = [readFileSync(resolve(root, 'src/server/db/068_miyako_trends.sql'), 'utf-8')]
for (const s of sessions) {
  const res = await fetch(`https://api.openai.com/v1/vector_stores/${VS_ID}/files/${s.fileId}/content`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  const data = await res.json()
  if (!res.ok || data.has_more) {
    console.error(`✗ ${s.key}: ${data?.error?.message ?? (data.has_more ? '本文が複数ページに分かれている' : res.status)}`)
    process.exit(1)
  }
  const text = normalizeMinutesText(data.data.map((p) => p.text ?? '').join('\n'))
  console.log(`✓ ${s.key}（${s.heldFrom}）${text.length.toLocaleString()}字`)

  // 既に分析済みの会期は status を巻き戻さない。
  // ※ CASE 式は使わないこと: wrangler の SQL 分割は「CASE」を複合文の始まりと見て、直後に空白か ; が
  //   続く「END」まで区切らないため、`END,` と書くと後ろの文が全部1つにつながり SQLITE_TOOBIG になる（実測）
  lines.push(
    `INSERT OR IGNORE INTO miyako_sessions (session_key, label, kind, held_from, held_to, file_id, chars, status) VALUES (${[s.key, s.label, s.kind, s.heldFrom, s.heldTo, s.fileId].map(sql).join(', ')}, ${text.length}, 'stored');`,
    `UPDATE miyako_sessions SET label = ${sql(s.label)}, held_from = ${sql(s.heldFrom)}, held_to = ${sql(s.heldTo)}, file_id = ${sql(s.fileId)}, chars = ${text.length}, error = '', updated_at = datetime('now') WHERE session_key = ${sql(s.key)};`,
    `UPDATE miyako_sessions SET status = 'stored' WHERE session_key = ${sql(s.key)} AND status != 'analyzed';`,
    `DELETE FROM miyako_texts WHERE session_key = ${sql(s.key)};`
  )
  for (let i = 0, seq = 0; i < text.length; i += CHUNK_CHARS, seq++) {
    lines.push(`INSERT INTO miyako_texts (session_key, seq, body) VALUES (${sql(s.key)}, ${seq}, ${sql(text.slice(i, i + CHUNK_CHARS))});`)
  }
}

const file = join(mkdtempSync(join(tmpdir(), 'miyako-backfill-')), 'backfill.sql')
writeFileSync(file, lines.join('\n') + '\n')
console.log(`SQL を書き出しました: ${file}`)
if (dryRun) process.exit(0)

const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'whisper-db', target, '--yes', '--file', file], {
  cwd: root,
  stdio: 'inherit',
})
process.exit(r.status ?? 1)
