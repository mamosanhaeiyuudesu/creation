// タブのアイコン（SVG）とホーム画面アイコン（512pxのPNG）を同じ絵でまとめて作る。
//   node scripts/icons/build.mjs          # 全部
//   node scripts/icons/build.mjs palette  # id に含まれる文字で絞る
// ai-tools は apps/ai-tools/src/public/icon-<id>.svg と apple-touch-icon-<id>.png に出す。
// 各レイアウト（src/layouts/<id>.vue）の useHead から参照する。headless Chrome で PNG にする。
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const pub = resolve(root, 'apps/ai-tools/src/public')

// [id, 絵文字, 上の色, 下の色]（色は scripts/og/targets.json のブランド色と同じ）
const items = [
  ['palette', '🎨', '#e0522b', '#bd3d1a'],
  ['momo', '🍑', '#e07a8a', '#b8536a'],
  ['keiko', '🥋', '#2a3a68', '#10152a'],
  ['news', '📰', '#6f6a64', '#3d3a36'],
  ['guesthouse', '🏡', '#a8875a', '#7a6040'],
  ['farm-manager', '🌾', '#4e9a5a', '#2f7239'],
  ['farm-simulation', '🔭', '#1d6fd6', '#134c9c'],
  ['farm-news', '🚜', '#5f8f3a', '#3b5f22'],
  ['farm-log', '🌿', '#3f9b6e', '#256b4a'],
  ['kaki', '🌳', '#e08a2e', '#b0631a'],
  ['kikigaki', '🗒️', '#2f6f5e', '#1f4d41'],
  ['miyako', '🏝️', '#00a3af', '#00747d'],
  ['ai-manager', '🧭', '#1d6fd6', '#134c9c'],
]

const svg = (id, emoji, c1, c2) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <text x="50" y="52" font-size="58" text-anchor="middle" dominant-baseline="central">${emoji}</text>
</svg>
`

const filters = process.argv.slice(2)
const tmp = mkdtempSync(resolve(tmpdir(), 'icons-'))
export function toPng(svgPath, pngPath, size = 512) {
  // iOS は透明部分を黒く塗るので、PNG は角丸なしの全面塗りにする（角丸は OS がかける）
  const html = resolve(tmp, 'p.html')
  const flat = (execFileSync('cat', [svgPath]).toString()).replace(/rx="\d+"/, 'rx="0"')
  writeFileSync(html, `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${flat}`)
  execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${size},${size}`, `--screenshot=${pngPath}`, pathToFileURL(html).href], { stdio: 'ignore' })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [id, emoji, c1, c2] of items) {
    if (filters.length && !filters.some((f) => id.includes(f))) continue
    mkdirSync(pub, { recursive: true })
    const s = resolve(pub, `icon-${id}.svg`)
    writeFileSync(s, svg(id, emoji, c1, c2))
    toPng(s, resolve(pub, `apple-touch-icon-${id}.png`))
    console.log('ok', id)
  }
  // 本番版（SVGは各アプリが持っている。ホーム画面用のPNGだけ作る）
  for (const app of ['kikigaki', 'manabi']) {
    if (filters.length && !filters.some((f) => `prod-${app}`.includes(f))) continue
    const dir = resolve(root, `apps/production/${app}/src/public`)
    toPng(resolve(dir, 'favicon.svg'), resolve(dir, 'apple-touch-icon.png'), 180)
    console.log('ok prod', app)
  }
}
