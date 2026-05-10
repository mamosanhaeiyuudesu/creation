<script setup lang="ts">
import type { SeasonData, AllLeagueStats } from '~/types/mlb'
import { PLAYERS, PLAYER_COLORS } from '~/utils/japanese-mlb-player/players'

const props = defineProps<{
  playerIds: string[]
  seasonDataMap: Map<string, SeasonData>
  mode: 'pitcher' | 'batter'
  leagueStats?: AllLeagueStats | null
  league?: 'AL' | 'NL'
}>()

const PITCHER_GAMES = 3
const BATTER_GAMES = 6

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

function formatDate(d: string | null | undefined): string {
  if (!d) return ''
  const m = d.match(/\d{4}-(\d{2})-(\d{2})/)
  if (!m) return d
  return `${parseInt(m[1])}/${parseInt(m[2])}`
}

// bbk = bb/so なので cumBB = strikeouts * bbk
function estimateCumBB(strikeouts: number | null, bbk: number | null): number {
  if (!strikeouts || bbk === null) return 0
  return Math.round(strikeouts * bbk)
}

interface PitcherRow { date: string; result: '勝' | '負' | '-'; ip: string; runsAllowed: number; er: number; k: number; bb: number }
interface BatterRow { date: string; ab: number; hits: number; hr: number; rbi: number; runs: number; so: number; walks: number; tb: number }

interface Card {
  id: string
  nameJa: string
  color: string
  sportnavi: string
  noData: boolean
  pitcherRows?: PitcherRow[]
  batterRows?: BatterRow[]
  pitcherTotals?: { wins: number | null; losses: number | null; ip: string; era: string; k: number | null; bb: number | null; runsAllowed: number | null }
  batterTotals?: { avg: number | null; obp: number | null; ops: number | null; ab: number | null; hits: number | null; hr: number | null; rbi: number | null; runs: number | null; so: number | null; walks: number | null; tb: number | null }
}

function buildPitcherTotals(data: SeasonData): Card['pitcherTotals'] {
  const c = data.currentPitcher
  if (!c) return { wins: null, losses: null, ip: '-', era: '-', k: null, bb: null, runsAllowed: null }
  const bb = c.strikeouts !== null && c.bbk !== null ? estimateCumBB(c.strikeouts, c.bbk) : null
  return {
    wins: c.wins,
    losses: c.losses,
    ip: c.inningsPitched !== null ? String(c.inningsPitched) : '-',
    era: c.era !== null ? c.era.toFixed(2) : '-',
    k: c.strikeouts,
    bb,
    runsAllowed: c.runsAllowed,
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

    if (!data) return { id, nameJa, color, sportnavi, noData: true }

    if (props.mode === 'pitcher') {
      const trend = data.trendPitcher
      const n = Math.min(PITCHER_GAMES, trend.length)
      const entries = trend.slice(-n)
      const beforeFirst = trend.length > n ? trend[trend.length - n - 1] : null

      const rows: PitcherRow[] = entries.map((curr, i) => {
        const prev = i === 0 ? beforeFirst : entries[i - 1]
        const currOuts = ipToTrueOuts(curr.inningsPitched)
        const prevOuts = ipToTrueOuts(prev?.inningsPitched)
        const gameOuts = Math.max(0, currOuts - prevOuts)

        const currER = (curr.era ?? 0) * currOuts / 27
        const prevER = prev ? (prev.era ?? 0) * prevOuts / 27 : 0
        const gameER = Math.max(0, Math.round(currER - prevER))

        const currBB = estimateCumBB(curr.strikeouts, curr.bbk)
        const prevBB = estimateCumBB(prev?.strikeouts, prev?.bbk)

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
          k: Math.max(0, (curr.strikeouts ?? 0) - (prev?.strikeouts ?? 0)),
          bb: Math.max(0, currBB - prevBB),
        }
      })

      return { id, nameJa, color, sportnavi, noData: false, pitcherRows: rows, pitcherTotals: buildPitcherTotals(data) }
    } else {
      const trend = data.trendBatter
      const n = Math.min(BATTER_GAMES, trend.length)
      const entries = trend.slice(-n)
      const beforeFirst = trend.length > n ? trend[trend.length - n - 1] : null

      const rows: BatterRow[] = entries.map((curr, i) => {
        const prev = i === 0 ? beforeFirst : entries[i - 1]
        return {
          date: formatDate(curr.date),
          ab: Math.max(0, (curr.atBats ?? 0) - (prev?.atBats ?? 0)),
          hits: Math.max(0, (curr.hits ?? 0) - (prev?.hits ?? 0)),
          hr: Math.max(0, (curr.hr ?? 0) - (prev?.hr ?? 0)),
          rbi: Math.max(0, (curr.rbi ?? 0) - (prev?.rbi ?? 0)),
          runs: Math.max(0, (curr.runs ?? 0) - (prev?.runs ?? 0)),
          so: Math.max(0, (curr.strikeouts ?? 0) - (prev?.strikeouts ?? 0)),
          walks: Math.max(0, (curr.walks ?? 0) - (prev?.walks ?? 0)),
          tb: Math.max(0, (curr.totalBases ?? 0) - (prev?.totalBases ?? 0)),
        }
      })

      return { id, nameJa, color, sportnavi, noData: false, batterRows: rows, batterTotals: buildBatterTotals(data) }
    }
  })
})

const numColor = 'rgb(135, 148, 160)'

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
  if (rank >= 1 && rank <= 5) return { color: '#C42121', fontWeight: '600' }
  if (rank >= 6 && rank <= 10) return { color: '#BA7373' }
  return {}
}

function rankLabel(rank: number): string {
  return rank <= 10 ? `（${rank}位）` : ''
}

function isRecent(dateStr: string): boolean {
  if (!dateStr) return false
  const parts = dateStr.split('/')
  if (parts.length !== 2) return false
  const now = new Date()
  const gameDate = new Date(now.getFullYear(), parseInt(parts[0]) - 1, parseInt(parts[1]))
  const diffDays = (now.getTime() - gameDate.getTime()) / 86400000
  return diffDays >= 0 && diffDays < 2
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    <div v-if="cards.length === 0" class="col-span-full py-12 text-center text-xs text-slate-400 tracking-wide">
      データがありません
    </div>

    <div
      v-for="card in cards"
      :key="card.id"
      class="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden"
    >
      <!-- カードヘッダー：プレイヤーカラーの左ライン -->
      <div class="flex items-start gap-3 px-4 pt-3.5 pb-3 border-b border-slate-100" :style="{ borderLeft: `3px solid ${card.color}` }">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-bold tracking-tight leading-none" :style="{ color: card.color }">{{ card.nameJa }}</span>
            <a
              v-if="card.sportnavi"
              :href="`https://baseball.yahoo.co.jp/mlb/player/${card.sportnavi}/top`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
              title="スポナビで見る"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z" clip-rule="evenodd"/>
              </svg>
            </a>
          </div>
          <!-- シーズン成績チップ -->
          <div class="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <template v-if="mode === 'pitcher' && card.pitcherTotals">
              <span class="inline-flex items-center gap-0.5 rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 tracking-wide">
                {{ card.pitcherTotals.wins ?? '-' }}勝<span :style="rankStyle(getPlayerRank(card.id, 'wins', 'high'))">{{ rankLabel(getPlayerRank(card.id, 'wins', 'high')) }}</span> {{ card.pitcherTotals.losses ?? '-' }}敗
              </span>
              <span class="inline-flex items-center gap-0.5 rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 tracking-wide">
                {{ card.pitcherTotals.ip !== '-' ? card.pitcherTotals.ip + '回' : '-' }}<span :style="rankStyle(getPlayerRank(card.id, 'inningsPitched', 'high'))">{{ rankLabel(getPlayerRank(card.id, 'inningsPitched', 'high')) }}</span>
              </span>
              <span class="inline-flex items-center gap-0.5 rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 tracking-wide">
                防御率 {{ card.pitcherTotals.era ?? '-' }}<span :style="rankStyle(getPlayerRank(card.id, 'era', 'low'))">{{ rankLabel(getPlayerRank(card.id, 'era', 'low')) }}</span>
              </span>
            </template>
            <template v-if="mode === 'batter' && card.batterTotals">
              <span class="inline-flex items-center rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 tracking-wide">
                打率 {{ card.batterTotals.avg !== null ? card.batterTotals.avg.toFixed(3).replace(/^0/, '') : '-' }}<span :style="rankStyle(getPlayerRank(card.id, 'avg', 'high'))">{{ rankLabel(getPlayerRank(card.id, 'avg', 'high')) }}</span>
              </span>
              <span class="inline-flex items-center rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 tracking-wide">
                出塁率 {{ card.batterTotals.obp !== null ? card.batterTotals.obp.toFixed(3).replace(/^0/, '') : '-' }}<span :style="rankStyle(getPlayerRank(card.id, 'obp', 'high'))">{{ rankLabel(getPlayerRank(card.id, 'obp', 'high')) }}</span>
              </span>
              <span class="inline-flex items-center rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 tracking-wide">
                OPS {{ card.batterTotals.ops !== null ? card.batterTotals.ops.toFixed(3).replace(/^0/, '') : '-' }}<span :style="rankStyle(getPlayerRank(card.id, 'ops', 'high'))">{{ rankLabel(getPlayerRank(card.id, 'ops', 'high')) }}</span>
              </span>
              <span class="inline-flex items-center rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 tracking-wide">
                {{ card.batterTotals.hr ?? '-' }} HR<span :style="rankStyle(getPlayerRank(card.id, 'hr', 'high'))">{{ rankLabel(getPlayerRank(card.id, 'hr', 'high')) }}</span>
              </span>
              <span class="inline-flex items-center rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 tracking-wide">
                {{ card.batterTotals.rbi ?? '-' }} 打点<span :style="rankStyle(getPlayerRank(card.id, 'rbi', 'high'))">{{ rankLabel(getPlayerRank(card.id, 'rbi', 'high')) }}</span>
              </span>
              <span class="inline-flex items-center rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 tracking-wide">
                {{ card.batterTotals.runs ?? '-' }} 得点<span :style="rankStyle(getPlayerRank(card.id, 'runs', 'high'))">{{ rankLabel(getPlayerRank(card.id, 'runs', 'high')) }}</span>
              </span>
            </template>
          </div>
        </div>
      </div>

      <!-- ローディング -->
      <div v-if="card.noData" class="px-4 py-5 space-y-2">
        <div class="h-2 bg-slate-100 rounded animate-pulse w-3/4"></div>
        <div class="h-2 bg-slate-100 rounded animate-pulse w-1/2"></div>
        <div class="h-2 bg-slate-100 rounded animate-pulse w-2/3"></div>
      </div>

      <!-- 投手テーブル -->
      <div v-else-if="mode === 'pitcher'" class="overflow-x-auto">
        <table class="w-full text-[11px]">
          <thead>
            <tr class="bg-slate-50/80">
              <th class="text-left px-4 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap"></th>
              <th class="text-center px-3 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">勝敗</th>
              <th class="text-center px-3 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">投回</th>
              <th class="text-center px-3 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">奪三</th>
              <th class="text-center px-3 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">四</th>
              <th class="text-center px-3 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">失</th>
              <th class="text-center px-3 pr-4 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">責</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="card.pitcherRows?.length === 0">
              <td colspan="7" class="px-4 py-4 text-[10px] text-slate-400 text-center tracking-wide">試合なし</td>
            </tr>
            <tr
              v-for="(row, i) in card.pitcherRows"
              :key="row.date"
              class="border-t border-slate-50 hover:bg-slate-50/60 transition-colors"
            >
              <td class="px-4 py-2 whitespace-nowrap font-mono text-[10px] text-slate-400">{{ row.date }}</td>
              <td class="px-3 py-2 text-center whitespace-nowrap">
                <span
                  v-if="row.result !== '-'"
                  class="inline-flex items-center justify-center w-8 h-5 rounded-full text-[10px] font-bold tracking-wide"
                  :class="row.result === '勝' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200'"
                >{{ row.result }}</span>
                <span v-else class="text-slate-300 text-xs">—</span>
              </td>
              <td class="px-3 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.ip }}</td>
              <td class="px-3 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.k }}</td>
              <td class="px-3 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.bb }}</td>
              <td class="px-3 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.runsAllowed }}</td>
              <td class="px-3 pr-4 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.er }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 野手テーブル -->
      <div v-else-if="mode === 'batter'" class="overflow-x-auto">
        <table class="w-full text-[11px]">
          <thead>
            <tr class="bg-slate-50/80">
              <th class="text-left px-4 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap"></th>
              <th class="text-center px-2 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">打数</th>
              <th class="text-center px-2 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">安</th>
              <th class="text-center px-2 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">HR</th>
              <th class="text-center px-2 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">塁</th>
              <th class="text-center px-2 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">打</th>
              <th class="text-center px-2 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">得</th>
              <th class="text-center px-2 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">三</th>
              <th class="text-center px-2 pr-4 py-2 font-medium text-[10px] tracking-widest text-slate-400 uppercase whitespace-nowrap">四</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="card.batterRows?.length === 0">
              <td colspan="9" class="px-4 py-4 text-[10px] text-slate-400 text-center tracking-wide">試合なし</td>
            </tr>
            <tr
              v-for="(row, i) in card.batterRows"
              :key="row.date"
              class="border-t border-slate-50 hover:bg-slate-50/60 transition-colors"
            >
              <td class="px-4 py-2 whitespace-nowrap font-mono text-[10px] text-slate-400">{{ row.date }}</td>
              <td class="px-2 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.ab }}</td>
              <td class="px-2 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="[isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500', row.hits > 0 && isRecent(row.date) ? 'text-emerald-600' : '']">{{ row.hits }}</td>
              <td class="px-2 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="[isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500', row.hr > 0 && isRecent(row.date) ? 'text-amber-600 font-bold' : '']">{{ row.hr }}</td>
              <td class="px-2 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.tb }}</td>
              <td class="px-2 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.rbi }}</td>
              <td class="px-2 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.runs }}</td>
              <td class="px-2 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.so }}</td>
              <td class="px-2 pr-4 py-2 text-center whitespace-nowrap font-mono tabular-nums" :class="isRecent(row.date) ? 'text-slate-700 font-semibold' : 'text-slate-500'">{{ row.walks }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
