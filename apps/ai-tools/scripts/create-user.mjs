#!/usr/bin/env node
// 新規アカウントの発行用。アプリからの新規登録は廃止したので、アカウントはこれで作る。
//
//   node scripts/create-user.mjs <username> <password> [--admin] [--local]
//
// password_hash は PBKDF2（server/utils/auth.ts と同じ形式）なので SQL だけでは作れない。
// このスクリプトは INSERT 文を組み立てて表示するだけで、DB には書き込まない。
// 出力された wrangler コマンドを自分で実行すること。

const args = process.argv.slice(2)
const flags = args.filter((a) => a.startsWith('--'))
const [username, password] = args.filter((a) => !a.startsWith('--'))
const role = flags.includes('--admin') ? 'admin' : 'foster'
const target = flags.includes('--local') ? '--local' : '--remote'

if (!username || !password) {
  console.error('使い方: node scripts/create-user.mjs <username> <password> [--admin] [--local]')
  process.exit(1)
}
if (username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9_]+$/.test(username)) {
  console.error('ユーザー名は半角英数字とアンダースコアの3〜30文字で指定してください')
  process.exit(1)
}
if (password.length < 6) {
  console.error('パスワードは6文字以上で指定してください')
  process.exit(1)
}

// server/utils/auth.ts の hashPassword と同じ処理
const encoder = new TextEncoder()
const salt = crypto.getRandomValues(new Uint8Array(16))
const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
  keyMaterial,
  256
)
const passwordHash = btoa(
  JSON.stringify({ salt: Array.from(salt), hash: Array.from(new Uint8Array(bits)) })
)

const sql =
  `INSERT INTO users (id, username, password_hash, role) VALUES ` +
  `('${crypto.randomUUID()}', '${username}', '${passwordHash}', '${role}');`

console.log(`\n-- ${username}（role=${role}）\n${sql}\n`)
console.log('以下を apps/ai-tools/ で実行:\n')
console.log(`wrangler d1 execute whisper-db ${target} --command "${sql.replace(/"/g, '\\"')}"\n`)
