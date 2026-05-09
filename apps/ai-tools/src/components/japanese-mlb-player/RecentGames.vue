<script setup lang="ts">
import type { SeasonData } from '~/types/mlb'
import { PLAYERS, PLAYER_COLORS } from '~/utils/japanese-mlb-player/players'

const props = defineProps<{
  playerIds: string[]
  seasonDataMap: Map<string, SeasonData>
  mode: 'pitcher' | 'batter'
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
  batterTotals?: { avg: number | null; ab: number | null; hits: number | null; hr: number | null; rbi: number | null; runs: number | null; so: number | null; walks: number | null; tb: number | null }
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
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-7">
    <div v-if="cards.length === 0" class="col-span-full py-8 text-sm" :style="{ color: numColor }">データがありません</div>

    <div v-for="card in cards" :key="card.id">
      <div class="flex items-center gap-1.5 mb-2 flex-wrap">
        <span class="text-sm font-bold" :style="{ color: card.color }">{{ card.nameJa }}</span>
        <a
          v-if="card.sportnavi"
          :href="`https://baseball.yahoo.co.jp/mlb/player/${card.sportnavi}/top`"
          target="_blank"
          rel="noopener noreferrer"
          class="text-slate-400 hover:text-slate-600 transition-colors"
          title="スポナビで見る"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z" clip-rule="evenodd"/>
          </svg>
        </a>
        <span v-if="mode === 'pitcher' && card.pitcherTotals" class="text-xs" :style="{ color: numColor }">
          {{ card.pitcherTotals.wins ?? '-' }}勝{{ card.pitcherTotals.losses ?? '-' }}敗 防御率{{ card.pitcherTotals.era ?? '-' }}
        </span>
        <span v-if="mode === 'batter' && card.batterTotals" class="text-xs" :style="{ color: numColor }">
          {{ card.batterTotals.avg !== null ? card.batterTotals.avg.toFixed(3).replace(/^0/, '') : '-' }} {{ card.batterTotals.hr ?? '-' }}HR {{ card.batterTotals.rbi ?? '-' }}打点 {{ card.batterTotals.runs ?? '-' }}得点
        </span>
      </div>

      <div v-if="card.noData" class="text-xs py-1" :style="{ color: numColor }">読み込み中...</div>

      <!-- 投手テーブル -->
      <div v-else-if="mode === 'pitcher'" class="overflow-x-auto">
      <table class="text-xs border-collapse">
        <thead>
          <tr :style="{ color: numColor }">
            <th class="text-left pb-1 pr-6 font-medium whitespace-nowrap"></th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">勝敗</th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">投回</th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">奪三</th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">四</th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">失</th>
            <th class="text-center pb-1 pl-3 font-medium whitespace-nowrap">責</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="card.pitcherRows?.length === 0">
            <td colspan="7" class="py-1" :style="{ color: numColor }">試合なし</td>
          </tr>
          <tr v-for="row in card.pitcherRows" :key="row.date" class="border-t border-slate-100">
            <td class="py-1.5 pr-6 whitespace-nowrap" :style="{ color: numColor }">{{ row.date }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap font-medium" :style="{ color: row.result === '勝' ? '#2563eb' : row.result === '負' ? '#dc2626' : numColor }">{{ row.result }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.ip }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.k }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.bb }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.runsAllowed }}</td>
            <td class="py-1.5 pl-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.er }}</td>
          </tr>
        </tbody>
      </table>
      </div>

      <!-- 野手テーブル -->
      <div v-else-if="mode === 'batter'" class="overflow-x-auto">
      <table class="text-xs border-collapse">
        <thead>
          <tr :style="{ color: numColor }">
            <th class="text-left pb-1 pr-6 font-medium whitespace-nowrap"></th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">打数</th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">安</th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">HR</th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">塁</th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">打</th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">得</th>
            <th class="text-center pb-1 px-3 font-medium whitespace-nowrap">三</th>
            <th class="text-center pb-1 pl-3 font-medium whitespace-nowrap">四</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="card.batterRows?.length === 0">
            <td colspan="9" class="py-1" :style="{ color: numColor }">試合なし</td>
          </tr>
          <tr v-for="row in card.batterRows" :key="row.date" class="border-t border-slate-100">
            <td class="py-1.5 pr-6 whitespace-nowrap" :style="{ color: numColor }">{{ row.date }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.ab }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.hits }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.hr }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.tb }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.rbi }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.runs }}</td>
            <td class="py-1.5 px-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.so }}</td>
            <td class="py-1.5 pl-3 text-center whitespace-nowrap" :style="{ color: numColor }">{{ row.walks }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>
