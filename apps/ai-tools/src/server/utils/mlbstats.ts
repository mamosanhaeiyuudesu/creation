const MLB_API = 'https://statsapi.mlb.com/api/v1'

export const MLB_DEBUT_SEASONS: Record<string, number> = {
  '660271': 2018,  // 大谷翔平
  '808967': 2024,  // 山本由伸
  '694973': 2023,  // 千賀滉大
  '694297': 2024,  // 今永昇太
  '808963': 2025,  // 佐々木朗希
  '673548': 2022,  // 鈴木誠也
  '807799': 2023,  // 吉田正尚
  '666971': 2021,  // ラーズ・ヌートバー
  '506433': 2012,  // ダルビッシュ有
  '579328': 2019,  // 菊池雄星
  '673513': 2024,  // 松井裕樹
  '672960': 2026,  // 岡本和真
  '808959': 2026,  // 村上宗隆
  '837227': 2026,  // 今井達也
}

interface MlbSplit {
  season?: string
  date?: string
  stat: Record<string, unknown>
}

interface MlbStatsResponse {
  stats?: Array<{ splits: MlbSplit[] }>
}

interface MlbLeagueResponse {
  stats?: Array<{ splits: Array<{ stat: Record<string, unknown> }> }>
}

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return isNaN(n) ? null : n
}

function pct(num: number, den: number): number | null {
  return den > 0 ? Math.round((num / den) * 1000) / 10 : null
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

async function fetchPlayerSplits(mlbId: string, params: Record<string, string>): Promise<MlbSplit[]> {
  const qs = new URLSearchParams(params).toString()
  const json = await fetchJson<MlbStatsResponse>(`${MLB_API}/people/${mlbId}/stats?${qs}`)
  return json?.stats?.[0]?.splits ?? []
}

// ── stat object → batter row ──
function parseBatter(s: Record<string, unknown>, playerId: string, season: number, date: string) {
  const pa = parseNum(s.plateAppearances) ?? 0
  return {
    playerId, season, date,
    avg: parseNum(s.avg),
    obp: parseNum(s.obp),
    slg: parseNum(s.slg),
    ops: parseNum(s.ops),
    bbPct: pct(parseNum(s.baseOnBalls) ?? 0, pa),
    kPct: pct(parseNum(s.strikeOuts) ?? 0, pa),
    hr: parseNum(s.homeRuns),
    rbi: parseNum(s.rbi),
    hits: parseNum(s.hits),
    runs: parseNum(s.runs),
    stolenBases: parseNum(s.stolenBases),
  }
}

// ── stat object → pitcher row ──
function parsePitcher(s: Record<string, unknown>, playerId: string, season: number, date: string) {
  const bf = parseNum(s.battersFaced) ?? 0
  const ip = parseNum(s.inningsPitched)
  return {
    playerId, season, date,
    era: parseNum(s.era),
    whip: parseNum(s.whip),
    kPct: pct(parseNum(s.strikeOuts) ?? 0, bf),
    bbPct: pct(parseNum(s.baseOnBalls) ?? 0, bf),
    wins: parseNum(s.wins),
    losses: parseNum(s.losses),
    strikeouts: parseNum(s.strikeOuts),
    inningsPitched: ip,
    saves: parseNum(s.saves),
    holds: parseNum(s.holds),
  }
}

// ── inningsPitched "6.2" → アウト数 ──
function ipToOuts(ip: unknown): number {
  const str = String(ip ?? '0')
  const [full, partial] = str.split('.').map(Number)
  return (full || 0) * 3 + (partial || 0)
}

// ── 現シーズン集計 ──
export async function fetchBatterSeason(mlbId: string, season: number) {
  const splits = await fetchPlayerSplits(mlbId, {
    stats: 'season', season: String(season), sportId: '1', group: 'hitting',
  })
  const s = splits[0]
  return s ? parseBatter(s.stat, mlbId, season, '') : null
}

export async function fetchPitcherSeason(mlbId: string, season: number) {
  const splits = await fetchPlayerSplits(mlbId, {
    stats: 'season', season: String(season), sportId: '1', group: 'pitching',
  })
  const s = splits[0]
  return s ? parsePitcher(s.stat, mlbId, season, '') : null
}

// ── 年度別 ──
export async function fetchBatterYearly(mlbId: string, fromSeason: number, toSeason: number) {
  const splits = await fetchPlayerSplits(mlbId, {
    stats: 'yearByYear', sportId: '1', group: 'hitting',
  })
  return splits
    .filter(s => { const yr = Number(s.season); return yr >= fromSeason && yr <= toSeason })
    .map(s => parseBatter(s.stat, mlbId, Number(s.season), ''))
}

export async function fetchPitcherYearly(mlbId: string, fromSeason: number, toSeason: number) {
  const splits = await fetchPlayerSplits(mlbId, {
    stats: 'yearByYear', sportId: '1', group: 'pitching',
  })
  return splits
    .filter(s => { const yr = Number(s.season); return yr >= fromSeason && yr <= toSeason })
    .map(s => parsePitcher(s.stat, mlbId, Number(s.season), ''))
}

// ── ゲームログ → 日次累積スナップショット ──
export async function fetchBatterGameLog(mlbId: string, season: number) {
  const splits = await fetchPlayerSplits(mlbId, {
    stats: 'gameLog', season: String(season), sportId: '1', group: 'hitting',
  })

  let h = 0, ab = 0, bb = 0, hbp = 0, sf = 0, so = 0, pa = 0, tb = 0
  let hr = 0, rbi = 0, runs = 0, sb = 0
  const results: ReturnType<typeof parseBatter>[] = []

  for (const game of splits) {
    const s = game.stat
    const gh = parseNum(s.hits) ?? 0
    const gAb = parseNum(s.atBats) ?? 0
    const gBb = parseNum(s.baseOnBalls) ?? 0
    const gHbp = parseNum(s.hitByPitch) ?? 0
    const gSf = parseNum(s.sacFlies) ?? 0
    const gSo = parseNum(s.strikeOuts) ?? 0
    const gPa = parseNum(s.plateAppearances) ?? 0
    const gDbl = parseNum(s.doubles) ?? 0
    const gTri = parseNum(s.triples) ?? 0
    const gHr = parseNum(s.homeRuns) ?? 0
    const gRbi = parseNum(s.rbi) ?? 0
    const gRuns = parseNum(s.runs) ?? 0
    const gSb = parseNum(s.stolenBases) ?? 0

    h += gh; ab += gAb; bb += gBb; hbp += gHbp; sf += gSf; so += gSo; pa += gPa
    tb += (gh - gDbl - gTri - gHr) + 2 * gDbl + 3 * gTri + 4 * gHr
    hr += gHr; rbi += gRbi; runs += gRuns; sb += gSb

    const date = game.date ?? ''
    if (!date) continue

    const avg = ab > 0 ? Math.round(h / ab * 1000) / 1000 : null
    const obpDen = ab + bb + hbp + sf
    const obp = obpDen > 0 ? Math.round((h + bb + hbp) / obpDen * 1000) / 1000 : null
    const slg = ab > 0 ? Math.round(tb / ab * 1000) / 1000 : null
    const ops = obp !== null && slg !== null ? Math.round((obp + slg) * 1000) / 1000 : null

    results.push({
      playerId: mlbId, season, date, avg, obp, slg, ops,
      bbPct: pct(bb, pa), kPct: pct(so, pa),
      hr, rbi, hits: h, runs, stolenBases: sb,
    })
  }
  return results
}

export async function fetchPitcherGameLog(mlbId: string, season: number) {
  const splits = await fetchPlayerSplits(mlbId, {
    stats: 'gameLog', season: String(season), sportId: '1', group: 'pitching',
  })

  let er = 0, hits = 0, bb = 0, so = 0, bf = 0, outs = 0
  let wins = 0, losses = 0, saves = 0, holds = 0
  const results: ReturnType<typeof parsePitcher>[] = []

  for (const game of splits) {
    const s = game.stat
    er += parseNum(s.earnedRuns) ?? 0
    hits += parseNum(s.hits) ?? 0
    bb += parseNum(s.baseOnBalls) ?? 0
    so += parseNum(s.strikeOuts) ?? 0
    bf += parseNum(s.battersFaced) ?? 0
    outs += ipToOuts(s.inningsPitched)
    wins += parseNum(s.wins) ?? 0
    losses += parseNum(s.losses) ?? 0
    saves += parseNum(s.saves) ?? 0
    holds += parseNum(s.holds) ?? 0

    const date = game.date ?? ''
    if (!date) continue

    const innings = outs / 3
    const era = innings > 0 ? Math.round(er / innings * 9 * 100) / 100 : null
    const whip = innings > 0 ? Math.round((hits + bb) / innings * 100) / 100 : null
    const ip = Math.round(innings * 3) / 3

    results.push({
      playerId: mlbId, season, date, era, whip,
      kPct: pct(so, bf), bbPct: pct(bb, bf),
      wins, losses, strikeouts: so,
      inningsPitched: ip, saves, holds,
    })
  }
  return results
}

// ── リーグ全体統計 ──
// AL = 103, NL = 104
export async function fetchLeagueBatters(leagueId: number, season: number) {
  const qs = new URLSearchParams({
    stats: 'season', season: String(season), sportId: '1',
    group: 'hitting', gameType: 'R', playerPool: 'qualified',
    leagueId: String(leagueId), limit: '500',
  }).toString()
  const json = await fetchJson<MlbLeagueResponse>(`${MLB_API}/stats?${qs}`)
  return (json?.stats?.[0]?.splits ?? []).map(split => {
    const s = split.stat
    const pa = parseNum(s.plateAppearances) ?? 0
    return {
      avg: parseNum(s.avg),
      obp: parseNum(s.obp),
      ops: parseNum(s.ops),
      bbPct: pct(parseNum(s.baseOnBalls) ?? 0, pa),
      kPct: pct(parseNum(s.strikeOuts) ?? 0, pa),
    }
  })
}

export async function fetchLeaguePitchers(leagueId: number, season: number) {
  const qs = new URLSearchParams({
    stats: 'season', season: String(season), sportId: '1',
    group: 'pitching', gameType: 'R', playerPool: 'qualified',
    leagueId: String(leagueId), limit: '500',
  }).toString()
  const json = await fetchJson<MlbLeagueResponse>(`${MLB_API}/stats?${qs}`)
  return (json?.stats?.[0]?.splits ?? []).map(split => {
    const s = split.stat
    const bf = parseNum(s.battersFaced) ?? 0
    return {
      era: parseNum(s.era),
      whip: parseNum(s.whip),
      kPct: pct(parseNum(s.strikeOuts) ?? 0, bf),
      bbPct: pct(parseNum(s.baseOnBalls) ?? 0, bf),
    }
  })
}

// playerPool: 'all' でカウント系（HR/打点/盗塁等）を取得
export async function fetchLeagueBatterCounts(leagueId: number, season: number) {
  const qs = new URLSearchParams({
    stats: 'season', season: String(season), sportId: '1',
    group: 'hitting', gameType: 'R', playerPool: 'all',
    leagueId: String(leagueId), limit: '1000',
  }).toString()
  const json = await fetchJson<MlbLeagueResponse>(`${MLB_API}/stats?${qs}`)
  return (json?.stats?.[0]?.splits ?? [])
    .filter(split => (parseNum(split.stat.plateAppearances) ?? 0) >= 10)
    .map(split => {
      const s = split.stat
      return {
        hr:          parseNum(s.homeRuns),
        rbi:         parseNum(s.rbi),
        hits:        parseNum(s.hits),
        runs:        parseNum(s.runs),
        stolenBases: parseNum(s.stolenBases),
      }
    })
}

export async function fetchLeaguePitcherCounts(leagueId: number, season: number) {
  const qs = new URLSearchParams({
    stats: 'season', season: String(season), sportId: '1',
    group: 'pitching', gameType: 'R', playerPool: 'all',
    leagueId: String(leagueId), limit: '1000',
  }).toString()
  const json = await fetchJson<MlbLeagueResponse>(`${MLB_API}/stats?${qs}`)
  return (json?.stats?.[0]?.splits ?? [])
    .filter(split => (parseNum(split.stat.battersFaced) ?? 0) >= 5)
    .map(split => {
      const s = split.stat
      return {
        wins:           parseNum(s.wins),
        losses:         parseNum(s.losses),
        strikeouts:     parseNum(s.strikeOuts),
        inningsPitched: parseNum(s.inningsPitched),
        saves:          parseNum(s.saves),
        holds:          parseNum(s.holds),
      }
    })
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
