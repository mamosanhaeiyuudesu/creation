<template>
  <aside
    class="flex-shrink-0 flex flex-col"
    style="width: 200px; background: #0C447C;"
  >
    <div class="p-3 flex flex-col gap-3 overflow-y-auto flex-1">
      <!-- ナ・リーグ -->
      <div>
        <h3 class="text-blue-300 text-[10px] font-bold tracking-wider mb-1.5 px-1">ナ・リーグ</h3>
        <div v-if="nlPitchers.length" class="mb-1.5">
          <p class="text-blue-200/70 text-[9px] font-semibold mb-1 px-1">投手</p>
          <ul class="flex flex-col gap-0.5">
            <li
              v-for="player in nlPitchers"
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
        <div v-if="nlBatters.length">
          <p class="text-blue-200/70 text-[9px] font-semibold mb-1 px-1">野手</p>
          <ul class="flex flex-col gap-0.5">
            <li
              v-for="player in nlBatters"
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

      <!-- ア・リーグ -->
      <div>
        <h3 class="text-blue-300 text-[10px] font-bold tracking-wider mb-1.5 px-1">ア・リーグ</h3>
        <div v-if="alPitchers.length" class="mb-1.5">
          <p class="text-blue-200/70 text-[9px] font-semibold mb-1 px-1">投手</p>
          <ul class="flex flex-col gap-0.5">
            <li
              v-for="player in alPitchers"
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
        <div v-if="alBatters.length">
          <p class="text-blue-200/70 text-[9px] font-semibold mb-1 px-1">野手</p>
          <ul class="flex flex-col gap-0.5">
            <li
              v-for="player in alBatters"
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
    </div>

    <!-- 閉じるボタン（モバイル） -->
    <div v-if="closable" class="p-3 border-t border-blue-700 flex-shrink-0">
      <button
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
  closable?: boolean
}>(), {
  closable: false,
})

const emit = defineEmits<{
  toggle: [id: string]
  close: []
}>()

const nlPitchers = computed(() => PITCHER_PLAYERS.filter(p => p.league === 'NL'))
const nlBatters  = computed(() => BATTER_PLAYERS.filter(p => p.league === 'NL'))
const alPitchers = computed(() => PITCHER_PLAYERS.filter(p => p.league === 'AL'))
const alBatters  = computed(() => BATTER_PLAYERS.filter(p => p.league === 'AL'))
const colors = PLAYER_COLORS

function isSelected(id: string) {
  return props.selectedIds.includes(id)
}

function toggle(id: string) {
  emit('toggle', id)
}
</script>
