import type { SeasonData, YearlyData, BatterStats, PitcherStats, AllLeagueStats, LeagueStatsBlock, LeagueStatSummary } from '~/types/mlb'
import { PLAYERS } from '~/utils/japanese-mlb-player/players'
import { nowJST } from '~/utils/jst'

// 2026年現在成績サンプルデータ（ローカル開発用）
const CURRENT_BATTER: Record<string, Omit<BatterStats, 'playerId' | 'season' | 'date'>> = {
  '807799': { avg: 0.278, obp: 0.362, slg: 0.480, ops: 0.842, bbPct: 12.8, kPct: 19.5, hr: 4,  rbi: 14, hits: 22, runs: 12, stolenBases: 0, bbk: 0.66 },
  '672960': { avg: 0.261, obp: 0.335, slg: 0.430, ops: 0.795, bbPct: 9.2,  kPct: 21.8, hr: 4,  rbi: 13, hits: 21, runs: 10, stolenBases: 1, bbk: 0.42 },
  '808959': { avg: 0.248, obp: 0.342, slg: 0.483, ops: 0.825, bbPct: 12.5, kPct: 27.3, hr: 5,  rbi: 15, hits: 20, runs: 11, stolenBases: 0, bbk: 0.46 },
  '673548': { avg: 0.287, obp: 0.358, slg: 0.471, ops: 0.858, bbPct: 10.1, kPct: 18.7, hr: 4,  rbi: 16, hits: 25, runs: 14, stolenBases: 3, bbk: 0.54 },
  '666971': { avg: 0.256, obp: 0.347, slg: 0.435, ops: 0.782, bbPct: 11.4, kPct: 21.2, hr: 3,  rbi: 10, hits: 20, runs: 13, stolenBases: 5, bbk: 0.54 },
  '660271': { avg: 0.240, obp: 0.364, slg: 0.438, ops: 0.802, bbPct: 14.3, kPct: 25.2, hr: 5,  rbi: 11, hits: 23, runs: 15, stolenBases: 1, bbk: 0.57 },
}

const CURRENT_PITCHER: Record<string, Omit<PitcherStats, 'playerId' | 'season' | 'date'>> = {
  '673540': { era: 2.43, whip: 1.01, kPct: 31.2, bbPct: 6.8, wins: 3, losses: 1, strikeouts: 38, inningsPitched: 33.1, saves: 0, holds: 0, fip: 2.71, bbk: 0.22 },
  '684007': { era: 2.87, whip: 1.08, kPct: 28.4, bbPct: 5.2, wins: 3, losses: 1, strikeouts: 32, inningsPitched: 31.1, saves: 0, holds: 0, fip: 2.95, bbk: 0.18 },
  '808963': { era: 2.18, whip: 0.94, kPct: 33.6, bbPct: 5.8, wins: 2, losses: 1, strikeouts: 35, inningsPitched: 29.0, saves: 0, holds: 0, fip: 2.40, bbk: 0.17 },
  '660271': { era: 2.32, whip: 0.97, kPct: 35.1, bbPct: 6.9, wins: 2, losses: 1, strikeouts: 28, inningsPitched: 23.1, saves: 0, holds: 0, fip: 2.25, bbk: 0.20 },
  '808967': { era: 2.62, whip: 1.04, kPct: 29.3, bbPct: 5.9, wins: 3, losses: 1, strikeouts: 30, inningsPitched: 30.2, saves: 0, holds: 0, fip: 2.75, bbk: 0.20 },
  '673513': { era: 2.91, whip: 1.11, kPct: 28.1, bbPct: 7.8, wins: 2, losses: 0, strikeouts: 18, inningsPitched: 17.0, saves: 5, holds: 3, fip: 3.15, bbk: 0.28 },
  '506433': { era: 3.22, whip: 1.09, kPct: 26.4, bbPct: 6.9, wins: 2, losses: 2, strikeouts: 28, inningsPitched: 28.0, saves: 0, holds: 0, fip: 3.30, bbk: 0.26 },
  '579328': { era: 3.84, whip: 1.21, kPct: 22.3, bbPct: 8.1, wins: 2, losses: 2, strikeouts: 24, inningsPitched: 25.0, saves: 0, holds: 0, fip: 3.75, bbk: 0.36 },
  '837227': { era: 3.42, whip: 1.14, kPct: 25.2, bbPct: 8.9, wins: 2, losses: 2, strikeouts: 22, inningsPitched: 23.2, saves: 0, holds: 0, fip: 3.50, bbk: 0.35 },
}

// 年度別サンプルデータ
const YEARLY_BATTER: Record<string, Array<Omit<BatterStats, 'playerId' | 'date'>>> = {
  '807799': [
    { season: 2023, avg: 0.289, obp: 0.370, slg: 0.498, ops: 0.868, bbPct: 11.2, kPct: 18.3, hr: 15, rbi: 72, hits: 142, runs: 68, stolenBases: 2,  bbk: 0.61 },
    { season: 2024, avg: 0.271, obp: 0.352, slg: 0.469, ops: 0.821, bbPct: 10.8, kPct: 19.8, hr: 18, rbi: 80, hits: 131, runs: 62, stolenBases: 1,  bbk: 0.55 },
    { season: 2025, avg: 0.283, obp: 0.367, slg: 0.481, ops: 0.848, bbPct: 11.9, kPct: 20.1, hr: 20, rbi: 85, hits: 138, runs: 71, stolenBases: 3,  bbk: 0.59 },
  ],
  '672960': [
    { season: 2026, avg: 0.261, obp: 0.335, slg: 0.430, ops: 0.795, bbPct: 9.2,  kPct: 21.8, hr: 4,  rbi: 13, hits: 21,  runs: 10, stolenBases: 1,  bbk: 0.42 },
  ],
  '808959': [
    { season: 2026, avg: 0.248, obp: 0.342, slg: 0.483, ops: 0.825, bbPct: 12.5, kPct: 27.3, hr: 5,  rbi: 15, hits: 20,  runs: 11, stolenBases: 0,  bbk: 0.46 },
  ],
  '673548': [
    { season: 2022, avg: 0.262, obp: 0.336, slg: 0.463, ops: 0.799, bbPct: 9.8,  kPct: 22.1, hr: 14, rbi: 55, hits: 101, runs: 50, stolenBases: 4,  bbk: 0.44 },
    { season: 2023, avg: 0.285, obp: 0.358, slg: 0.497, ops: 0.855, bbPct: 10.5, kPct: 19.3, hr: 20, rbi: 75, hits: 132, runs: 68, stolenBases: 6,  bbk: 0.54 },
    { season: 2024, avg: 0.278, obp: 0.351, slg: 0.490, ops: 0.841, bbPct: 10.1, kPct: 20.2, hr: 22, rbi: 82, hits: 128, runs: 72, stolenBases: 5,  bbk: 0.50 },
    { season: 2025, avg: 0.292, obp: 0.366, slg: 0.502, ops: 0.868, bbPct: 10.8, kPct: 18.9, hr: 25, rbi: 90, hits: 140, runs: 78, stolenBases: 8,  bbk: 0.57 },
  ],
  '666971': [
    { season: 2022, avg: 0.228, obp: 0.321, slg: 0.407, ops: 0.728, bbPct: 11.2, kPct: 23.4, hr: 8,  rbi: 40, hits: 88,  runs: 52, stolenBases: 10, bbk: 0.48 },
    { season: 2023, avg: 0.259, obp: 0.345, slg: 0.437, ops: 0.782, bbPct: 11.8, kPct: 21.8, hr: 14, rbi: 58, hits: 110, runs: 65, stolenBases: 15, bbk: 0.54 },
    { season: 2024, avg: 0.247, obp: 0.338, slg: 0.424, ops: 0.762, bbPct: 11.5, kPct: 22.3, hr: 12, rbi: 52, hits: 102, runs: 61, stolenBases: 18, bbk: 0.52 },
    { season: 2025, avg: 0.262, obp: 0.352, slg: 0.439, ops: 0.791, bbPct: 12.1, kPct: 20.9, hr: 15, rbi: 62, hits: 115, runs: 70, stolenBases: 20, bbk: 0.58 },
  ],
  '660271': [
    { season: 2024, avg: 0.310, obp: 0.390, slg: 0.621, ops: 1.011, bbPct: 13.8, kPct: 23.1, hr: 54, rbi: 130, hits: 174, runs: 134, stolenBases: 59, bbk: 0.60 },
    { season: 2025, avg: 0.295, obp: 0.382, slg: 0.589, ops: 0.971, bbPct: 14.1, kPct: 22.5, hr: 48, rbi: 118, hits: 161, runs: 122, stolenBases: 42, bbk: 0.63 },
  ],
}

const YEARLY_PITCHER: Record<string, Array<Omit<PitcherStats, 'playerId' | 'date'>>> = {
  '673540': [
    { season: 2023, era: 2.98, whip: 1.07, kPct: 30.1, bbPct: 7.2, wins: 12, losses: 7,  strikeouts: 202, inningsPitched: 166.1, saves: 0, holds: 0, fip: 3.05, bbk: 0.24 },
    { season: 2025, era: 2.45, whip: 0.99, kPct: 32.4, bbPct: 6.1, wins: 15, losses: 5,  strikeouts: 225, inningsPitched: 182.0, saves: 0, holds: 0, fip: 2.55, bbk: 0.19 },
  ],
  '684007': [
    { season: 2024, era: 3.22, whip: 1.12, kPct: 26.8, bbPct: 5.8, wins: 15, losses: 5,  strikeouts: 188, inningsPitched: 174.1, saves: 0, holds: 0, fip: 3.20, bbk: 0.22 },
    { season: 2025, era: 2.95, whip: 1.06, kPct: 28.2, bbPct: 5.4, wins: 14, losses: 7,  strikeouts: 198, inningsPitched: 178.0, saves: 0, holds: 0, fip: 2.90, bbk: 0.19 },
  ],
  '808963': [
    { season: 2025, era: 2.42, whip: 0.98, kPct: 32.1, bbPct: 6.2, wins: 12, losses: 5,  strikeouts: 188, inningsPitched: 152.0, saves: 0, holds: 0, fip: 2.35, bbk: 0.19 },
  ],
  '660271': [
    { season: 2024, era: 1.98, whip: 0.88, kPct: 34.8, bbPct: 6.2, wins: 10, losses: 5,  strikeouts: 144, inningsPitched: 132.0, saves: 0, holds: 0, fip: 2.10, bbk: 0.18 },
    { season: 2025, era: 2.15, whip: 0.93, kPct: 35.2, bbPct: 6.6, wins: 11, losses: 4,  strikeouts: 138, inningsPitched: 128.2, saves: 0, holds: 0, fip: 2.20, bbk: 0.19 },
  ],
  '808967': [
    { season: 2024, era: 3.00, whip: 1.08, kPct: 28.1, bbPct: 6.3, wins: 7,  losses: 2,  strikeouts: 58,  inningsPitched: 52.0,  saves: 0, holds: 0, fip: 2.95, bbk: 0.22 },
    { season: 2025, era: 2.71, whip: 1.03, kPct: 29.8, bbPct: 5.8, wins: 14, losses: 6,  strikeouts: 182, inningsPitched: 170.1, saves: 0, holds: 0, fip: 2.65, bbk: 0.19 },
  ],
  '673513': [
    { season: 2024, era: 3.12, whip: 1.14, kPct: 27.2, bbPct: 8.1, wins: 4,  losses: 2,  strikeouts: 62,  inningsPitched: 55.1,  saves: 18, holds: 8,  fip: 3.25, bbk: 0.30 },
    { season: 2025, era: 2.98, whip: 1.10, kPct: 28.5, bbPct: 7.6, wins: 5,  losses: 1,  strikeouts: 68,  inningsPitched: 58.0,  saves: 22, holds: 10, fip: 3.10, bbk: 0.27 },
  ],
  '506433': [
    { season: 2020, era: 2.01, whip: 0.96, kPct: 32.1, bbPct: 7.8, wins: 8,  losses: 3,  strikeouts: 93,  inningsPitched: 76.0,  saves: 0, holds: 0, fip: 2.15, bbk: 0.24 },
    { season: 2021, era: 4.22, whip: 1.31, kPct: 23.8, bbPct: 8.9, wins: 8,  losses: 11, strikeouts: 144, inningsPitched: 148.2, saves: 0, holds: 0, fip: 4.10, bbk: 0.37 },
    { season: 2022, era: 3.10, whip: 1.09, kPct: 26.4, bbPct: 7.2, wins: 16, losses: 8,  strikeouts: 194, inningsPitched: 166.0, saves: 0, holds: 0, fip: 3.05, bbk: 0.27 },
    { season: 2023, era: 4.56, whip: 1.38, kPct: 22.1, bbPct: 8.5, wins: 12, losses: 11, strikeouts: 152, inningsPitched: 145.0, saves: 0, holds: 0, fip: 4.35, bbk: 0.38 },
    { season: 2024, era: 3.45, whip: 1.15, kPct: 25.8, bbPct: 7.1, wins: 13, losses: 9,  strikeouts: 168, inningsPitched: 158.1, saves: 0, holds: 0, fip: 3.30, bbk: 0.28 },
    { season: 2025, era: 3.28, whip: 1.11, kPct: 26.8, bbPct: 6.8, wins: 14, losses: 8,  strikeouts: 178, inningsPitched: 162.0, saves: 0, holds: 0, fip: 3.15, bbk: 0.25 },
  ],
  '579328': [
    { season: 2022, era: 4.12, whip: 1.28, kPct: 21.8, bbPct: 9.2, wins: 10, losses: 10, strikeouts: 138, inningsPitched: 148.0, saves: 0, holds: 0, fip: 4.05, bbk: 0.42 },
    { season: 2023, era: 3.86, whip: 1.22, kPct: 22.8, bbPct: 8.8, wins: 11, losses: 10, strikeouts: 148, inningsPitched: 154.2, saves: 0, holds: 0, fip: 3.75, bbk: 0.39 },
    { season: 2024, era: 3.52, whip: 1.18, kPct: 23.5, bbPct: 8.4, wins: 12, losses: 9,  strikeouts: 158, inningsPitched: 160.0, saves: 0, holds: 0, fip: 3.45, bbk: 0.36 },
    { season: 2025, era: 3.72, whip: 1.19, kPct: 22.9, bbPct: 8.2, wins: 11, losses: 10, strikeouts: 152, inningsPitched: 156.1, saves: 0, holds: 0, fip: 3.60, bbk: 0.36 },
  ],
  '837227': [
    { season: 2026, era: 3.42, whip: 1.14, kPct: 25.2, bbPct: 8.9, wins: 2, losses: 2, strikeouts: 22, inningsPitched: 23.2, saves: 0, holds: 0, fip: 3.50, bbk: 0.35 },
  ],
}

function generateTrendBatter(playerId: string, season: number): BatterStats[] {
  const base = CURRENT_BATTER[playerId]
  if (!base) return []
  const trend: BatterStats[] = []
  const seed = playerId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  let s = seed
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5 }
  const games = 18
  for (let day = 1; day <= games; day++) {
    const date = `2026-04-${day.toString().padStart(2, '0')}`
    const prog = day / games
    trend.push({
      playerId, season, date,
      avg:  Math.max(0.15, Math.min(0.400, (base.avg  ?? 0.250) + rng() * 0.04 * (1 - prog * 0.5))),
      obp:  Math.max(0.22, Math.min(0.500, (base.obp  ?? 0.320) + rng() * 0.04 * (1 - prog * 0.5))),
      slg:  Math.max(0.25, Math.min(0.700, (base.slg  ?? 0.400) + rng() * 0.05 * (1 - prog * 0.5))),
      ops:  Math.max(0.55, Math.min(1.200, (base.ops  ?? 0.750) + rng() * 0.06 * (1 - prog * 0.5))),
      bbPct: Math.max(3,  Math.min(22,  (base.bbPct ?? 8)  + rng() * 3)),
      kPct:  Math.max(8,  Math.min(38,  (base.kPct  ?? 22) + rng() * 4)),
      hr:          Math.round((base.hr          ?? 0) * prog + rng() * 0.5),
      rbi:         Math.round((base.rbi         ?? 0) * prog + rng() * 0.5),
      hits:        Math.round((base.hits        ?? 0) * prog),
      runs:        Math.round((base.runs        ?? 0) * prog + rng() * 0.5),
      stolenBases: Math.round((base.stolenBases ?? 0) * prog),
      bbk: (() => { const kp = Math.max(8, Math.min(38, (base.kPct ?? 22) + rng() * 4)); return kp > 0 ? Math.round((base.bbPct ?? 8) / kp * 100) / 100 : null })(),
    })
  }
  return trend
}

function generateTrendPitcher(playerId: string, season: number): PitcherStats[] {
  const base = CURRENT_PITCHER[playerId]
  if (!base) return []
  const trend: PitcherStats[] = []
  const seed = playerId.split('').reduce((a, c) => a + c.charCodeAt(0), 1)
  let s = seed
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5 }
  const games = 18
  for (let day = 1; day <= games; day++) {
    const date = `2026-04-${day.toString().padStart(2, '0')}`
    const prog = day / games
    trend.push({
      playerId, season, date,
      era:  Math.max(0.5, Math.min(8.0, (base.era  ?? 3.5) + rng() * 0.8 * (1 - prog * 0.6))),
      whip: Math.max(0.5, Math.min(2.0, (base.whip ?? 1.2) + rng() * 0.2 * (1 - prog * 0.6))),
      kPct:  Math.max(10, Math.min(45, (base.kPct  ?? 25) + rng() * 5)),
      bbPct: Math.max(2,  Math.min(18, (base.bbPct ?? 8)  + rng() * 3)),
      wins:           Math.round((base.wins           ?? 0) * prog),
      losses:         Math.round((base.losses         ?? 0) * prog),
      strikeouts:     Math.round((base.strikeouts     ?? 0) * prog),
      inningsPitched: Math.round((base.inningsPitched ?? 0) * prog * 3) / 3,
      saves:          Math.round((base.saves          ?? 0) * prog),
      holds:          Math.round((base.holds          ?? 0) * prog),
      fip: base.fip !== null && base.fip !== undefined ? Math.round((base.fip + rng() * 0.4 * (1 - prog * 0.6)) * 100) / 100 : null,
      bbk: (() => { const kp = Math.max(10, Math.min(45, (base.kPct ?? 25) + rng() * 5)); return kp > 0 ? Math.round((base.bbPct ?? 8) / kp * 100) / 100 : null })(),
    })
  }
  return trend
}

export function getDevMeta() {
  return { lastSyncedAt: nowJST().toISOString().slice(0, 19).replace('T', ' ') }
}

export function getDevSeasonData(playerId: string): SeasonData | null {
  const player = PLAYERS.find(p => p.id === playerId)
  if (!player) return null
  const season = 2026
  const cb = CURRENT_BATTER[playerId]
  const cp = CURRENT_PITCHER[playerId]
  return {
    player,
    currentBatter: cb ? { playerId, season, date: '', ...cb } : null,
    currentPitcher: cp ? { playerId, season, date: '', ...cp } : null,
    trendBatter: generateTrendBatter(playerId, season),
    trendPitcher: generateTrendPitcher(playerId, season),
  }
}

export function getDevYearlyData(playerId: string): YearlyData | null {
  const player = PLAYERS.find(p => p.id === playerId)
  if (!player) return null

  const yb = (YEARLY_BATTER[playerId] ?? []).map(s => ({ playerId, date: null, ...s } as BatterStats))
  const yp = (YEARLY_PITCHER[playerId] ?? []).map(s => ({ playerId, date: null, ...s } as PitcherStats))

  if (!yb.length && !yp.length) {
    const cb = CURRENT_BATTER[playerId]
    const cp = CURRENT_PITCHER[playerId]
    return {
      player,
      yearlyBatter: cb ? [{ playerId, season: 2026, date: null, ...cb }] : [],
      yearlyPitcher: cp ? [{ playerId, season: 2026, date: null, ...cp }] : [],
    }
  }

  return { player, yearlyBatter: yb, yearlyPitcher: yp }
}

export function getDevPlayers() {
  return PLAYERS
}

function makeSummary(leader: number, avg: number, count: number, higherIsBetter: boolean): LeagueStatSummary {
  const step = higherIsBetter ? -(leader - avg * 0.6) / count : (avg * 1.4 - leader) / count
  const values: number[] = []
  for (let i = 0; i < count; i++) {
    values.push(Math.round((leader + step * i) * 1000) / 1000)
  }
  return { leaderValue: leader, leagueAvg: avg, sortedValues: values }
}

function makeLeagueBlock(
  batterLeaders: { avg: number; obp: number; slg: number; ops: number; bbPct: number; kPct: number; hr: number; rbi: number; hits: number; runs: number; stolenBases: number },
  batterAvgs:   { avg: number; obp: number; slg: number; ops: number; bbPct: number; kPct: number },
  pitcherLeaders: { era: number; whip: number; kPct: number; bbPct: number; fip: number; wins: number; losses: number; strikeouts: number; inningsPitched: number; saves: number; holds: number },
  pitcherAvgs:    { era: number; whip: number; kPct: number; bbPct: number; fip: number },
): LeagueStatsBlock {
  return {
    batter: {
      avg:         makeSummary(batterLeaders.avg,         batterAvgs.avg,   150, true),
      obp:         makeSummary(batterLeaders.obp,         batterAvgs.obp,   150, true),
      slg:         makeSummary(batterLeaders.slg,         batterAvgs.slg,   150, true),
      ops:         makeSummary(batterLeaders.ops,         batterAvgs.ops,   150, true),
      bbPct:       makeSummary(batterLeaders.bbPct,       batterAvgs.bbPct, 150, true),
      kPct:        makeSummary(batterLeaders.kPct,        batterAvgs.kPct,  150, false),
      hr:          makeSummary(batterLeaders.hr,          batterLeaders.hr,  300, true),
      rbi:         makeSummary(batterLeaders.rbi,         batterLeaders.rbi, 300, true),
      hits:        makeSummary(batterLeaders.hits,        batterLeaders.hits, 300, true),
      runs:        makeSummary(batterLeaders.runs,        batterLeaders.runs, 300, true),
      stolenBases: makeSummary(batterLeaders.stolenBases, batterLeaders.stolenBases, 300, true),
      bbk:         makeSummary(batterLeaders.bbPct / batterLeaders.kPct, batterAvgs.bbPct / batterAvgs.kPct, 150, true),
    },
    pitcher: {
      era:            makeSummary(pitcherLeaders.era,            pitcherAvgs.era,   80, false),
      whip:           makeSummary(pitcherLeaders.whip,           pitcherAvgs.whip,  80, false),
      kPct:           makeSummary(pitcherLeaders.kPct,           pitcherAvgs.kPct,  80, true),
      bbPct:          makeSummary(pitcherLeaders.bbPct,          pitcherAvgs.bbPct, 80, false),
      wins:           makeSummary(pitcherLeaders.wins,           pitcherLeaders.wins,           400, true),
      losses:         makeSummary(pitcherLeaders.losses,         pitcherLeaders.losses,         400, true),
      strikeouts:     makeSummary(pitcherLeaders.strikeouts,     pitcherLeaders.strikeouts,     400, true),
      inningsPitched: makeSummary(pitcherLeaders.inningsPitched, pitcherLeaders.inningsPitched, 400, true),
      saves:          makeSummary(pitcherLeaders.saves,          pitcherLeaders.saves,           400, true),
      holds:          makeSummary(pitcherLeaders.holds,          pitcherLeaders.holds,           400, true),
      fip:            makeSummary(pitcherLeaders.fip,            pitcherAvgs.fip,               80, false),
      bbk:            makeSummary(pitcherLeaders.bbPct / pitcherLeaders.kPct, pitcherAvgs.bbPct / pitcherAvgs.kPct, 80, false),
    },
  }
}

export function getDevLeagueStats(): AllLeagueStats {
  return {
    AL: makeLeagueBlock(
      { avg: 0.345, obp: 0.420, slg: 0.620, ops: 1.050, bbPct: 17.2, kPct: 12.5, hr: 12, rbi: 38, hits: 42, runs: 32, stolenBases: 14 },
      { avg: 0.255, obp: 0.322, slg: 0.423, ops: 0.745, bbPct: 8.5,  kPct: 24.0 },
      { era: 1.42, whip: 0.82, kPct: 38.5, bbPct: 3.8, fip: 1.65, wins: 5, losses: 1, strikeouts: 52, inningsPitched: 40.0, saves: 10, holds: 9 },
      { era: 4.12, whip: 1.28, kPct: 22.8, bbPct: 8.2, fip: 4.05 },
    ),
    NL: makeLeagueBlock(
      { avg: 0.352, obp: 0.428, slg: 0.652, ops: 1.080, bbPct: 16.8, kPct: 11.8, hr: 11, rbi: 35, hits: 40, runs: 30, stolenBases: 12 },
      { avg: 0.252, obp: 0.318, slg: 0.420, ops: 0.738, bbPct: 8.2,  kPct: 24.5 },
      { era: 1.38, whip: 0.80, kPct: 40.2, bbPct: 3.5, fip: 1.58, wins: 5, losses: 1, strikeouts: 55, inningsPitched: 42.0, saves: 9, holds: 8 },
      { era: 4.08, whip: 1.25, kPct: 23.5, bbPct: 7.9, fip: 4.02 },
    ),
  }
}

