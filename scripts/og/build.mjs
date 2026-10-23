// URLを共有したときのサムネイル画像（1200x630）をまとめて作り直す。
//   node scripts/og/build.mjs            # 全部
//   node scripts/og/build.mjs kaito nikki # id に含まれる文字で絞る
// targets.json の1件ごとに template.html を headless Chrome で開いて撮る（キキガキの design/og.html と同じ方式）。
// Noto Sans JP などをネットから読むので、つながった状態で実行すること。
// 出力先の拡張子が .jpg なら、撮った PNG を sips で JPEG に変換する（写真入りは PNG だと1MB近くになるため）。
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const template = pathToFileURL(resolve(here, 'template.html')).href

const targets = JSON.parse(readFileSync(resolve(here, 'targets.json'), 'utf8'))
const filters = process.argv.slice(2)
const picked = filters.length ? targets.filter((t) => filters.some((f) => t.id.includes(f))) : targets
if (!picked.length) {
  console.error('該当する id がありません:', filters.join(' '))
  process.exit(1)
}

for (const t of picked) {
  const params = { ...t.params }
  // 写真はリポジトリ直下からの相対パスで書く。テンプレートからは file:// の絶対URLで読ませる
  if (params.photo) params.photo = pathToFileURL(resolve(root, params.photo)).href
  const out = resolve(root, t.out)
  mkdirSync(dirname(out), { recursive: true })
  const asJpeg = out.endsWith('.jpg')
  const shot = asJpeg ? resolve(tmpdir(), `og-${t.id.replace(/\W/g, '_')}.png`) : out

  execFileSync(CHROME, [
    '--headless=new',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--virtual-time-budget=8000',
    `--screenshot=${shot}`,
    `${template}#${encodeURIComponent(JSON.stringify(params))}`,
  ], { stdio: 'ignore' })

  if (asJpeg) {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', shot, '--out', out], { stdio: 'ignore' })
    rmSync(shot, { force: true })
  }
  console.log(`${t.id.padEnd(28)} → ${t.out} (${Math.round(statSync(out).size / 1024)}KB)`)
}
