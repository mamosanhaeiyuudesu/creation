export type PlayerPosition = 'pitcher' | 'batter' | 'both'
export type League = 'AL' | 'NL'

export interface Player {
  id: string
  nameJa: string
  nameEn: string
  position: PlayerPosition
  team: string
  teamFull: string
  league: League
}

export interface BatterStats {
  playerId: string
  season: number
  date: string
  avg: number | null
  obp: number | null
  ops: number | null
  wrcPlus: number | null
  bbPct: number | null
  kPct: number | null
  war: number | null
}

export interface PitcherStats {
  playerId: string
  season: number
  date: string
  era: number | null
  fip: number | null
  whip: number | null
  kPct: number | null
  bbPct: number | null
  gbPct: number | null
  war: number | null
}

export interface StatMeta {
  key: string
  label: string
  fullName: string
  description: string
  direction: 'high' | 'low'
  format: (v: number | null) => string
}

export interface LeagueStatSummary {
  leaderValue: number
  leagueAvg: number
  sortedValues: number[]
}

export interface LeagueStatsBlock {
  batter: Partial<Record<string, LeagueStatSummary>>
  pitcher: Partial<Record<string, LeagueStatSummary>>
}

export interface AllLeagueStats {
  AL: LeagueStatsBlock
  NL: LeagueStatsBlock
}

export interface SeasonData {
  player: Player
  currentBatter: BatterStats | null
  currentPitcher: PitcherStats | null
  trendBatter: BatterStats[]
  trendPitcher: PitcherStats[]
}

export interface YearlyData {
  player: Player
  yearlyBatter: BatterStats[]
  yearlyPitcher: PitcherStats[]
}
