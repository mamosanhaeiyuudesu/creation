<script setup lang="ts">
// 出来事1件の行。表示と編集をこの中で完結させ、出来事一覧とカレンダーの
// 日別詳細の両方から同じ見た目・同じ操作で使えるようにしている。
type MomentKind = '達成' | '感謝' | '喜び' | 'しんどさ' | '不安'
interface MomentLike { id: string; kind: MomentKind; text: string; impact: number; who?: string }
interface KindMeta { polarity: 'pos' | 'neg'; chip: string; star: string }

const props = defineProps<{
  moment: MomentLike
  date: string
  kinds: MomentKind[]
  meta: Record<MomentKind, KindMeta>
}>()

const emit = defineEmits<{
  (e: 'save', patch: { text: string; impact: number; kind: MomentKind }): void
  (e: 'delete'): void
}>()

const editing = ref(false)
const draftText = ref('')
const draftImpact = ref(1)
const draftKind = ref<MomentKind>('達成')

const startEdit = () => {
  draftText.value = props.moment.text
  draftImpact.value = props.moment.impact
  draftKind.value = props.moment.kind
  editing.value = true
}

const save = () => {
  const text = draftText.value.trim()
  if (!text) return
  emit('save', { text, impact: draftImpact.value, kind: draftKind.value })
  editing.value = false
}

// 抽出をやり直して中身が入れ替わったときに、編集中の下書きが別の出来事へ
// 紛れ込まないよう畳む
watch(() => props.moment.id, () => { editing.value = false })
</script>

<template>
  <div class="flex flex-col gap-2 px-1 py-2 border-b border-white/[0.05] last:border-b-0">
    <!-- 表示モード -->
    <template v-if="!editing">
      <div class="flex items-start gap-2 group" :class="meta[moment.kind].polarity === 'neg' ? 'opacity-55' : ''">
        <span class="text-[11px] text-slate-500 shrink-0 w-[38px] pt-[3px] tabular-nums">{{ date }}</span>
        <span class="shrink-0 px-1.5 py-[1px] mt-[2px] rounded-md text-[10px] font-semibold border" :class="meta[moment.kind].chip">{{ moment.kind }}</span>
        <span
          class="text-[11px] shrink-0 mt-[3px] tracking-tight"
          :class="meta[moment.kind].star"
          :title="`大きさ ${moment.impact}/5`"
        >{{ '★'.repeat(moment.impact) }}<span class="text-slate-700">{{ '★'.repeat(5 - moment.impact) }}</span></span>
        <span class="text-sm text-slate-200 leading-relaxed flex-1">
          {{ moment.text }}
          <span v-if="moment.who" class="text-[11px] text-pink-300/80 ml-1 whitespace-nowrap">→ {{ moment.who }}</span>
        </span>
        <div class="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            class="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer border-none bg-transparent"
            @click="startEdit"
          >✏️</button>
          <button
            class="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-none bg-transparent"
            @click="emit('delete')"
          >✕</button>
        </div>
      </div>
    </template>

    <!-- 編集モード -->
    <template v-else>
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-0.5">
        <span class="text-[11px] text-slate-500 shrink-0 w-[38px] tabular-nums">{{ date }}</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="k in kinds"
            :key="k"
            class="px-1.5 py-[2px] rounded-md text-[10px] font-semibold border transition-colors cursor-pointer"
            :class="draftKind === k ? meta[k].chip : 'border-white/[0.08] bg-transparent text-slate-600 hover:text-slate-400'"
            @click="draftKind = k"
          >{{ k }}</button>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-[11px] text-slate-500 shrink-0">大きさ</span>
          <button
            v-for="n in 5"
            :key="n"
            class="w-6 h-6 rounded-md text-sm transition-colors cursor-pointer border-none"
            :class="draftImpact >= n ? 'text-amber-400 bg-amber-400/10' : 'text-slate-600 bg-slate-700/40 hover:text-slate-400'"
            @click="draftImpact = n"
          >★</button>
        </div>
      </div>
      <textarea
        v-model="draftText"
        class="w-full bg-white/[0.05] border border-orange-500/40 rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit] resize-none leading-relaxed"
        rows="3"
      />
      <div class="flex justify-end gap-1.5">
        <button class="px-3 py-1 rounded-lg border border-white/10 bg-transparent text-slate-400 text-xs cursor-pointer hover:bg-white/[0.08] transition-colors" @click="editing = false">キャンセル</button>
        <button class="px-3 py-1 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="save">保存</button>
      </div>
    </template>
  </div>
</template>
