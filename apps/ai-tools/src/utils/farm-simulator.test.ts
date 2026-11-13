import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  addDays,
  buildOutlook,
  buildWeatherIndex,
  collectAllowedNumbers,
  findUnknownNumbers,
  junLabel,
  junOf,
  mean,
  outlookFacts,
  parseRecordsCsv,
  seasonOf,
  stdev,
} from './farm-simulator'
import type { FarmRecord, WeatherDay } from './farm-simulator'
import { jmaValue, parseJmaDailyA1, parseJmaForecast } from './farm-simulator-jma'
import { buildDemoCsv } from './farm-simulator-demo'

const NO_CHANGE = { tempShift: 0, priceChange: 0 }

/** 毎日一定の気温の天気（from〜to） */
function flatWeather(from: string, to: string, temp: (date: string) => number): WeatherDay[] {
  const out: WeatherDay[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ date: d, tavg: temp(d), tmax: null, tmin: null, prcp: 0 })
  return out
}

function rec(date: string, qty: number, extra: Partial<FarmRecord> = {}): FarmRecord {
  return { line: 2, date, item: '桃', kind: 'harvest', qty, price: null, dest: '', memo: '', ...extra }
}

describe('CSVの読み込み', () => {
  it('不正な行は行番号つきで知らせて除外する', () => {
    const csv = [
      '日付,品目,種別,数量,単価,出荷先,メモ',
      '2025-07-01,桃,収穫,120,,,',
      '2025/13/40,桃,収穫,100,,,',
      '2025-07-02,桃,もぎ取り,100,,,',
      '2025-07-03,桃,出荷,abc,600,JA,',
      '2025-07-04,,出荷,50,600,JA,',
      '2025-07-05,もも,出荷,"1,200",650,JA,"メモ,カンマ入り"',
    ].join('\n')
    const r = parseRecordsCsv(csv)
    expect(r.records.map((x) => x.line)).toEqual([2, 7])
    expect(r.errors.map((e) => e.line)).toEqual([3, 4, 5, 6])
    expect(r.errors[0]!.message).toContain('日付')
    expect(r.errors[1]!.message).toContain('収穫')
    expect(r.errors[2]!.message).toContain('数量')
    expect(r.errors[3]!.message).toContain('品目')
    // 「もも」は桃にそろえ、カンマ入りの数量とメモも読む
    expect(r.records[1]).toMatchObject({ item: '桃', kind: 'ship', qty: 1200, price: 650, memo: 'メモ,カンマ入り' })
    expect(r.summary).toMatchObject({ rows: 2, from: '2025-07-01', to: '2025-07-05', items: ['桃'] })
    expect(r.summary.missing).toEqual({ price: 1, dest: 1, memo: 1 })
  })

  it('見出しに必要な列が無ければ全体を読まない', () => {
    const r = parseRecordsCsv('日付,品目,数量\n2025-07-01,桃,10')
    expect(r.records).toHaveLength(0)
    expect(r.errors[0]!.message).toContain('種別')
  })

  it('表計算ソフトから貼り付けたタブ区切りや和暦でない日付の書き方も読む', () => {
    const r = parseRecordsCsv('日付\t品目\t種別\t数量\n2025年7月1日\t桃\t収穫\t１２０kg')
    expect(r.errors).toHaveLength(0)
    expect(r.records[0]).toMatchObject({ date: '2025-07-01', qty: 120 })
  })

  it('デモのダミー記録は各品目およそ100行で、混ぜた不正な2行だけが除外される', () => {
    const r = parseRecordsCsv(buildDemoCsv())
    expect(r.errors).toHaveLength(2)
    expect([...r.summary.items].sort()).toEqual(['いちじく', 'キウイ', '柿', '桃'].sort())
    for (const item of r.summary.items) {
      const n = r.records.filter((x) => x.item === item).length
      expect(n).toBeGreaterThanOrEqual(90)
      expect(n).toBeLessThanOrEqual(110)
    }
  })
})

describe('季節と旬', () => {
  it('4月始まりの品目は年をまたいでも同じ季節', () => {
    expect(seasonOf('2026-02-10', 4)).toBe(2025)
    expect(seasonOf('2025-11-10', 4)).toBe(2025)
    expect(junOf('2025-07-15', 1)).toBe(19)
    expect(junLabel(19, 1)).toBe('7月中旬')
    expect(junLabel(0, 4)).toBe('4月上旬')
  })
})

describe('見通し', () => {
  // 3季節とも7/1〜7/20に毎日、合計が 900 / 1000 / 1100 kg
  function threeSeasons(): FarmRecord[] {
    const out: FarmRecord[] = []
    ;[[2023, 900], [2024, 1000], [2025, 1100]].forEach(([y, total]) => {
      for (let d = 1; d <= 20; d++) out.push(rec(`${y}-07-${String(d).padStart(2, '0')}`, total! / 20, { price: 500 }))
    })
    return out
  }
  const flat = buildWeatherIndex(flatWeather('2023-01-01', '2026-11-12', () => 20), [])

  it('量の幅は年ごとの合計の平均±標準偏差', () => {
    const o = buildOutlook({ records: threeSeasons(), item: '桃', kind: 'harvest', targetSeason: 2026, weather: flat, scenario: NO_CHANGE, settings: DEFAULT_SETTINGS })
    expect(o.status).toBe('ok')
    expect(stdev([900, 1000, 1100])).toBe(100)
    expect(o.total).toEqual({ low: 900, mid: 1000, high: 1100 })
    expect(o.seasonsUsed).toEqual([2023, 2024, 2025])
    expect(o.rowsUsed).toBe(60)
    // 旬ごとの見通しを足すと合計になる
    expect(o.bins.reduce((s, b) => s + b.mid, 0)).toBeCloseTo(1000, 6)
    // 毎年同じ気温なら時期はずれない
    expect(o.weather.used).toBe(true)
    expect(o.weather.shiftDays).toBe(0)
    expect(o.timing!.peak).toBe('2026-07-10')
  })

  it('単価の変化で金額だけが動き、量は動かない', () => {
    const args = { records: threeSeasons(), item: '桃', kind: 'harvest' as const, targetSeason: 2026, weather: flat, settings: DEFAULT_SETTINGS }
    const a = buildOutlook({ ...args, scenario: NO_CHANGE })
    const b = buildOutlook({ ...args, scenario: { tempShift: 0, priceChange: 10 } })
    expect(a.price).toEqual({ base: 500, applied: 500 })
    expect(b.price).toEqual({ base: 500, applied: 550 })
    expect(b.total).toEqual(a.total)
    expect(b.revenue!.mid).toBe(550_000)
  })

  it('今季が暖かい（気温のずれ＋）と時期が早まり、寒いと遅れる', () => {
    // 今季（2026）は観測が無い＝平年値＋ずれで見通す
    const w = buildWeatherIndex(flatWeather('2023-01-01', '2025-12-31', () => 20), [])
    const args = { records: threeSeasons(), item: '桃', kind: 'harvest' as const, targetSeason: 2026, weather: w, settings: DEFAULT_SETTINGS }
    const warm = buildOutlook({ ...args, scenario: { tempShift: 2, priceChange: 0 } })
    const cold = buildOutlook({ ...args, scenario: { tempShift: -2, priceChange: 0 } })
    expect(warm.weather.shiftDays).toBeLessThan(0)
    expect(cold.weather.shiftDays).toBeGreaterThan(0)
    expect(warm.weather.normalDays).toBeGreaterThan(0)
    expect(warm.weather.obsDays).toBe(0)
  })

  it('時期のずれは積算温度の差÷1日あたりの積算温度。大きすぎる差は±14日で止める', () => {
    // 過去は毎日20℃（1日10℃・日）、今季は観測が21℃＝差÷10で約14日早い
    const days = flatWeather('2023-01-01', '2025-12-31', () => 20).concat(flatWeather('2026-01-01', '2026-11-12', () => 21))
    const args = { records: threeSeasons(), item: '桃', kind: 'harvest' as const, targetSeason: 2026, settings: DEFAULT_SETTINGS }
    const a = buildOutlook({ ...args, weather: buildWeatherIndex(days, []), scenario: NO_CHANGE })
    expect(a.weather.gddPerDay).toBe(10)
    expect(a.weather.requiredGdd).toBe(1317) // 3/1〜7/10。うるう年の2024年は1日少ない
    expect(a.weather.targetGdd).toBe(1452)
    expect(a.weather.shiftDays).toBe(-14) // (1452−1316.7)÷10＝13.5日
    expect(a.weather.capped).toBe(false)
    // 今季が30℃なら計算上は27日ほど早まるが、14日で止める
    const hot = flatWeather('2023-01-01', '2025-12-31', () => 20).concat(flatWeather('2026-01-01', '2026-11-12', () => 30))
    const b = buildOutlook({ ...args, weather: buildWeatherIndex(hot, []), scenario: NO_CHANGE })
    expect(b.weather.shiftDays).toBe(-14)
    expect(b.weather.capped).toBe(true)
  })

  it('記録がたりない品目は見通しを出さない（基準は設定で変えられる）', () => {
    const recs = threeSeasons().filter((r) => r.date.startsWith('2025'))
    const o = buildOutlook({ records: recs, item: '桃', kind: 'harvest', targetSeason: 2026, weather: flat, scenario: NO_CHANGE, settings: DEFAULT_SETTINGS })
    expect(o.status).toBe('insufficient')
    expect(o.reason).toContain('記録がたりません')
    expect(o.total).toBeNull()
    const loose = buildOutlook({ records: recs, item: '桃', kind: 'harvest', targetSeason: 2026, weather: flat, scenario: NO_CHANGE, settings: { minSeasons: 1, minRows: 5 } })
    expect(loose.status).toBe('ok')
  })

  it('天気が取れなくても量の見通しは出す（時期の補正だけ外して理由を返す）', () => {
    const none = buildWeatherIndex([], [])
    const o = buildOutlook({ records: threeSeasons(), item: '桃', kind: 'harvest', targetSeason: 2026, weather: none, scenario: { tempShift: 2, priceChange: 0 }, settings: DEFAULT_SETTINGS })
    expect(o.status).toBe('ok')
    expect(o.total!.mid).toBe(1000)
    expect(o.weather.used).toBe(false)
    expect(o.weather.reason).toBe('天気のデータがありません')
    expect(o.weather.shiftDays).toBe(0)
  })

  it('平均と標準偏差', () => {
    expect(mean([1, 2, 3])).toBe(2)
    expect(stdev([5])).toBe(0)
  })
})

describe('AIの文章の検査', () => {
  const facts = { 量: { low: 1830, mid: 2060, high: 2290 }, 山: '7月12日', 季節: [2023, 2024, 2025], ずれ: -3 }
  const allowed = collectAllowedNumbers(facts)

  it('渡した数字だけなら合格（カンマ・全角・マイナスの向きは問わない）', () => {
    expect(findUnknownNumbers('今年は1,830〜2,290kgの見込みで、山は７月12日ごろ。平均より3日早めです。', allowed)).toEqual([])
  })

  it('渡していない数字が出たら不合格', () => {
    expect(findUnknownNumbers('去年より15%多く、2,100kgほどです。', allowed)).toEqual(['15', '2100'])
  })

  it('漢数字で書いた量も不合格', () => {
    expect(findUnknownNumbers('去年より二割ほど多い見込みです。', allowed)).toEqual(['二'])
    expect(findUnknownNumbers('一方で、山の時期は早まりそうです。', allowed)).toEqual([])
  })

  it('画面に出す事実から許可する数字を作る', () => {
    const o = buildOutlook({
      records: [2023, 2024, 2025].flatMap((y) => Array.from({ length: 10 }, (_, i) => rec(`${y}-07-${String(i + 5).padStart(2, '0')}`, 50))),
      item: '桃', kind: 'harvest', targetSeason: 2026,
      weather: buildWeatherIndex([], []), scenario: NO_CHANGE, settings: DEFAULT_SETTINGS,
    })
    const a = collectAllowedNumbers(outlookFacts(o, NO_CHANGE))
    expect(a.has('500')).toBe(true)
    expect(a.has('2026')).toBe(true)
  })
})

describe('気象庁のデータ', () => {
  it('表の記号を読み分ける', () => {
    expect(jmaValue('28.0')).toBe(28)
    expect(jmaValue('27.5 )')).toBe(27.5)
    expect(jmaValue('12.1 ]')).toBeNull()
    expect(jmaValue('///')).toBeNull()
    expect(jmaValue('×')).toBeNull()
    expect(jmaValue('--', { noneIsZero: true })).toBe(0)
  })

  it('日別値のHTMLから日ごとの気温と降水量を読み、まだ来ていない日は返さない', () => {
    const row = (day: number, vals: string[]) =>
      `<tr class="mtx" style="text-align:right;"><td style="white-space:nowrap"><div class="a_print"><a href="x">${day}</a></div></td>${vals.map((v) => `<td class=data_0_0>${v}</td>`).join('')}</tr>`
    const html = `<table><tr class="mtx"><th>日</th></tr>${row(1, ['0.0', '0.0', '0.0', '28.0', '35.4', '22.5', '73'])}${row(2, ['--', '--', '--', '27.0 )', '33.0', '21.0', '70'])}${row(3, ['///', '///', '///', '///', '///', '///', '///'])}</table>`
    expect(parseJmaDailyA1(html, 2025, 7)).toEqual([
      { date: '2025-07-01', prcp: 0, tavg: 28, tmax: 35.4, tmin: 22.5 },
      { date: '2025-07-02', prcp: 0, tavg: 27, tmax: 33, tmin: 21 },
    ])
  })

  it('週間予報のJSONから和歌山の最高・最低を読み、明日の欠けは短期予報で埋める', () => {
    const json = [
      { timeSeries: [{ timeDefines: ['2026-11-14T00:00:00+09:00', '2026-11-14T09:00:00+09:00'], areas: [{ area: { code: '65042' }, temps: ['13', '22'] }] }] },
      {
        timeSeries: [{
          timeDefines: ['2026-11-14T00:00:00+09:00', '2026-11-15T00:00:00+09:00'],
          areas: [{ area: { code: '65042' }, tempsMin: ['', '16'], tempsMax: ['', '19'] }],
        }],
      },
    ]
    expect(parseJmaForecast(json)).toEqual([
      { date: '2026-11-14', tmax: 22, tmin: 13, tavg: 17.5, prcp: null },
      { date: '2026-11-15', tmax: 19, tmin: 16, tavg: 17.5, prcp: null },
    ])
    expect(parseJmaForecast(null)).toEqual([])
  })
})
