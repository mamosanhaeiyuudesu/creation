<template>
  <!-- タグの入力。参加者と同じく1つずつ入れて Enter（または欄を離れる）で確定する。
       これまで使ったタグを候補に出す＝「定例」「定例会」のような表記の割れを防ぐのが一番の役目 -->
  <div class="kk-tagin">
    <ul class="kk-tagin-list">
      <li v-for="(t, i) in modelValue" :key="t" class="kk-tagin-chip">
        <span class="kk-tagin-label">{{ t }}</span>
        <button type="button" class="kk-tagin-del" :aria-label="`タグ「${t}」を外す`" @click="removeAt(i)">✕</button>
      </li>
      <li v-if="modelValue.length < MAX_TAGS_PER_RECORD" class="kk-tagin-new">
        <input
          ref="input"
          v-model="draft"
          class="kk-input kk-tagin-input"
          :maxlength="MAX_TAG_LENGTH"
          :placeholder="modelValue.length ? '＋ タグ' : 'れい: 定例会'"
          aria-label="タグを追加"
          autocomplete="off"
          @focus="open = true"
          @input="open = true; active = -1"
          @keydown.enter="onEnter"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.esc="open = false"
          @blur="onBlur"
        >
        <ul v-if="open && candidates.length" class="kk-tagin-menu" role="listbox">
          <li
            v-for="(c, i) in candidates"
            :key="c"
            role="option"
            :aria-selected="i === active"
            class="kk-tagin-option"
            :class="{ 'is-active': i === active }"
            @mousedown.prevent="add(c)"
          >
            {{ c }}
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { MAX_TAGS_PER_RECORD, MAX_TAG_LENGTH, normalizeTag, normalizeTags } from '~/utils/tags'

const props = defineProps<{ modelValue: string[]; suggestions: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const draft = ref('')
const open = ref(false)
const active = ref(-1)
const input = ref<HTMLInputElement | null>(null)

/** 候補: まだ付けていないタグのうち、打った文字を含むもの（最大8件。多い順の並びのまま） */
const candidates = computed(() => {
  const q = draft.value.trim()
  return props.suggestions.filter((s) => !props.modelValue.includes(s) && (!q || s.includes(q))).slice(0, 8)
})

function add(raw: string) {
  const tag = normalizeTag(raw)
  if (tag) emit('update:modelValue', normalizeTags([...props.modelValue, tag]))
  draft.value = ''
  active.value = -1
  nextTick(() => input.value?.focus())
}

function removeAt(i: number) {
  const next = [...props.modelValue]
  next.splice(i, 1)
  emit('update:modelValue', next)
}

function move(step: number) {
  if (!candidates.value.length) return
  open.value = true
  active.value = (active.value + step + candidates.value.length) % candidates.value.length
}

/** Enter: 候補を選んでいればそれ、なければ打った文字で確定。IMEの変換確定のEnterでは確定しない */
function onEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  const picked = candidates.value[active.value]
  add(picked ?? draft.value)
}

/** 欄を離れたら、打ちかけのタグも確定する（「保存」を押したときに取りこぼさないように） */
function onBlur() {
  open.value = false
  if (draft.value.trim()) {
    const tag = normalizeTag(draft.value)
    if (tag) emit('update:modelValue', normalizeTags([...props.modelValue, tag]))
    draft.value = ''
  }
}
</script>

<style scoped>
.kk-tagin-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}
.kk-tagin-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  height: 30px;
  padding: 0 0.25rem 0 0.6rem;
  border-radius: 999px;
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  font-size: 12.5px;
  font-weight: 700;
}
.kk-tagin-label::before {
  content: '#';
  margin-right: 0.1rem;
  opacity: 0.6;
}
.kk-tagin-del {
  width: 1.3rem;
  height: 1.3rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-size: 10px;
  cursor: pointer;
  opacity: 0.6;
}
.kk-tagin-del:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.7);
}
.kk-tagin-new {
  position: relative;
}
.kk-tagin-input {
  width: 8.5rem;
  border-style: dashed;
  background: #fafcff;
}
.kk-tagin-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 40;
  min-width: 11rem;
  max-height: 14rem;
  overflow-y: auto;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  background: var(--kk-panel);
  border: 1px solid var(--kk-line);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(20, 60, 120, 0.16);
}
.kk-tagin-option {
  padding: 0.35rem 0.55rem;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.kk-tagin-option::before {
  content: '#';
  margin-right: 0.15rem;
  color: var(--kk-ink-faint);
}
.kk-tagin-option:hover,
.kk-tagin-option.is-active {
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
}
</style>
