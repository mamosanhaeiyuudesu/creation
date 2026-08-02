<script setup lang="ts">
// 右サイドバー。テキストの貼り付け（保存＝AIが名前を付ける）と、保存済みテキストの履歴。
// 履歴はチェックで複数選べて、選んだ組み合わせで分析できる（人生を横断して見たいとき用）。
import type { LifeDocumentSummary } from '~/types/life-analyzer'

const props = defineProps<{
  docs: LifeDocumentSummary[]
  selectedIds: string[]
  saving: boolean
  analyzing: boolean
  loadingDocs: boolean
}>()

const emit = defineEmits<{
  save: [string]
  analyze: [string[]]
  delete: [string]
  'open-doc': [string]
  'update:selectedIds': [string[]]
}>()

const tab = ref<'input' | 'history'>('input')
const text = ref('')

const charCount = computed(() => text.value.length)
const canSave = computed(() => charCount.value > 0 && !props.saving && !props.analyzing)

function submit() {
  if (!canSave.value) return
  emit('save', text.value)
  text.value = ''
  tab.value = 'history'
}

function toggle(id: string) {
  const next = props.selectedIds.includes(id)
    ? props.selectedIds.filter((v) => v !== id)
    : [...props.selectedIds, id]
  emit('update:selectedIds', next)
}

function selectAll() {
  emit('update:selectedIds', props.docs.map((d) => d.id))
}
function selectNone() {
  emit('update:selectedIds', [])
}

function fmtDate(iso: string): string {
  return iso ? iso.slice(0, 10).replace(/-/g, '/') : ''
}

// 履歴が増えたときに入力タブへ戻ってしまわないよう、タブは触ったときだけ変える。
watch(() => props.docs.length, (len, prev) => {
  if (!prev && len) tab.value = 'history'
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- タブ -->
    <div class="p-3 pb-2 shrink-0">
      <div class="flex gap-1 p-1 rounded-full bg-white/[0.04] border border-[var(--la-line)]">
        <button class="la-tab" :class="{ 'la-tab--on': tab === 'input' }" @click="tab = 'input'">テキストを追加</button>
        <button class="la-tab" :class="{ 'la-tab--on': tab === 'history' }" @click="tab = 'history'">
          履歴<span v-if="docs.length" class="ml-1 opacity-60">{{ docs.length }}</span>
        </button>
      </div>
    </div>

    <!-- 入力 -->
    <div v-if="tab === 'input'" class="flex-1 min-h-0 flex flex-col px-3 pb-3">
      <p class="text-[11.5px] leading-[1.8] text-[var(--la-ink-faint)] mb-2">
        自分について書いたもの・語ったもの（日記、生い立ち、対話の書き起こしなど）を貼り付けてください。名前はAIが付けます。
      </p>
      <textarea
        v-model="text"
        class="la-input la-scroll flex-1 min-h-[220px] resize-none"
        placeholder="ここにテキストを貼り付ける…"
        :disabled="saving"
      />
      <div class="flex items-center justify-between mt-2 mb-2.5">
        <span class="text-[11px] text-[var(--la-ink-faint)]">{{ charCount.toLocaleString() }} 文字</span>
        <button v-if="charCount" class="text-[11px] text-[var(--la-ink-faint)] hover:text-[var(--la-ink-soft)]" @click="text = ''">クリア</button>
      </div>
      <button class="la-btn w-full" :disabled="!canSave" @click="submit">
        {{ saving ? '保存しています…' : '保存して分析する' }}
      </button>
    </div>

    <!-- 履歴 -->
    <div v-else class="flex-1 min-h-0 flex flex-col">
      <div class="flex items-center justify-between px-4 pb-2 shrink-0">
        <span class="text-[11px] text-[var(--la-ink-faint)]">{{ selectedIds.length }} 件を選択中</span>
        <div class="flex gap-2">
          <button class="text-[11px] text-[var(--la-ink-faint)] hover:text-[var(--la-ink-soft)]" @click="selectAll">すべて</button>
          <button class="text-[11px] text-[var(--la-ink-faint)] hover:text-[var(--la-ink-soft)]" @click="selectNone">解除</button>
        </div>
      </div>

      <div class="la-scroll flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-2">
        <p v-if="loadingDocs" class="text-center text-[12px] text-[var(--la-ink-faint)] py-10">読み込み中…</p>
        <p v-else-if="!docs.length" class="text-center text-[12px] text-[var(--la-ink-faint)] py-10 leading-[1.9]">
          まだテキストがありません。<br>「テキストを追加」から貼り付けてください。
        </p>

        <div
          v-for="d in docs"
          :key="d.id"
          class="la-card p-3 transition-colors cursor-pointer"
          :class="selectedIds.includes(d.id) ? 'border-[var(--la-line-strong)] bg-white/[0.06]' : 'hover:border-[var(--la-line-strong)]'"
          @click="toggle(d.id)"
        >
          <div class="flex items-start gap-2.5">
            <span
              class="mt-0.5 w-4 h-4 shrink-0 rounded border grid place-items-center text-[10px] leading-none"
              :class="selectedIds.includes(d.id) ? 'bg-[var(--la-light)] border-[var(--la-light)] text-[#0a0d16]' : 'border-[var(--la-line-strong)] text-transparent'"
            >✓</span>
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-bold leading-snug break-words">{{ d.title }}</p>
              <p class="text-[11px] text-[var(--la-ink-faint)] mt-0.5">{{ fmtDate(d.createdAt) }}・{{ d.charCount.toLocaleString() }}文字</p>
              <p class="text-[11.5px] text-[var(--la-ink-faint)] leading-[1.7] mt-1.5 line-clamp-2">{{ d.excerpt }}</p>
              <div class="flex gap-3 mt-2">
                <button class="text-[11px] text-[var(--la-ink-soft)] hover:text-[var(--la-ink)]" @click.stop="emit('open-doc', d.id)">原文を見る</button>
                <button class="text-[11px] text-[var(--la-ink-faint)] hover:text-[#f28b82]" @click.stop="emit('delete', d.id)">削除</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 pt-0 shrink-0">
        <button class="la-btn w-full" :disabled="!selectedIds.length || analyzing" @click="emit('analyze', selectedIds)">
          {{ analyzing ? '分析しています…' : `選んだ ${selectedIds.length} 件で分析する` }}
        </button>
      </div>
    </div>
  </div>
</template>
