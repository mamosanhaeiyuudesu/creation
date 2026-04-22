// FanGraphs データ取得ユーティリティ

// MLB player ID → FanGraphs player ID
export const FG_PLAYER_IDS: Record<string, string | null> = {
  '660271': '19755',  // 大谷翔平
  '808967': '33825',  // 山本由伸
  '694973': '31838',  // 千賀滉大
  '694297': '33829',  // 今永昇太
  '838982': '35323',  // 佐々木朗希
  '673548': '30116',  // 鈴木誠也
  '676440': '31837',  // 吉田正尚
  '666971': '21454',  // ラーズ・ヌートバー
  '506433': '13074',  // ダルビッシュ有
  '579328': '20633',  // 菊池雄星
  '673668': '33826',  // 松井裕樹
  '838984': null,     // 岡本和真（2026年新規加入、ID確定後に追加）
  '838985': null,     // 村上宗隆（2026年新規加入、ID確定後に追加）
  '838986': null,     // 今井達也（2026年新規加入、ID確定後に追加）
}

// MLB加入シーズン（年度別データの取得範囲開始年）
export const MLB_DEBUT_SEASONS: Record<string, number> = {
  '660271': 2018,  // 大谷翔平
  '808967': 2024,  // 山本由伸
  '694973': 2023,  // 千賀滉大
  '694297': 2024,  // 今永昇太
  '838982': 2025,  // 佐々木朗希
  '673548': 2022,  // 鈴木誠也
  '676440': 2023,  // 吉田正尚
  '666971': 2021,  // ラーズ・ヌートバー
  '506433': 2012,  // ダルビッシュ有
  '579328': 2019,  // 菊池雄星
  '673668': 2024,  // 松井裕樹
  '838984': 2026,
  '838985': 2026,
  '838986': 2026,
}

interface FgBatterRow {
  playerid?: string | number
  Season?: number
  AVG?: number | null
  OBP?: number | null
  OPS?: number | null
  'wRC+'?: number | null
  'BB%'?: number | string | null
  'K%'?: number | string | null
  WAR?: number | null
  [key: string]: unknown
}

interface FgPitcherRow {
  playerid?: string | number
  Season?: number
  ERA?: number | null
  FIP?: number | null
  WHIP?: number | null
  'K%'?: number | string | null
  'BB%'?: number | string | null
  'GB%'?: number | string | null
  WAR?: number | null
  [key: string]: unknown
}

// "14.2 %" / "0.142" / 0.142 / 14.2 → 14.2 に正規化
function parsePct(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') {
    const n = parseFloat(v.replace('%', '').trim())
    return isNaN(n) ? null : n
  }
  return v < 1 ? Math.round(v * 1000) / 10 : v
}

const FG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; personal-stats-tracker/1.0)',
  'Referer': 'https://www.fangraphs.com/',
  'Accept': 'application/json',
}

function buildLeaderboardsUrl(
  stats: 'bat' | 'pit',
  fgId: string,
  season: number,
  season1: number,
  individual: boolean,
): string {
  const url = new URL('https://www.fangraphs.com/api/leaders/major-league/data')
  url.searchParams.set('pos', 'all')
  url.searchParams.set('stats', stats)
  url.searchParams.set('lg', 'all')
  url.searchParams.set('qual', '0')
  url.searchParams.set('type', '8')
  url.searchParams.set('season', String(season))
  url.searchParams.set('season1', String(season1))
  url.searchParams.set('ind', individual ? '1' : '0')
  url.searchParams.set('team', '0')
  url.searchParams.set('rost', '0')
  url.searchParams.set('age', '0')
  url.searchParams.set('players', fgId)
  url.searchParams.set('pageitems', '50')
  url.searchParams.set('pagenum', '1')
  return url.toString()
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: FG_HEADERS })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

export async function fetchFgBatterSeason(fgId: string, season: number): Promise<FgBatterRow | null> {
  const json = await fetchJson<{ data?: FgBatterRow[] }>(
    buildLeaderboardsUrl('bat', fgId, season, season, false)
  )
  return json?.data?.[0] ?? null
}

export async function fetchFgPitcherSeason(fgId: string, season: number): Promise<FgPitcherRow | null> {
  const json = await fetchJson<{ data?: FgPitcherRow[] }>(
    buildLeaderboardsUrl('pit', fgId, season, season, false)
  )
  return json?.data?.[0] ?? null
}

export async function fetchFgBatterYearly(fgId: string, fromSeason: number, toSeason: number): Promise<FgBatterRow[]> {
  const json = await fetchJson<{ data?: FgBatterRow[] }>(
    buildLeaderboardsUrl('bat', fgId, toSeason, fromSeason, true)
  )
  return json?.data ?? []
}

export async function fetchFgPitcherYearly(fgId: string, fromSeason: number, toSeason: number): Promise<FgPitcherRow[]> {
  const json = await fetchJson<{ data?: FgPitcherRow[] }>(
    buildLeaderboardsUrl('pit', fgId, toSeason, fromSeason, true)
  )
  return json?.data ?? []
}

export function mapBatterRow(row: FgBatterRow, playerId: string, season: number, date: string) {
  return {
    playerId,
    season,
    date,
    avg: row.AVG ?? null,
    obp: row.OBP ?? null,
    ops: row.OPS ?? null,
    wrcPlus: row['wRC+'] ?? null,
    bbPct: parsePct(row['BB%']),
    kPct: parsePct(row['K%']),
    war: row.WAR ?? null,
  }
}

export function mapPitcherRow(row: FgPitcherRow, playerId: string, season: number, date: string) {
  return {
    playerId,
    season,
    date,
    era: row.ERA ?? null,
    fip: row.FIP ?? null,
    whip: row.WHIP ?? null,
    kPct: parsePct(row['K%']),
    bbPct: parsePct(row['BB%']),
    gbPct: parsePct(row['GB%']),
    war: row.WAR ?? null,
  }
}

function buildLeagueUrl(stats: 'bat' | 'pit', league: 'al' | 'nl', season: number): string {
  const url = new URL('https://www.fangraphs.com/api/leaders/major-league/data')
  url.searchParams.set('pos', 'all')
  url.searchParams.set('stats', stats)
  url.searchParams.set('lg', league)
  url.searchParams.set('qual', '1')
  url.searchParams.set('type', '8')
  url.searchParams.set('season', String(season))
  url.searchParams.set('season1', String(season))
  url.searchParams.set('ind', '0')
  url.searchParams.set('team', '0')
  url.searchParams.set('pageitems', '1000')
  url.searchParams.set('pagenum', '1')
  return url.toString()
}

export async function fetchFgLeagueBatters(league: 'al' | 'nl', season: number): Promise<FgBatterRow[]> {
  const json = await fetchJson<{ data?: FgBatterRow[] }>(buildLeagueUrl('bat', league, season))
  return json?.data ?? []
}

export async function fetchFgLeaguePitchers(league: 'al' | 'nl', season: number): Promise<FgPitcherRow[]> {
  const json = await fetchJson<{ data?: FgPitcherRow[] }>(buildLeagueUrl('pit', league, season))
  return json?.data ?? []
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
