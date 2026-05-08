<template>
  <aside
    class="flex-shrink-0 flex flex-col"
    style="width: 200px; background: #0C447C;"
  >
    <!-- リーグ切り替え（デスクトップのみ・スクロールに追従しない） -->
    <div v-if="showLeague !== false" class="flex border-b border-blue-700 flex-shrink-0">
      <button
        v-for="lg in leagues"
        :key="lg.key"
        @click="$emit('update:league', lg.key)"
        class="flex-1 py-2 text-xs font-semibold transition-colors"
        :class="league === lg.key
          ? 'text-white bg-white/20'
          : 'text-white/40 hover:text-white/70 hover:bg-white/10'"
      >{{ lg.label }}</button>
    </div>

    <div class="p-3 flex flex-col gap-4 overflow-y-auto flex-1">
      <!-- 投手 -->
      <div v-if="pitchers.length">
        <h3 class="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-2 px-1">投手</h3>
        <ul class="flex flex-col gap-0.5">
          <li
            v-for="player in pitchers"
            :key="player.id"
            @click="toggle(player.id)"
            class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors duration-150 select-none"
            :class="isSelected(player.id) ? 'bg-white/20' : 'hover:bg-white/10'"
          >
            <span
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              :style="{ background: isSelected(player.id) ? colors[player.id] : '#4B6FA5' }"
            />
            <span class="text-white text-xs leading-tight flex-1 min-w-0 truncate">{{ player.nameJa }}</span>
            <span class="text-blue-300 text-[10px] flex-shrink-0">{{ player.team }}</span>
          </li>
        </ul>
      </div>

      <!-- 野手 -->
      <div v-if="batters.length">
        <h3 class="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-2 px-1">野手</h3>
        <ul class="flex flex-col gap-0.5">
          <li
            v-for="player in batters"
            :key="player.id"
            @click="toggle(player.id)"
            class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors duration-150 select-none"
            :class="isSelected(player.id) ? 'bg-white/20' : 'hover:bg-white/10'"
          >
            <span
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              :style="{ background: isSelected(player.id) ? colors[player.id] : '#4B6FA5' }"
            />
            <span class="text-white text-xs leading-tight flex-1 min-w-0 truncate">{{ player.nameJa }}</span>
            <span class="text-blue-300 text-[10px] flex-shrink-0">{{ player.team }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="p-3 mt-auto border-t border-blue-700 flex flex-col gap-1">
      <div class="flex gap-1">
        <button
          @click="$emit('select-all')"
          class="flex-1 text-xs text-blue-200 hover:text-white transition-colors py-1"
        >全選択</button>
        <button
          @click="$emit('deselect-all')"
          class="flex-1 text-xs text-blue-200 hover:text-white transition-colors py-1"
        >全解除</button>
      </div>
      <button
        v-if="closable"
        @click="$emit('close')"
        class="w-full text-xs font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors py-1.5 rounded"
      >閉じる</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { PITCHER_PLAYERS, BATTER_PLAYERS, PLAYER_COLORS } from '~/utils/japanese-mlb-player/players'

const props = withDefaults(defineProps<{
  selectedIds: string[]
  league: 'AL' | 'NL'
  showLeague?: boolean
  closable?: boolean
}>(), {
  showLeague: true,
  closable: false,
})

const emit = defineEmits<{
  toggle: [id: string]
  'select-all': []
  'deselect-all': []
  'update:league': [value: 'AL' | 'NL']
  close: []
}>()

const leagues = [
  { key: 'NL' as const, label: 'ナ・リーグ' },
  { key: 'AL' as const, label: 'ア・リーグ' },
]

const pitchers = computed(() => PITCHER_PLAYERS.filter(p => p.league === props.league))
const batters  = computed(() => BATTER_PLAYERS.filter(p => p.league === props.league))
const colors = PLAYER_COLORS

function isSelected(id: string) {
  return props.selectedIds.includes(id)
}

function toggle(id: string) {
  emit('toggle', id)
}
</script>
