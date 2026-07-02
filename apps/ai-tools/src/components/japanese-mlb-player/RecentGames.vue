<script setup lang="ts">
import type { SeasonData, AllLeagueStats } from '~/types/mlb'
import { PLAYERS, PLAYER_COLORS } from '~/utils/japanese-mlb-player/players'

const props = defineProps<{
  playerIds: string[]
  seasonDataMap: Map<string, SeasonData>
  mode: 'pitcher' | 'batter'
  leagueStats?: AllLeagueStats | null
  league?: 'AL' | 'NL'
  standings?: Record<string, number> | null
}>()

const PITCHER_DAYS = 1
const BATTER_DAYS = 1
const PITCHER_MAX_GAMES = 1
const BATTER_MAX_GAMES = 1

// trendPitcher の inningsPitched は outs/3 形式 (e.g. 20/3 ≈ 6.667 for 6.2 innings)
function ipToTrueOuts(ip: number | null | undefined): number {
  if (!ip && ip !== 0) return 0
  return Math.round(ip * 3)
}

function outsToDisplay(outs: number): string {
  const full = Math.floor(outs / 3)
  const partial = outs % 3
  return partial === 0 ? String(full) : `${full}.${partial}`
}

function parseIpToOuts(ip: string): number {
  const [whole, partial] = ip.split('.')
  return parseInt(whole || '0') * 3 + parseInt(partial || '0')
}

function formatDate(d: string | null | undefined): string {
  if (!d) return ''
  if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return d
  // MLB試合日（US現地日付）に+1日してJST日付に変換
  const date = new Date(d.slice(0, 10) + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + 1)
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`
}

// bbk = bb/so なので cumBB = strikeouts * bbk
function estimateCumBB(strikeouts: number | null, bbk: number | null): number {
  if (!strikeouts || bbk === null) return 0
  return Math.round(strikeouts * bbk)
}

interface PitcherRow { date: string; result: '勝' | '負' | '-'; ip: string; runsAllowed: number; er: number }
interface BatterRow { date: string; ab: number; hits: number; hr: number; rbi: number; runs: number }

interface FormBadge {
  label: '絶好調' | '好調' | '普通' | '不調' | '絶不調'
  icon: string
  bgColor: string
  textColor: string
}

function getFormBadge(score: number | null): FormBadge | null {
  if (score === null) return null
  if (score > 0.20) return { label: '絶好調', icon: '😁', bgColor: '#fef2f2', textColor: '#dc2626' }
  if (score > 0.07) return { label: '好調',   icon: '😊', bgColor: '#f0fdf4', textColor: '#16a34a' }
  if (score > -0.07) return { label: '普通',  icon: '😐', bgColor: '#f8fafc', textColor: '#475569' }
  if (score > -0.20) return { label: '不調',  icon: '😕', bgColor: '#fffbeb', textColor: '#d97706' }
  return { label: '絶不調', icon: '😞', bgColor: '#fdf4ff', textColor: '#7c3aed' }
}

interface Card {
  id: string
  nameJa: string
  color: string
  sportnavi: string
  league: 'AL' | 'NL'
  teamAbbr: string
  teamShort: string
  divisionRank: number | null
  noData: boolean
  hasRecentData: boolean
  form?: FormBadge | null
  pitcherRows?: PitcherRow[]
  batterRows?: BatterRow[]
  pitcherTotals?: { wins: number | null; losses: number | null; ip: string; era: string; fip: string; k: number | null; bb: number | null; runsAllowed: number | null; eraDirection: 'up' | 'down' | null }
  batterTotals?: { avg: number | null; obp: number | null; ops: number | null; ab: number | null; hits: number | null; hr: number | null; rbi: number | null; runs: number | null; so: number | null; walks: number | null; tb: number | null }
}

function teamShortName(teamFull: string): string {
  const parts = teamFull.split('・')
  return parts[parts.length - 1]
}

type PitcherTotals = NonNullable<Card['pitcherTotals']>

function buildPitcherTotals(data: SeasonData): PitcherTotals {
  const c = data.currentPitcher
  if (!c) return { wins: null, losses: null, ip: '-', era: '-', fip: '-', k: null, bb: null, runsAllowed: null, eraDirection: null }
  const bb = c.strikeouts !== null && c.bbk !== null ? estimateCumBB(c.strikeouts, c.bbk) : null
  return {
    wins: c.wins,
    losses: c.losses,
    ip: c.inningsPitched !== null ? String(c.inningsPitched) : '-',
    era: c.era !== null ? c.era.toFixed(2) : '-',
    fip: c.fip !== null && c.fip !== undefined ? c.fip.toFixed(2) : '-',
    k: c.strikeouts,
    bb,
    runsAllowed: c.runsAllowed,
    eraDirection: null,
  }
}

function buildBatterTotals(data: SeasonData): Card['batterTotals'] {
  const c = data.currentBatter
  return {
    avg: c?.avg ?? null,
    obp: c?.obp ?? null,
    ops: c?.ops ?? null,
    ab: c?.atBats ?? null,
    hits: c?.hits ?? null,
    hr: c?.hr ?? null,
    rbi: c?.rbi ?? null,
    runs: c?.runs ?? null,
    so: c?.strikeouts ?? null,
    walks: c?.walks ?? null,
    tb: c?.totalBases ?? null,
  }
}

const cards = computed((): Card[] => {
  return props.playerIds.map(id => {
    const player = PLAYERS.find(p => p.id === id)
    const data = props.seasonDataMap.get(id)
    const nameJa = player?.nameJa ?? id
    const color = PLAYER_COLORS[id] ?? '#64748b'
    const sportnavi = player?.sportnavi ?? ''
    const league = player?.league ?? 'NL'
    const teamAbbr = player?.team ?? ''
    const teamShort = player ? teamShortName(player.teamFull) : ''
    const divisionRank = props.standings?.[teamAbbr] ?? null

    if (!data) return { id, nameJa, color, sportnavi, league, teamAbbr, teamShort, divisionRank, noData: true, hasRecentData: false }

    if (props.mode === 'pitcher') {
      const trend = data.trendPitcher
      const firstIdx = trend.findIndex(e => isWithinDays(e.date, PITCHER_DAYS))
      if (firstIdx === -1) {
        return { id, nameJa, color, sportnavi, league, teamAbbr, teamShort, divisionRank, noData: false, hasRecentData: false, form: null, pitcherRows: [], pitcherTotals: buildPitcherTotals(data) }
      }
      const allRecent = trend.slice(firstIdx)
      const entries = allRecent.slice(-PITCHER_MAX_GAMES)
      const entryStartIdx = trend.indexOf(entries[0])
      const beforeFirst = entryStartIdx > 0 ? trend[entryStartIdx - 1] : null

      const rows: PitcherRow[] = entries.map((curr, i) => {
        const prev = i === 0 ? beforeFirst : entries[i - 1]
        const currOuts = ipToTrueOuts(curr.inningsPitched)
        const prevOuts = ipToTrueOuts(prev?.inningsPitched)
        const gameOuts = Math.max(0, currOuts - prevOuts)

        const currER = (curr.era ?? 0) * currOuts / 27
        const prevER = prev ? (prev.era ?? 0) * prevOuts / 27 : 0
        const gameER = Math.max(0, Math.round(currER - prevER))

        const currRA = curr.runsAllowed ?? 0
        const prevRA = prev?.runsAllowed ?? 0
        const gameWins = Math.max(0, (curr.wins ?? 0) - (prev?.wins ?? 0))
        const gameLosses = Math.max(0, (curr.losses ?? 0) - (prev?.losses ?? 0))
        return {
          date: formatDate(curr.date),
          result: gameWins > 0 ? '勝' : gameLosses > 0 ? '負' : '-',
          ip: outsToDisplay(gameOuts),
          runsAllowed: Math.max(0, currRA - prevRA),
          er: gameER,
        }
      })

      // 直近登板の実績ERA（直近2登板の合計ER/IP）をリーグ平均ERAと比較して調子評価
      const totalRecentER = rows.reduce((s, r) => s + r.er, 0)
      const totalRecentOuts = rows.reduce((s, r) => s + parseIpToOuts(r.ip), 0)
      const recentEra = totalRecentOuts > 0 ? (totalRecentER / totalRecentOuts) * 27 : null
      const leagueAvgEra = props.leagueStats?.[league as 'AL' | 'NL']?.pitcher?.era?.leagueAvg ?? 4.50
      const formScore = recentEra !== null
        ? (leagueAvgEra - recentEra) / leagueAvgEra
        : null
      const form = getFormBadge(formScore)

      const baseTotals = buildPitcherTotals(data)
      const eraDirection: 'up' | 'down' | null = (() => {
        if (!entries.length || !beforeFirst) return null
        const currEra = entries[entries.length - 1].era
        const prevEra = beforeFirst.era
        if (currEra === null || prevEra === null) return null
        return currEra < prevEra ? 'down' : currEra > prevEra ? 'up' : null
      })()
      return { id, nameJa, color, sportnavi, league, teamAbbr, teamShort, divisionRank, noData: false, hasRecentData: true, form, pitcherRows: rows, pitcherTotals: { ...baseTotals, eraDirection } }
    } else {
      const trend = data.trendBatter
      const firstIdx = trend.findIndex(e => isWithinDays(e.date, BATTER_DAYS))
      if (firstIdx === -1) {
        return { id, nameJa, color, sportnavi, league, teamAbbr, teamShort, divisionRank, noData: false, hasRecentData: false, form: null, batterRows: [], batterTotals: buildBatterTotals(data) }
      }
      const allRecent = trend.slice(firstIdx)
      const entries = allRecent.slice(-BATTER_MAX_GAMES)
      const entryStartIdx = trend.indexOf(entries[0])
      const beforeFirst = entryStartIdx > 0 ? trend[entryStartIdx - 1] : null

      const rows: BatterRow[] = entries.map((curr, i) => {
        const prev = i === 0 ? beforeFirst : entries[i - 1]
        return {
          date: formatDate(curr.date),
          ab: Math.max(0, (curr.atBats ?? 0) - (prev?.atBats ?? 0)),
          hits: Math.max(0, (curr.hits ?? 0) - (prev?.hits ?? 0)),
          hr: Math.max(0, (curr.hr ?? 0) - (prev?.hr ?? 0)),
          rbi: Math.max(0, (curr.rbi ?? 0) - (prev?.rbi ?? 0)),
          runs: Math.max(0, (curr.runs ?? 0) - (prev?.runs ?? 0)),
        }
      })

      // 直近試合の実際の hits/ab から打率を算出してリーグ平均打率と比較
      const totalRecentAB = rows.reduce((s, r) => s + r.ab, 0)
      const totalRecentHits = rows.reduce((s, r) => s + r.hits, 0)
      const recentAvgVal = totalRecentAB >= 5 ? totalRecentHits / totalRecentAB : null
      const leagueAvgAvg = props.leagueStats?.[league as 'AL' | 'NL']?.batter?.avg?.leagueAvg ?? 0.252
      const formScore = recentAvgVal !== null
        ? (recentAvgVal - leagueAvgAvg) / leagueAvgAvg
        : null
      const form = getFormBadge(formScore)

      return { id, nameJa, color, sportnavi, league, teamAbbr, teamShort, divisionRank, noData: false, hasRecentData: true, form, batterRows: rows, batterTotals: buildBatterTotals(data) }
    }
  })
})

function shortName(nameJa: string): string {
  if (nameJa.includes('・')) return nameJa.split('・').pop() ?? nameJa
  return nameJa.split(' ')[0]
}

function getPlayerRank(playerId: string, key: string, direction: 'high' | 'low'): number {
  if (!props.leagueStats || !props.league) return 999
  const data = props.seasonDataMap.get(playerId)
  if (!data) return 999
  const stats = props.mode === 'pitcher' ? data.currentPitcher : data.currentBatter
  if (!stats) return 999
  const val = (stats as unknown as Record<string, unknown>)[key] as number | null
  if (val === null || val === undefined) return 999
  const block = props.leagueStats[props.league]
  const ctx = props.mode === 'pitcher' ? block.pitcher[key] : block.batter[key]
  if (!ctx) return 999
  let rank = 1
  for (const v of ctx.sortedValues) {
    if (direction === 'high' ? v > val : v < val) rank++
    else break
  }
  return rank
}

function rankStyle(rank: number): object {
  if (rank >= 1 && rank <= 10) return { color: '#C42121', fontWeight: '600' }
  return { color: '#64748b' }
}

function isRecent(dateStr: string): boolean {
  if (!dateStr) return false
  const parts = dateStr.split('/')
  if (parts.length !== 2) return false
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const gameDate = new Date(Date.UTC(jstNow.getUTCFullYear(), parseInt(parts[0]) - 1, parseInt(parts[1])))
  const diffDays = (jstNow.getTime() - gameDate.getTime()) / 86400000
  return diffDays >= 0 && diffDays < 1
}

function rawDateToJST(d: string | null | undefined): Date | null {
  if (!d || !/^\d{4}-\d{2}-\d{2}/.test(d)) return null
  const date = new Date(d.slice(0, 10) + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + 1)
  return date
}

function isWithinDays(d: string | null | undefined, days: number): boolean {
  const gameDate = rawDateToJST(d)
  if (!gameDate) return false
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const cutoff = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()))
  cutoff.setUTCDate(cutoff.getUTCDate() - days)
  return gameDate >= cutoff
}
</script>

<template>
  <div>
    <div v-if="cards.length === 0" class="py-6 text-center text-xs text-slate-400 tracking-wide">
      データがありません
    </div>
    <div v-else class="rounded-lg border border-slate-100 bg-white overflow-hidden">
      <div class="overflow-x-auto">
      <div class="min-w-max">
      <template v-for="card in cards.filter(c => c.noData || c.hasRecentData)" :key="card.id">

        <!-- ローディング -->
        <div
          v-if="card.noData"
          class="flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 last:border-b-0 animate-pulse"
          :style="{ borderLeft: `2px solid ${card.color}` }"
        >
          <div class="w-16 h-2.5 bg-slate-100 rounded"></div>
          <div class="w-8 h-2.5 bg-slate-100 rounded"></div>
          <div class="w-32 h-2.5 bg-slate-100 rounded"></div>
          <div class="w-px h-3 bg-slate-100 mx-1"></div>
          <div class="w-24 h-2.5 bg-slate-100 rounded"></div>
        </div>

        <!-- 投手行 -->
        <div
          v-else-if="mode === 'pitcher' && card.pitcherRows?.[0]"
          class="flex items-center gap-x-2 px-3 py-2 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-colors whitespace-nowrap"
          :style="{ borderLeft: `2px solid ${card.color}` }"
        >
          <!-- 選手名 -->
          <span class="text-[14px] font-bold w-[80px] flex-shrink-0 truncate leading-tight" :style="{ color: card.color }">{{ shortName(card.nameJa) }}</span>
          <!-- チーム・順位 -->
          <span class="text-[13px] text-slate-400 w-[46px] flex-shrink-0 leading-tight">{{ card.teamAbbr }}<span v-if="card.divisionRank !== null" class="text-[12px]"> {{ card.divisionRank }}位</span></span>
          <!-- ゲーム成績 -->
          <div class="flex items-center gap-x-2 flex-shrink-0 w-[196px]">
            <span class="text-[13px] font-mono text-slate-500 w-[30px]">{{ card.pitcherRows[0].date }}</span>
            <span
              v-if="card.pitcherRows[0].result !== '-'"
              class="inline-flex items-center justify-center w-[22px] h-[19px] rounded text-[12px] font-bold flex-shrink-0"
              :class="card.pitcherRows[0].result === '勝' ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'"
            >{{ card.pitcherRows[0].result }}</span>
            <span v-else class="text-[13px] text-slate-300 w-[22px] text-center flex-shrink-0">—</span>
            <span class="text-[14px] font-mono tabular-nums text-slate-700 w-[40px] flex-shrink-0">{{ card.pitcherRows[0].ip }}<span class="text-[12px] text-slate-400">回</span></span>
            <span class="text-[14px] font-mono tabular-nums text-slate-600 w-[26px] flex-shrink-0">{{ card.pitcherRows[0].runsAllowed }}<span class="text-[12px] text-slate-400">失</span></span>
            <span class="text-[14px] font-mono tabular-nums text-slate-600 w-[26px] flex-shrink-0">{{ card.pitcherRows[0].er }}<span class="text-[12px] text-slate-400">責</span></span>
          </div>

          <div class="w-px h-3 bg-slate-200 flex-shrink-0 ml-4"></div>

          <!-- シーズン計: 勝敗・ERA↑↓ -->
          <span class="text-[13px] text-slate-500 flex-shrink-0" :style="rankStyle(getPlayerRank(card.id, 'wins', 'high'))">{{ card.pitcherTotals?.wins ?? '-' }}勝{{ card.pitcherTotals?.losses ?? '-' }}敗</span>
          <span class="text-[13px] font-mono text-slate-500 flex-shrink-0" :style="rankStyle(getPlayerRank(card.id, 'era', 'low'))">
            ERA{{ card.pitcherTotals?.era ?? '-' }}<span
              v-if="card.pitcherTotals?.eraDirection"
              class="font-bold"
              :class="card.pitcherTotals.eraDirection === 'down' ? 'text-emerald-500' : 'text-red-400'"
            >{{ card.pitcherTotals.eraDirection === 'down' ? '↓' : '↑' }}</span>
          </span>
        </div>

        <!-- 野手行 -->
        <div
          v-else-if="mode === 'batter' && card.batterRows?.[0]"
          class="flex items-center gap-x-2 px-3 py-2 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-colors whitespace-nowrap"
          :style="{ borderLeft: `2px solid ${card.color}` }"
        >
          <!-- 選手名 -->
          <span class="text-[14px] font-bold w-[80px] flex-shrink-0 truncate leading-tight" :style="{ color: card.color }">{{ shortName(card.nameJa) }}</span>
          <!-- チーム・順位 -->
          <span class="text-[13px] text-slate-400 w-[46px] flex-shrink-0 leading-tight">{{ card.teamAbbr }}<span v-if="card.divisionRank !== null" class="text-[12px]"> {{ card.divisionRank }}位</span></span>
          <!-- ゲーム成績 -->
          <div class="flex items-center gap-x-2 flex-shrink-0">
            <span class="text-[13px] font-mono text-slate-500 w-[30px] flex-shrink-0">{{ card.batterRows[0].date }}</span>
            <span class="text-[14px] font-mono tabular-nums text-slate-700 w-[26px] flex-shrink-0">{{ card.batterRows[0].ab }}<span class="text-[12px] text-slate-400">打</span></span>
            <span
              class="text-[14px] font-mono tabular-nums w-[24px] flex-shrink-0"
              :class="card.batterRows[0].hits > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-600'"
            >{{ card.batterRows[0].hits }}<span class="text-[12px] text-slate-400">安</span></span>
            <span
              class="text-[14px] font-mono tabular-nums w-[28px] flex-shrink-0"
              :class="card.batterRows[0].hr > 0 ? 'text-amber-600 font-bold' : 'text-slate-600'"
            >{{ card.batterRows[0].hr }}<span class="text-[12px] text-slate-400">HR</span></span>
            <span class="text-[14px] font-mono tabular-nums text-slate-600 w-[26px] flex-shrink-0">{{ card.batterRows[0].rbi }}<span class="text-[12px] text-slate-400">打</span></span>
            <span class="text-[14px] font-mono tabular-nums text-slate-600 w-[24px] flex-shrink-0">{{ card.batterRows[0].runs }}<span class="text-[12px] text-slate-400">得</span></span>
          </div>

          <div class="w-px h-3 bg-slate-200 flex-shrink-0 ml-4"></div>

          <!-- シーズン計: 打率・安打・HR・打点・得点 -->
          <span class="text-[13px] font-mono text-slate-500 flex-shrink-0" :style="rankStyle(getPlayerRank(card.id, 'avg', 'high'))">{{ card.batterTotals?.avg !== null && card.batterTotals?.avg !== undefined ? card.batterTotals.avg.toFixed(3).replace(/^0/, '') : '-' }}</span>
          <span class="text-[13px] font-mono tabular-nums text-slate-500 flex-shrink-0" :style="rankStyle(getPlayerRank(card.id, 'hits', 'high'))">{{ card.batterTotals?.hits ?? '-' }}<span class="text-[12px] text-slate-400">安</span></span>
          <span class="text-[13px] font-mono tabular-nums text-slate-500 flex-shrink-0" :style="rankStyle(getPlayerRank(card.id, 'hr', 'high'))">{{ card.batterTotals?.hr ?? 0 }}<span class="text-[12px] text-slate-400">本</span></span>
          <span class="text-[13px] font-mono tabular-nums text-slate-500 flex-shrink-0" :style="rankStyle(getPlayerRank(card.id, 'rbi', 'high'))">{{ card.batterTotals?.rbi ?? '-' }}<span class="text-[12px] text-slate-400">打</span></span>
          <span class="text-[13px] font-mono tabular-nums text-slate-500 flex-shrink-0" :style="rankStyle(getPlayerRank(card.id, 'runs', 'high'))">{{ card.batterTotals?.runs ?? '-' }}<span class="text-[12px] text-slate-400">得</span></span>
        </div>

      </template>
      </div>
      </div>
    </div>
  </div>
</template>
