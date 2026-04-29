<template>
  <div>
    <!-- 投手テーブル -->
    <div v-if="pitcherPlayers.length" class="mb-6">
      <h3 class="text-sm font-semibold text-slate-600 mb-2">⚾ 投手</h3>
      <div class="overflow-auto max-h-[65vh] border border-slate-100 rounded isolate">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b-2 border-slate-200">
              <th class="text-left py-2 px-3 text-slate-500 font-medium text-xs w-24 sticky top-0 left-0 z-30 bg-white border-r border-slate-100">指標</th>
              <th class="text-center py-2 px-3 text-xs font-medium text-slate-400 w-24 sticky top-0 z-20 bg-white">
                {{ league }}リーグ
              </th>
              <th
                v-for="player in pitcherPlayers"
                :key="player.id"
                class="text-center py-2 px-3 text-xs font-medium whitespace-nowrap sticky top-0 z-20 bg-white"
              >
                <span class="inline-flex items-center gap-1" :style="{ color: colors[player.id] }">
                  <span class="w-2 h-2 rounded-full inline-block" :style="{ background: colors[player.id] }" />
                  {{ player.nameJa }}
                  <a
                    :href="`https://search.yahoo.co.jp/search?p=${encodeURIComponent(player.nameJa + ' MLB')}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-slate-400 hover:text-slate-600 transition-colors"
                    title="Yahoo検索"
                    @click.stop
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z" clip-rule="evenodd"/>
                    </svg>
                  </a>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="stat in PITCHER_STATS"
              :key="stat.key"
              class="border-b border-slate-100 hover:bg-slate-50 transition-colors group"
            >
              <td class="py-2 px-3 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100 transition-colors">
                <div class="flex items-center gap-1.5">
                  <span class="font-semibold text-slate-700 text-xs">{{ stat.label }}</span>
                  <div class="relative group/tooltip">
                    <span class="text-slate-400 cursor-help text-[10px] border border-slate-300 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center leading-none">?</span>
                    <div class="absolute left-5 top-0 z-50 hidden group-hover/tooltip:block w-60 bg-slate-800 text-white text-xs rounded-lg p-2.5 shadow-xl pointer-events-none">
                      <div class="font-mono text-yellow-300 mb-1">{{ stat.fullName }}</div>
                      <div>{{ stat.description }}</div>
                      <span class="block mt-1 font-medium" :class="stat.direction === 'high' ? 'text-green-400' : 'text-red-400'">
                        {{ stat.direction === 'high' ? '▲ 高いほど良い' : '▼ 低いほど良い' }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="py-2 px-3 text-center">
                <template v-if="getLeagueBlock('pitcher')[stat.key]">
                  <div class="text-[11px] font-mono font-semibold text-emerald-600 whitespace-nowrap">
                    {{ stat.format(getLeagueBlock('pitcher')[stat.key]!.leaderValue) }}（1位）
                  </div>
                  <div v-if="!stat.counting" class="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                    {{ stat.format(getLeagueBlock('pitcher')[stat.key]!.leagueAvg) }}（平均）
                  </div>
                </template>
                <span v-else class="text-slate-300 text-xs">—</span>
              </td>
              <td
                v-for="player in pitcherPlayers"
                :key="player.id"
                class="py-2 px-3 text-center font-mono text-sm"
              >
                <span :class="getCellClass(player.id, stat.key, 'pitcher')">{{ formatStat(player.id, stat.key, stat.format, 'pitcher') }}</span><span class="text-[11px] text-slate-400 ml-0.5">{{ getPlayerRankLabel(player.id, stat.key, stat.direction, 'pitcher') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 野手テーブル -->
    <div v-if="batterPlayers.length">
      <h3 class="text-sm font-semibold text-slate-600 mb-2">🏏 野手</h3>
      <div class="overflow-auto max-h-[65vh] border border-slate-100 rounded isolate">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b-2 border-slate-200">
              <th class="text-left py-2 px-3 text-slate-500 font-medium text-xs w-24 sticky top-0 left-0 z-30 bg-white border-r border-slate-100">指標</th>
              <th class="text-center py-2 px-3 text-xs font-medium text-slate-400 w-24 sticky top-0 z-20 bg-white">
                {{ league }}リーグ
              </th>
              <th
                v-for="player in batterPlayers"
                :key="player.id"
                class="text-center py-2 px-3 text-xs font-medium whitespace-nowrap sticky top-0 z-20 bg-white"
              >
                <span class="inline-flex items-center gap-1" :style="{ color: colors[player.id] }">
                  <span class="w-2 h-2 rounded-full inline-block" :style="{ background: colors[player.id] }" />
                  {{ player.nameJa }}
                  <a
                    :href="`https://search.yahoo.co.jp/search?p=${encodeURIComponent(player.nameJa + ' MLB')}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-slate-400 hover:text-slate-600 transition-colors"
                    title="Yahoo検索"
                    @click.stop
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z" clip-rule="evenodd"/>
                    </svg>
                  </a>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="stat in BATTER_STATS"
              :key="stat.key"
              class="border-b border-slate-100 hover:bg-slate-50 transition-colors group"
            >
              <td class="py-2 px-3 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100 transition-colors">
                <div class="flex items-center gap-1.5">
                  <span class="font-semibold text-slate-700 text-xs">{{ stat.label }}</span>
                  <div class="relative group/tooltip">
                    <span class="text-slate-400 cursor-help text-[10px] border border-slate-300 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center leading-none">?</span>
                    <div class="absolute left-5 top-0 z-50 hidden group-hover/tooltip:block w-60 bg-slate-800 text-white text-xs rounded-lg p-2.5 shadow-xl pointer-events-none">
                      <div class="font-mono text-yellow-300 mb-1">{{ stat.fullName }}</div>
                      <div>{{ stat.description }}</div>
                      <span class="block mt-1 font-medium" :class="stat.direction === 'high' ? 'text-green-400' : 'text-red-400'">
                        {{ stat.direction === 'high' ? '▲ 高いほど良い' : '▼ 低いほど良い' }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="py-2 px-3 text-center">
                <template v-if="getLeagueBlock('batter')[stat.key]">
                  <div class="text-[11px] font-mono font-semibold text-emerald-600 whitespace-nowrap">
                    {{ stat.format(getLeagueBlock('batter')[stat.key]!.leaderValue) }}（1位）
                  </div>
                  <div v-if="!stat.counting" class="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                    {{ stat.format(getLeagueBlock('batter')[stat.key]!.leagueAvg) }}（平均）
                  </div>
                </template>
                <span v-else class="text-slate-300 text-xs">—</span>
              </td>
              <td
                v-for="player in batterPlayers"
                :key="player.id"
                class="py-2 px-3 text-center font-mono text-sm"
              >
                <span :class="getCellClass(player.id, stat.key, 'batter')">{{ formatStat(player.id, stat.key, stat.format, 'batter') }}</span><span class="text-[11px] text-slate-400 ml-0.5">{{ getPlayerRankLabel(player.id, stat.key, stat.direction, 'batter') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="!pitcherPlayers.length && !batterPlayers.length" class="py-12 text-center text-slate-400 text-sm">
      {{ league }}リーグの選手が選択されていません
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SeasonData, StatMeta, AllLeagueStats, LeagueStatSummary } from '~/types/mlb'
import { PITCHER_PLAYERS, BATTER_PLAYERS, PITCHER_STATS, BATTER_STATS, PLAYER_COLORS } from '~/utils/japanese-mlb-player/players'

const props = defineProps<{
  selectedIds: string[]
  seasonDataMap: Map<string, SeasonData>
  leagueStats: AllLeagueStats | null
  league: 'AL' | 'NL'
}>()

const colors = PLAYER_COLORS

const pitcherPlayers = computed(() =>
  PITCHER_PLAYERS.filter(p => props.selectedIds.includes(p.id) && p.league === props.league)
)

const batterPlayers = computed(() =>
  BATTER_PLAYERS.filter(p => props.selectedIds.includes(p.id) && p.league === props.league)
)

function getLeagueBlock(type: 'pitcher' | 'batter'): Partial<Record<string, LeagueStatSummary>> {
  if (!props.leagueStats) return {}
  const block = props.leagueStats[props.league]
  return type === 'batter' ? block.batter : block.pitcher
}

function formatStat(playerId: string, key: string, fmt: StatMeta['format'], type: 'pitcher' | 'batter') {
  const data = props.seasonDataMap.get(playerId)
  if (!data) return '…'
  const stats = type === 'pitcher' ? data.currentPitcher : data.currentBatter
  if (!stats) return '—'
  const val = (stats as unknown as Record<string, unknown>)[key]
  return fmt(val === undefined ? null : val as number | null)
}

function getCellClass(playerId: string, key: string, type: 'pitcher' | 'batter') {
  const data = props.seasonDataMap.get(playerId)
  if (!data) return 'text-slate-300'
  const stats = type === 'pitcher' ? data.currentPitcher : data.currentBatter
  if (!stats) return 'text-slate-400'
  const val = (stats as unknown as Record<string, unknown>)[key]
  return val === null || val === undefined ? 'text-slate-400' : 'text-slate-800 font-semibold'
}

function getPlayerRankLabel(playerId: string, key: string, direction: 'high' | 'low', type: 'pitcher' | 'batter'): string {
  const data = props.seasonDataMap.get(playerId)
  if (!data) return ''
  const stats = type === 'pitcher' ? data.currentPitcher : data.currentBatter
  if (!stats) return ''
  const val = (stats as unknown as Record<string, unknown>)[key] as number | null
  if (val === null || val === undefined) return ''

  const ctx = getLeagueBlock(type)[key]
  if (!ctx) return ''

  let rank = 1
  for (const v of ctx.sortedValues) {
    if (direction === 'high' ? v > val : v < val) rank++
    else break
  }
  return `（${rank}位）`
}
</script>
