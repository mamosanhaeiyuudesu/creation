import type { SeasonData, YearlyData, BatterStats, PitcherStats, AllLeagueStats, LeagueStatsBlock, LeagueStatSummary } from '~/types/mlb'
import { PLAYERS } from '~/utils/japanese-mlb-player/players'

// 2026年現在成績サンプルデータ（ローカル開発用）
const CURRENT_BATTER: Record<string, Omit<BatterStats, 'playerId' | 'season' | 'date'>> = {
  '676440': { avg: 0.278, obp: 0.362, ops: 0.842, bbPct: 12.8, kPct: 19.5 },
  '838984': { avg: 0.261, obp: 0.335, ops: 0.795, bbPct: 9.2, kPct: 21.8 },
  '838985': { avg: 0.248, obp: 0.342, ops: 0.825, bbPct: 12.5, kPct: 27.3 },
  '673548': { avg: 0.287, obp: 0.358, ops: 0.858, bbPct: 10.1, kPct: 18.7 },
  '666971': { avg: 0.256, obp: 0.347, ops: 0.782, bbPct: 11.4, kPct: 21.2 },
  '660271': { avg: 0.301, obp: 0.388, ops: 0.982, bbPct: 14.2, kPct: 22.8 },
}

const CURRENT_PITCHER: Record<string, Omit<PitcherStats, 'playerId' | 'season' | 'date'>> = {
  '694973': { era: 2.43, whip: 1.01, kPct: 31.2, bbPct: 6.8 },
  '694297': { era: 2.87, whip: 1.08, kPct: 28.4, bbPct: 5.2 },
  '838982': { era: 2.18, whip: 0.94, kPct: 33.6, bbPct: 5.8 },
  '660271': { era: 2.32, whip: 0.97, kPct: 35.1, bbPct: 6.9 },
  '808967': { era: 2.62, whip: 1.04, kPct: 29.3, bbPct: 5.9 },
  '673668': { era: 2.91, whip: 1.11, kPct: 28.1, bbPct: 7.8 },
  '506433': { era: 3.22, whip: 1.09, kPct: 26.4, bbPct: 6.9 },
  '579328': { era: 3.84, whip: 1.21, kPct: 22.3, bbPct: 8.1 },
  '838986': { era: 3.42, whip: 1.14, kPct: 25.2, bbPct: 8.9 },
}

// 年度別サンプルデータ
const YEARLY_BATTER: Record<string, Array<Omit<BatterStats, 'playerId' | 'date'>>> = {
  '676440': [
    { season: 2023, avg: 0.289, obp: 0.370, ops: 0.862, bbPct: 11.2, kPct: 18.3 },
    { season: 2024, avg: 0.271, obp: 0.352, ops: 0.821, bbPct: 10.8, kPct: 19.8 },
    { season: 2025, avg: 0.283, obp: 0.367, ops: 0.848, bbPct: 11.9, kPct: 20.1 },
  ],
  '838984': [
    { season: 2026, avg: 0.261, obp: 0.335, ops: 0.795, bbPct: 9.2, kPct: 21.8 },
  ],
  '838985': [
    { season: 2026, avg: 0.248, obp: 0.342, ops: 0.825, bbPct: 12.5, kPct: 27.3 },
  ],
  '673548': [
    { season: 2022, avg: 0.262, obp: 0.336, ops: 0.799, bbPct: 9.8, kPct: 22.1 },
    { season: 2023, avg: 0.285, obp: 0.358, ops: 0.855, bbPct: 10.5, kPct: 19.3 },
    { season: 2024, avg: 0.278, obp: 0.351, ops: 0.841, bbPct: 10.1, kPct: 20.2 },
    { season: 2025, avg: 0.292, obp: 0.366, ops: 0.868, bbPct: 10.8, kPct: 18.9 },
  ],
  '666971': [
    { season: 2022, avg: 0.228, obp: 0.321, ops: 0.728, bbPct: 11.2, kPct: 23.4 },
    { season: 2023, avg: 0.259, obp: 0.345, ops: 0.782, bbPct: 11.8, kPct: 21.8 },
    { season: 2024, avg: 0.247, obp: 0.338, ops: 0.762, bbPct: 11.5, kPct: 22.3 },
    { season: 2025, avg: 0.262, obp: 0.352, ops: 0.791, bbPct: 12.1, kPct: 20.9 },
  ],
  '660271': [
    { season: 2024, avg: 0.310, obp: 0.390, ops: 1.011, bbPct: 13.8, kPct: 23.1 },
    { season: 2025, avg: 0.295, obp: 0.382, ops: 0.971, bbPct: 14.1, kPct: 22.5 },
  ],
}

const YEARLY_PITCHER: Record<string, Array<Omit<PitcherStats, 'playerId' | 'date'>>> = {
  '694973': [
    { season: 2023, era: 2.98, whip: 1.07, kPct: 30.1, bbPct: 7.2 },
    { season: 2024, era: 2.61, whip: 1.02, kPct: 31.8, bbPct: 6.5 },
    { season: 2025, era: 2.45, whip: 0.99, kPct: 32.4, bbPct: 6.1 },
  ],
  '694297': [
    { season: 2024, era: 3.22, whip: 1.12, kPct: 26.8, bbPct: 5.8 },
    { season: 2025, era: 2.95, whip: 1.06, kPct: 28.2, bbPct: 5.4 },
  ],
  '838982': [
    { season: 2024, era: 2.42, whip: 0.98, kPct: 32.1, bbPct: 6.2 },
    { season: 2025, era: 2.28, whip: 0.95, kPct: 33.4, bbPct: 5.9 },
  ],
  '660271': [
    { season: 2024, era: 1.98, whip: 0.88, kPct: 34.8, bbPct: 6.2 },
    { season: 2025, era: 2.15, whip: 0.93, kPct: 35.2, bbPct: 6.6 },
  ],
  '808967': [
    { season: 2024, era: 3.00, whip: 1.08, kPct: 28.1, bbPct: 6.3 },
    { season: 2025, era: 2.71, whip: 1.03, kPct: 29.8, bbPct: 5.8 },
  ],
  '673668': [
    { season: 2024, era: 3.12, whip: 1.14, kPct: 27.2, bbPct: 8.1 },
    { season: 2025, era: 2.98, whip: 1.10, kPct: 28.5, bbPct: 7.6 },
  ],
  '506433': [
    { season: 2020, era: 2.01, whip: 0.96, kPct: 32.1, bbPct: 7.8 },
    { season: 2021, era: 4.22, whip: 1.31, kPct: 23.8, bbPct: 8.9 },
    { season: 2022, era: 3.10, whip: 1.09, kPct: 26.4, bbPct: 7.2 },
    { season: 2023, era: 4.56, whip: 1.38, kPct: 22.1, bbPct: 8.5 },
    { season: 2024, era: 3.45, whip: 1.15, kPct: 25.8, bbPct: 7.1 },
    { season: 2025, era: 3.28, whip: 1.11, kPct: 26.8, bbPct: 6.8 },
  ],
  '579328': [
    { season: 2022, era: 4.12, whip: 1.28, kPct: 21.8, bbPct: 9.2 },
    { season: 2023, era: 3.86, whip: 1.22, kPct: 22.8, bbPct: 8.8 },
    { season: 2024, era: 3.52, whip: 1.18, kPct: 23.5, bbPct: 8.4 },
    { season: 2025, era: 3.72, whip: 1.19, kPct: 22.9, bbPct: 8.2 },
  ],
  '838986': [
    { season: 2026, era: 3.42, whip: 1.14, kPct: 25.2, bbPct: 8.9 },
  ],
}

function generateTrendBatter(playerId: string, season: number): BatterStats[] {
  const base = CURRENT_BATTER[playerId]
  if (!base) return []
  const trend: BatterStats[] = []
  const seed = playerId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  let s = seed
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5 }
  for (let day = 1; day <= 18; day++) {
    const date = `2026-04-${day.toString().padStart(2, '0')}`
    const prog = day / 18
    trend.push({
      playerId, season, date,
      avg: Math.max(0.15, Math.min(0.400, (base.avg ?? 0.250) + rng() * 0.04 * (1 - prog * 0.5))),
      obp: Math.max(0.22, Math.min(0.500, (base.obp ?? 0.320) + rng() * 0.04 * (1 - prog * 0.5))),
      ops: Math.max(0.55, Math.min(1.200, (base.ops ?? 0.750) + rng() * 0.06 * (1 - prog * 0.5))),
      bbPct: Math.max(3, Math.min(22, (base.bbPct ?? 8) + rng() * 3)),
      kPct: Math.max(8, Math.min(38, (base.kPct ?? 22) + rng() * 4)),
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
  for (let day = 1; day <= 18; day++) {
    const date = `2026-04-${day.toString().padStart(2, '0')}`
    const prog = day / 18
    trend.push({
      playerId, season, date,
      era: Math.max(0.5, Math.min(8.0, (base.era ?? 3.5) + rng() * 0.8 * (1 - prog * 0.6))),
      whip: Math.max(0.5, Math.min(2.0, (base.whip ?? 1.2) + rng() * 0.2 * (1 - prog * 0.6))),
      kPct: Math.max(10, Math.min(45, (base.kPct ?? 25) + rng() * 5)),
      bbPct: Math.max(2, Math.min(18, (base.bbPct ?? 8) + rng() * 3)),
    })
  }
  return trend
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
  batterLeaders: { avg: number; obp: number; ops: number; bbPct: number; kPct: number },
  batterAvgs: { avg: number; obp: number; ops: number; bbPct: number; kPct: number },
  pitcherLeaders: { era: number; whip: number; kPct: number; bbPct: number },
  pitcherAvgs: { era: number; whip: number; kPct: number; bbPct: number },
): LeagueStatsBlock {
  return {
    batter: {
      avg: makeSummary(batterLeaders.avg, batterAvgs.avg, 150, true),
      obp: makeSummary(batterLeaders.obp, batterAvgs.obp, 150, true),
      ops: makeSummary(batterLeaders.ops, batterAvgs.ops, 150, true),
      bbPct: makeSummary(batterLeaders.bbPct, batterAvgs.bbPct, 150, true),
      kPct: makeSummary(batterLeaders.kPct, batterAvgs.kPct, 150, false),
    },
    pitcher: {
      era: makeSummary(pitcherLeaders.era, pitcherAvgs.era, 80, false),
      whip: makeSummary(pitcherLeaders.whip, pitcherAvgs.whip, 80, false),
      kPct: makeSummary(pitcherLeaders.kPct, pitcherAvgs.kPct, 80, true),
      bbPct: makeSummary(pitcherLeaders.bbPct, pitcherAvgs.bbPct, 80, false),
    },
  }
}

export function getDevLeagueStats(): AllLeagueStats {
  return {
    AL: makeLeagueBlock(
      { avg: 0.345, obp: 0.420, ops: 1.050, bbPct: 17.2, kPct: 12.5 },
      { avg: 0.255, obp: 0.322, ops: 0.745, bbPct: 8.5,  kPct: 24.0 },
      { era: 1.42, whip: 0.82, kPct: 38.5, bbPct: 3.8 },
      { era: 4.12, whip: 1.28, kPct: 22.8, bbPct: 8.2 },
    ),
    NL: makeLeagueBlock(
      { avg: 0.352, obp: 0.428, ops: 1.080, bbPct: 16.8, kPct: 11.8 },
      { avg: 0.252, obp: 0.318, ops: 0.738, bbPct: 8.2,  kPct: 24.5 },
      { era: 1.38, whip: 0.80, kPct: 40.2, bbPct: 3.5 },
      { era: 4.08, whip: 1.25, kPct: 23.5, bbPct: 7.9 },
    ),
  }
}
