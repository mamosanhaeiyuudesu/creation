/**
 * miyako-file-ids.json の各エントリに対して、
 * OpenAI Vector Store File の attributes に session を設定する一回限りのスクリプト
 *
 * 実行: node scripts/set-miyako-attributes.mjs
 * .env に NUXT_OPENAI_API_KEY と NUXT_MIYAKO_VECTOR_STORE_ID が必要
 */

import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const API_KEY = process.env.NUXT_OPENAI_API_KEY
const VS_ID = process.env.NUXT_MIYAKO_VECTOR_STORE_ID

if (!API_KEY || !VS_ID) {
  console.error('NUXT_OPENAI_API_KEY と NUXT_MIYAKO_VECTOR_STORE_ID を .env に設定してください')
  process.exit(1)
}

const fileIds = JSON.parse(
  readFileSync(resolve(__dirname, '../src/server/data/miyako-file-ids.json'), 'utf-8')
)

const entries = Object.entries(fileIds) // [session, fileId][]
console.log(`${entries.length} 件のファイルを処理します`)

let ok = 0
let ng = 0

for (const [session, fileId] of entries) {
  const res = await fetch(
    `https://api.openai.com/v1/vector_stores/${VS_ID}/files/${fileId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({ attributes: { session } }),
    }
  )

  if (res.ok) {
    console.log(`✓ ${session}`)
    ok++
  } else {
    const err = await res.json().catch(() => ({}))
    console.error(`✗ ${session} (${fileId}): ${err?.error?.message ?? res.status}`)
    ng++
  }
}

console.log(`\n完了: ${ok} 成功 / ${ng} 失敗`)
