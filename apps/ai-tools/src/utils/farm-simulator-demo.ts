// デモ用のダミー記録（farm-simulator）。かつらぎ町で多い4品目（桃・柿・いちじく・キウイ）。
// 実在の農家の数字ではない。種つき乱数で作るので、毎回同じCSVになる（テストでも使う）。
//
// 仕様では「1年分・各100行ほど」だったが、予測の幅を「年ごとのばらつき」から出すには2季節以上が要るので、
// 各品目およそ100行のまま3季節（2023〜2025年）に分けている。
// 読み込みの動きを見せるため、わざと不正な行を2行だけ混ぜている（行番号つきで除外される）。

export const DEMO_SEASONS = [2023, 2024, 2025] as const

interface DemoItem {
  item: string
  /** 収穫の山の日（MM-DD） */
  center: string
  /** 山から前後に何日まで取るか */
  halfWidth: number
  /** 季節の合計（kg、平年） */
  total: number
  /** 出荷の単価（円/kg、平年） */
  price: number
  harvestRows: number
  shipRows: number
  /** 収穫のあと追熟してから出す（キウイ）。出荷は収穫の終わりから何日後に始め、何日かけて出すか */
  ripen?: { after: number; days: number }
}

const ITEMS: DemoItem[] = [
  { item: '桃', center: '07-12', halfWidth: 20, total: 6200, price: 640, harvestRows: 17, shipRows: 16 },
  { item: '柿', center: '11-02', halfWidth: 24, total: 8400, price: 270, harvestRows: 17, shipRows: 16 },
  { item: 'いちじく', center: '09-08', halfWidth: 30, total: 2600, price: 760, harvestRows: 17, shipRows: 16 },
  { item: 'キウイ', center: '11-03', halfWidth: 9, total: 4100, price: 480, harvestRows: 12, shipRows: 21, ripen: { after: 14, days: 110 } },
]

/** 季節ごとの違い（ダミー）。時期のずれ（日）と量の倍率 */
const SEASON_DIFF: Record<number, { shift: number; scale: number }> = {
  2023: { shift: 0, scale: 1.0 },
  2024: { shift: -4, scale: 0.86 },
  2025: { shift: 3, scale: 1.09 },
}

const DESTS = ['JA', 'JA', '市場', '直売所', 'ネット販売']

function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function addDays(y: number, mmdd: string, n: number): string {
  const [m, d] = mmdd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m! - 1, d! + n))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

/** 山が真ん中にくる重み（なだらかな釣り鐘） */
function bell(x: number): number {
  return Math.exp(-(x * x) / 0.32)
}

export function buildDemoCsv(): string {
  const rand = rng(20261113)
  const lines: string[] = ['日付,品目,種別,数量,単価,出荷先,メモ']
  for (const it of ITEMS) {
    for (const season of DEMO_SEASONS) {
      const diff = SEASON_DIFF[season]!
      const total = it.total * diff.scale * (0.97 + rand() * 0.06)
      // 収穫の日と量
      const days: number[] = []
      for (let i = 0; i < it.harvestRows; i++) {
        const pos = -1 + (2 * i) / (it.harvestRows - 1)
        days.push(Math.round(pos * it.halfWidth + diff.shift + (rand() - 0.5) * 2))
      }
      const weights = days.map((_, i) => bell(-1 + (2 * i) / (it.harvestRows - 1)) * (0.8 + rand() * 0.4))
      const wsum = weights.reduce((s, w) => s + w, 0)
      const harvest = days.map((d, i) => ({ date: addDays(season, it.center, d), qty: Math.max(5, Math.round((total * weights[i]!) / wsum)) }))
      for (const h of harvest) lines.push(`${h.date},${it.item},収穫,${h.qty},,,ダミー`)

      // 出荷（選果で1割ほど減る）
      const shipTotal = harvest.reduce((s, h) => s + h.qty, 0) * 0.9
      if (it.ripen) {
        const firstShip = days.at(-1)! + it.ripen.after
        for (let i = 0; i < it.shipRows; i++) {
          const d = firstShip + Math.round((i * it.ripen.days) / (it.shipRows - 1))
          const qty = Math.round((shipTotal / it.shipRows) * (0.8 + rand() * 0.4))
          const price = Math.round((it.price * (0.95 + (i / it.shipRows) * 0.15) * (0.95 + rand() * 0.1)) / 10) * 10
          lines.push(`${addDays(season, it.center, d)},${it.item},出荷,${qty},${price},${DESTS[Math.floor(rand() * DESTS.length)]},ダミー`)
        }
      } else {
        // 収穫の翌日に出す。最後の収穫ぶんは1つ前の出荷にまとめる
        for (let i = 0; i < it.shipRows; i++) {
          const src = i === it.shipRows - 1 ? harvest.slice(i) : [harvest[i]!]
          const qty = Math.round(src.reduce((s, h) => s + h.qty, 0) * 0.9 * (0.97 + rand() * 0.06))
          // 走り（はしり）は高く、山の時期は安め
          const pos = -1 + (2 * i) / (it.shipRows - 1)
          const price = Math.round((it.price * (1 + 0.18 * Math.abs(pos)) * (0.94 + rand() * 0.12)) / 10) * 10
          lines.push(`${addDays(season, it.center, days[i]! + 1)},${it.item},出荷,${qty},${price},${DESTS[Math.floor(rand() * DESTS.length)]},ダミー`)
        }
      }
    }
  }
  // わざと混ぜる不正な行（読み込みで除外されるところを見せるため）
  lines.push('2025/13/02,桃,収穫,120,,,ダミー（日付の誤り）')
  lines.push('2025-08-20,いちじく,収穫,,,,ダミー（数量の空欄）')
  return lines.join('\n') + '\n'
}
