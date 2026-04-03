<script setup lang="ts">
import { heatColor } from '~/utils/miyako/heatColor'

interface SpeakerMeta {
  id: string
  name: string
  role: string
  gender: string
  party: string
  faction: string
  terms: number[]
  utterance_count: number
  total_words: number
  in_member_json: boolean
}

const props = defineProps<{
  filteredSpeakers: SpeakerMeta[]
  categories: readonly string[]
  catMap: Record<string, Record<string, { score: number; top_words: string }>>
  catRange: { min: number; max: number }
  termOptions: { term: number; count: number }[]
  filterTerm: number
}>()

const emit = defineEmits<{ 'update:filterTerm': [term: number] }>()

const displayNames = computed(() => {
  const familyName = (name: string) => name.split(/\s+/)[0] ?? name
  const givenName = (name: string) => name.split(/\s+/)[1] ?? ''
  const counts = new Map<string, number>()
  for (const s of props.filteredSpeakers) {
    const fn = familyName(s.name)
    counts.set(fn, (counts.get(fn) ?? 0) + 1)
  }
  const result: Record<string, string> = {}
  for (const s of props.filteredSpeakers) {
    const fn = familyName(s.name)
    result[s.id] = (counts.get(fn) ?? 1) > 1
      ? `${fn}（${givenName(s.name).charAt(0)}）`
      : fn
  }
  return result
})
</script>

<template>
  <div class="bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden">
    <div class="flex items-center gap-1.5 px-4 py-2.5 border-b border-[#dde2ef] bg-[#fafbff]">
      <template v-for="(opt, i) in termOptions" :key="opt.term">
        <span v-if="i > 0" class="text-[#c8d4e8] text-[11px]">/</span>
        <button
          :class="[
            'text-[11.5px] font-semibold transition-colors',
            opt.term === filterTerm ? 'text-[#1c2d5a]' : 'text-[#9aaac8] hover:text-[#4f6ac0]',
          ]"
          @click="emit('update:filterTerm', opt.term)"
        >{{ opt.term }}期<span class="text-[10.5px] font-normal">（{{ opt.count }}人）</span></button>
      </template>
    </div>

    <div class="overflow-auto">
      <table class="tbl">
        <thead>
          <tr>
            <th class="tbl-cat-head">カテゴリ</th>
            <th v-for="s in filteredSpeakers" :key="s.id" class="tbl-col-head">
              <div class="tbl-name">{{ displayNames[s.id] }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in categories" :key="cat">
            <td class="tbl-cat-cell">{{ cat }}</td>
            <td
              v-for="s in filteredSpeakers" :key="s.id"
              class="tbl-cell tbl-cell--cat"
              :title="catMap[s.id]?.[cat] ? `上位語: ${catMap[s.id][cat].top_words}` : ''"
              :style="catMap[s.id]?.[cat]
                ? { backgroundColor: heatColor(catMap[s.id][cat].score, catRange.min, catRange.max).bg }
                : { backgroundColor: '#f8f9fe' }"
            >
              <span
                v-if="catMap[s.id]?.[cat]"
                class="text-[10px]"
                :style="{ color: heatColor(catMap[s.id][cat].score, catRange.min, catRange.max).light ? '#6878a8' : '#fff' }"
              >{{ catMap[s.id][cat].score.toFixed(2) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.tbl {
  border-collapse: collapse;
  white-space: nowrap;
  font-size: 12px;
}

.tbl-cat-head {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fafbff;
  border-right: 2px solid #dde2ef;
  border-bottom: 2px solid #dde2ef;
  padding: 6px 14px;
  text-align: left;
  font-size: 10px;
  color: #9aaac8;
  font-weight: 600;
  min-width: 140px;
}

.tbl-col-head {
  border-bottom: 2px solid #dde2ef;
  border-right: 1px solid #eef0f8;
  padding: 5px 4px 4px;
  text-align: center;
  min-width: 60px;
  max-width: 68px;
  background: #fafbff;
  vertical-align: bottom;
}

.tbl-name {
  font-size: 11px;
  font-weight: 600;
  color: #1c2d5a;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
}

.tbl-cat-cell {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fafbff;
  border-right: 2px solid #dde2ef;
  border-bottom: 1px solid #eef0f8;
  padding: 5px 14px;
  font-size: 11px;
  color: #3a4a72;
  font-weight: 500;
}

.tbl-cell {
  border-right: 1px solid rgba(180,195,225,0.25);
  border-bottom: 1px solid rgba(180,195,225,0.25);
  padding: 0 3px;
  text-align: center;
  height: 26px;
  min-width: 60px;
  max-width: 68px;
  overflow: hidden;
}
.tbl-cell span {
  font-size: 11px;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 26px;
}

.tbl-cell--cat {
  height: 30px;
}
.tbl-cell--cat span { line-height: 30px; }
</style>
