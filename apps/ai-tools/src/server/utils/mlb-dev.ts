import type { SeasonData, YearlyData, BatterStats, PitcherStats, AllLeagueStats, LeagueStatsBlock, LeagueStatSummary } from '~/types/mlb'
import { PLAYERS } from '~/utils/japanese-mlb-player/players'

// 2026年現在成績サンプルデータ（ローカル開発用）
const CURRENT_BATTER: Record<string, Omit<BatterStats, 'playerId' | 'season' | 'date'>> = {
  '676440': { avg: 0.278, obp: 0.362, ops: 0.842, wrcPlus: 128, bbPct: 12.8, kPct: 19.5, war: 1.2 },
  '838984': { avg: 0.261, obp: 0.335, ops: 0.795, wrcPlus: 116, bbPct: 9.2, kPct: 21.8, war: 0.9 },
  '838985': { avg: 0.248, obp: 0.342, ops: 0.825, wrcPlus: 122, bbPct: 12.5, kPct: 27.3, war: 0.8 },
  '673548': { avg: 0.287, obp: 0.358, ops: 0.858, wrcPlus: 136, bbPct: 10.1, kPct: 18.7, war: 1.5 },
  '666971': { avg: 0.256, obp: 0.347, ops: 0.782, wrcPlus: 114, bbPct: 11.4, kPct: 21.2, war: 0.7 },
  '660271': { avg: 0.301, obp: 0.388, ops: 0.982, wrcPlus: 162, bbPct: 14.2, kPct: 22.8, war: 1.9 },
}

const CURRENT_PITCHER: Record<string, Omit<PitcherStats, 'playerId' | 'season' | 'date'>> = {
  '694973': { era: 2.43, fip: 2.78, whip: 1.01, kPct: 31.2, bbPct: 6.8, gbPct: 45.3, war: 1.6 },
  '694297': { era: 2.87, fip: 3.12, whip: 1.08, kPct: 28.4, bbPct: 5.2, gbPct: 42.1, war: 1.3 },
  '838982': { era: 2.18, fip: 2.48, whip: 0.94, kPct: 33.6, bbPct: 5.8, gbPct: 47.9, war: 1.7 },
  '660271': { era: 2.32, fip: 2.58, whip: 0.97, kPct: 35.1, bbPct: 6.9, gbPct: 42.8, war: 1.5 },
  '808967': { era: 2.62, fip: 2.88, whip: 1.04, kPct: 29.3, bbPct: 5.9, gbPct: 51.8, war: 1.4 },
  '673668': { era: 2.91, fip: 3.18, whip: 1.11, kPct: 28.1, bbPct: 7.8, gbPct: 50.2, war: 0.6 },
  '506433': { era: 3.22, fip: 3.48, whip: 1.09, kPct: 26.4, bbPct: 6.9, gbPct: 38.5, war: 0.9 },
  '579328': { era: 3.84, fip: 4.08, whip: 1.21, kPct: 22.3, bbPct: 8.1, gbPct: 40.2, war: 0.5 },
  '838986': { era: 3.42, fip: 3.68, whip: 1.14, kPct: 25.2, bbPct: 8.9, gbPct: 44.1, war: 0.7 },
}

// 年度別サンプルデータ
const YEARLY_BATTER: Record<string, Array<Omit<BatterStats, 'playerId' | 'date'>>> = {
  '676440': [
    { season: 2023, avg: 0.289, obp: 0.370, ops: 0.862, wrcPlus: 134, bbPct: 11.2, kPct: 18.3, war: 3.2 },
    { season: 2024, avg: 0.271, obp: 0.352, ops: 0.821, wrcPlus: 122, bbPct: 10.8, kPct: 19.8, war: 2.8 },
    { season: 2025, avg: 0.283, obp: 0.367, ops: 0.848, wrcPlus: 129, bbPct: 11.9, kPct: 20.1, war: 3.1 },
  ],
  '838984': [
    { season: 2026, avg: 0.261, obp: 0.335, ops: 0.795, wrcPlus: 116, bbPct: 9.2, kPct: 21.8, war: 0.9 },
  ],
  '838985': [
    { season: 2026, avg: 0.248, obp: 0.342, ops: 0.825, wrcPlus: 122, bbPct: 12.5, kPct: 27.3, war: 0.8 },
  ],
  '673548': [
    { season: 2022, avg: 0.262, obp: 0.336, ops: 0.799, wrcPlus: 115, bbPct: 9.8, kPct: 22.1, war: 1.8 },
    { season: 2023, avg: 0.285, obp: 0.358, ops: 0.855, wrcPlus: 133, bbPct: 10.5, kPct: 19.3, war: 3.2 },
    { season: 2024, avg: 0.278, obp: 0.351, ops: 0.841, wrcPlus: 128, bbPct: 10.1, kPct: 20.2, war: 2.9 },
    { season: 2025, avg: 0.292, obp: 0.366, ops: 0.868, wrcPlus: 138, bbPct: 10.8, kPct: 18.9, war: 3.4 },
  ],
  '666971': [
    { season: 2022, avg: 0.228, obp: 0.321, ops: 0.728, wrcPlus: 98, bbPct: 11.2, kPct: 23.4, war: 1.4 },
    { season: 2023, avg: 0.259, obp: 0.345, ops: 0.782, wrcPlus: 113, bbPct: 11.8, kPct: 21.8, war: 2.1 },
    { season: 2024, avg: 0.247, obp: 0.338, ops: 0.762, wrcPlus: 109, bbPct: 11.5, kPct: 22.3, war: 1.8 },
    { season: 2025, avg: 0.262, obp: 0.352, ops: 0.791, wrcPlus: 117, bbPct: 12.1, kPct: 20.9, war: 2.2 },
  ],
  '660271': [
    { season: 2024, avg: 0.310, obp: 0.390, ops: 1.011, wrcPlus: 168, bbPct: 13.8, kPct: 23.1, war: 8.9 },
    { season: 2025, avg: 0.295, obp: 0.382, ops: 0.971, wrcPlus: 158, bbPct: 14.1, kPct: 22.5, war: 7.8 },
  ],
}

const YEARLY_PITCHER: Record<string, Array<Omit<PitcherStats, 'playerId' | 'date'>>> = {
  '694973': [
    { season: 2023, era: 2.98, fip: 3.12, whip: 1.07, kPct: 30.1, bbPct: 7.2, gbPct: 44.8, war: 5.5 },
    { season: 2024, era: 2.61, fip: 2.85, whip: 1.02, kPct: 31.8, bbPct: 6.5, gbPct: 46.2, war: 4.8 },
    { season: 2025, era: 2.45, fip: 2.72, whip: 0.99, kPct: 32.4, bbPct: 6.1, gbPct: 46.8, war: 5.2 },
  ],
  '694297': [
    { season: 2024, era: 3.22, fip: 3.41, whip: 1.12, kPct: 26.8, bbPct: 5.8, gbPct: 41.3, war: 4.1 },
    { season: 2025, era: 2.95, fip: 3.18, whip: 1.06, kPct: 28.2, bbPct: 5.4, gbPct: 42.8, war: 4.5 },
  ],
  '838982': [
    { season: 2024, era: 2.42, fip: 2.65, whip: 0.98, kPct: 32.1, bbPct: 6.2, gbPct: 47.2, war: 4.8 },
    { season: 2025, era: 2.28, fip: 2.51, whip: 0.95, kPct: 33.4, bbPct: 5.9, gbPct: 48.1, war: 5.3 },
  ],
  '660271': [
    { season: 2024, era: 1.98, fip: 2.21, whip: 0.88, kPct: 34.8, bbPct: 6.2, gbPct: 43.5, war: 6.2 },
    { season: 2025, era: 2.15, fip: 2.38, whip: 0.93, kPct: 35.2, bbPct: 6.6, gbPct: 42.9, war: 5.8 },
  ],
  '808967': [
    { season: 2024, era: 3.00, fip: 3.24, whip: 1.08, kPct: 28.1, bbPct: 6.3, gbPct: 50.8, war: 4.2 },
    { season: 2025, era: 2.71, fip: 2.94, whip: 1.03, kPct: 29.8, bbPct: 5.8, gbPct: 52.1, war: 5.1 },
  ],
  '673668': [
    { season: 2024, era: 3.12, fip: 3.35, whip: 1.14, kPct: 27.2, bbPct: 8.1, gbPct: 49.8, war: 1.2 },
    { season: 2025, era: 2.98, fip: 3.21, whip: 1.10, kPct: 28.5, bbPct: 7.6, gbPct: 50.8, war: 1.5 },
  ],
  '506433': [
    { season: 2020, era: 2.01, fip: 2.48, whip: 0.96, kPct: 32.1, bbPct: 7.8, gbPct: 36.2, war: 2.8 },
    { season: 2021, era: 4.22, fip: 3.95, whip: 1.31, kPct: 23.8, bbPct: 8.9, gbPct: 37.1, war: 1.2 },
    { season: 2022, era: 3.10, fip: 3.22, whip: 1.09, kPct: 26.4, bbPct: 7.2, gbPct: 38.8, war: 3.2 },
    { season: 2023, era: 4.56, fip: 4.21, whip: 1.38, kPct: 22.1, bbPct: 8.5, gbPct: 37.5, war: 0.8 },
    { season: 2024, era: 3.45, fip: 3.62, whip: 1.15, kPct: 25.8, bbPct: 7.1, gbPct: 38.9, war: 2.1 },
    { season: 2025, era: 3.28, fip: 3.44, whip: 1.11, kPct: 26.8, bbPct: 6.8, gbPct: 39.2, war: 2.4 },
  ],
  '579328': [
    { season: 2022, era: 4.12, fip: 4.28, whip: 1.28, kPct: 21.8, bbPct: 9.2, gbPct: 39.5, war: 1.4 },
    { season: 2023, era: 3.86, fip: 4.02, whip: 1.22, kPct: 22.8, bbPct: 8.8, gbPct: 40.2, war: 1.8 },
    { season: 2024, era: 3.52, fip: 3.78, whip: 1.18, kPct: 23.5, bbPct: 8.4, gbPct: 41.1, war: 2.1 },
    { season: 2025, era: 3.72, fip: 3.94, whip: 1.19, kPct: 22.9, bbPct: 8.2, gbPct: 40.8, war: 1.9 },
  ],
  '838986': [
    { season: 2026, era: 3.42, fip: 3.68, whip: 1.14, kPct: 25.2, bbPct: 8.9, gbPct: 44.1, war: 0.7 },
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
      avg: Math.max(0.15, Math.min(0.400, base.avg + rng() * 0.04 * (1 - prog * 0.5))),
      obp: Math.max(0.22, Math.min(0.500, base.obp + rng() * 0.04 * (1 - prog * 0.5))),
      ops: Math.max(0.55, Math.min(1.200, base.ops + rng() * 0.06 * (1 - prog * 0.5))),
      wrcPlus: Math.max(60, Math.min(200, (base.wrcPlus ?? 100) + rng() * 20 * (1 - prog * 0.5))),
      bbPct: Math.max(3, Math.min(22, (base.bbPct ?? 8) + rng() * 3)),
      kPct: Math.max(8, Math.min(38, (base.kPct ?? 22) + rng() * 4)),
      war: Math.max(0, (base.war ?? 0) * prog + rng() * 0.2),
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
      fip: Math.max(1.0, Math.min(7.0, (base.fip ?? 3.8) + rng() * 0.6 * (1 - prog * 0.6))),
      whip: Math.max(0.5, Math.min(2.0, (base.whip ?? 1.2) + rng() * 0.2 * (1 - prog * 0.6))),
      kPct: Math.max(10, Math.min(45, (base.kPct ?? 25) + rng() * 5)),
      bbPct: Math.max(2, Math.min(18, (base.bbPct ?? 8) + rng() * 3)),
      gbPct: Math.max(25, Math.min(65, (base.gbPct ?? 43) + rng() * 6)),
      war: Math.max(0, (base.war ?? 0) * prog + rng() * 0.15),
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

  const yb = (YEARLY_BATTER[playerId] ?? []).map(s => ({ playerId, date: '', ...s } as BatterStats))
  const yp = (YEARLY_PITCHER[playerId] ?? []).map(s => ({ playerId, date: '', ...s } as PitcherStats))

  if (!yb.length && !yp.length) {
    // 2026年のみのデータとして返す
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
  batterLeaders: { avg: number; obp: number; ops: number; wrcPlus: number; bbPct: number; kPct: number; war: number },
  batterAvgs: { avg: number; obp: number; ops: number; wrcPlus: number; bbPct: number; kPct: number; war: number },
  pitcherLeaders: { era: number; fip: number; whip: number; kPct: number; bbPct: number; gbPct: number; war: number },
  pitcherAvgs: { era: number; fip: number; whip: number; kPct: number; bbPct: number; gbPct: number; war: number },
): LeagueStatsBlock {
  return {
    batter: {
      avg: makeSummary(batterLeaders.avg, batterAvgs.avg, 150, true),
      obp: makeSummary(batterLeaders.obp, batterAvgs.obp, 150, true),
      ops: makeSummary(batterLeaders.ops, batterAvgs.ops, 150, true),
      wrcPlus: makeSummary(batterLeaders.wrcPlus, batterAvgs.wrcPlus, 150, true),
      bbPct: makeSummary(batterLeaders.bbPct, batterAvgs.bbPct, 150, true),
      kPct: makeSummary(batterLeaders.kPct, batterAvgs.kPct, 150, false),
      war: makeSummary(batterLeaders.war, batterAvgs.war, 150, true),
    },
    pitcher: {
      era: makeSummary(pitcherLeaders.era, pitcherAvgs.era, 80, false),
      fip: makeSummary(pitcherLeaders.fip, pitcherAvgs.fip, 80, false),
      whip: makeSummary(pitcherLeaders.whip, pitcherAvgs.whip, 80, false),
      kPct: makeSummary(pitcherLeaders.kPct, pitcherAvgs.kPct, 80, true),
      bbPct: makeSummary(pitcherLeaders.bbPct, pitcherAvgs.bbPct, 80, false),
      gbPct: makeSummary(pitcherLeaders.gbPct, pitcherAvgs.gbPct, 80, true),
      war: makeSummary(pitcherLeaders.war, pitcherAvgs.war, 80, true),
    },
  }
}

export function getDevLeagueStats(): AllLeagueStats {
  return {
    AL: makeLeagueBlock(
      { avg: 0.345, obp: 0.420, ops: 1.050, wrcPlus: 180, bbPct: 17.2, kPct: 12.5, war: 4.2 },
      { avg: 0.255, obp: 0.322, ops: 0.745, wrcPlus: 100, bbPct: 8.5,  kPct: 24.0, war: 1.2 },
      { era: 1.42, fip: 1.65, whip: 0.82, kPct: 38.5, bbPct: 3.8, gbPct: 58.2, war: 3.8 },
      { era: 4.12, fip: 4.05, whip: 1.28, kPct: 22.8, bbPct: 8.2,  gbPct: 43.0, war: 1.1 },
    ),
    NL: makeLeagueBlock(
      { avg: 0.352, obp: 0.428, ops: 1.080, wrcPlus: 185, bbPct: 16.8, kPct: 11.8, war: 4.5 },
      { avg: 0.252, obp: 0.318, ops: 0.738, wrcPlus: 100, bbPct: 8.2,  kPct: 24.5, war: 1.1 },
      { era: 1.38, fip: 1.58, whip: 0.80, kPct: 40.2, bbPct: 3.5, gbPct: 60.1, war: 4.0 },
      { era: 4.08, fip: 4.00, whip: 1.25, kPct: 23.5, bbPct: 7.9,  gbPct: 44.0, war: 1.0 },
    ),
  }
}
