<template>
  <div class="space-y-5">
    <!-- 宿名 -->
    <div>
      <label class="gh-label">宿名</label>
      <input v-model="form.name" class="gh-input" placeholder="例：柿畑の宿" />
    </div>

    <!-- ウェルカム文・コンセプト -->
    <div>
      <label class="gh-label">ウェルカム文・宿のコンセプト</label>
      <p class="gh-hint">チャットの冒頭でお客様に表示され、AIの前提にもなります。</p>
      <textarea v-model="form.welcome" rows="3" class="gh-input" placeholder="例：柿畑に囲まれた小さな農家の宿です。ゆっくりお過ごしください。" />
    </div>

    <!-- 案内項目 -->
    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="gh-label !mb-0">案内情報（AIが答える内容）</label>
        <span class="text-[11px] text-[var(--gh-ink-faint)]">{{ form.facts.length }} 件</span>
      </div>
      <p class="gh-hint">駐車場・鍵・チェックイン方法・Wi-Fi・ゴミ出しなど、答えが決まっている事務的なことを登録します。</p>

      <div v-if="!form.facts.length" class="mb-3">
        <button type="button" class="gh-btn-ghost !h-9" @click="addStarters">よくある項目のひな形を入れる</button>
      </div>

      <ul class="space-y-2.5">
        <li
          v-for="(f, i) in form.facts"
          :key="i"
          class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-3.5"
        >
          <div class="flex items-center gap-2 mb-2">
            <input
              v-model="f.category"
              class="gh-input !w-[8.5rem] !py-1.5 text-[13px]"
              placeholder="分類"
              list="gh-categories"
            />
            <input v-model="f.title" class="gh-input !py-1.5 text-[13px]" placeholder="見出し（例：駐車場はどこ？）" />
            <button
              type="button"
              class="shrink-0 w-8 h-8 rounded-full text-[var(--gh-ink-faint)] hover:bg-black/[0.05] hover:text-[var(--gh-warn)] transition"
              title="削除"
              @click="remove(i)"
            >
              ✕
            </button>
          </div>
          <textarea v-model="f.body" rows="2" class="gh-input text-[13px]" placeholder="回答本文（例：宿の前に2台分あります。到着したら…）" />
        </li>
      </ul>

      <datalist id="gh-categories">
        <option v-for="c in CATEGORY_PRESETS" :key="c" :value="c" />
      </datalist>

      <button type="button" class="gh-btn-ghost !h-9 mt-2.5" @click="add()">＋ 項目を追加</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

interface FactForm {
  category: string
  title: string
  body: string
}
interface HouseFormModel {
  name: string
  welcome: string
  facts: FactForm[]
}

const props = defineProps<{ modelValue: HouseFormModel }>()
const emit = defineEmits<{ 'update:modelValue': [HouseFormModel] }>()

const form = reactive<HouseFormModel>({
  name: props.modelValue.name,
  welcome: props.modelValue.welcome,
  facts: props.modelValue.facts.map((f) => ({ ...f })),
})

watch(form, () => emit('update:modelValue', { name: form.name, welcome: form.welcome, facts: form.facts }), { deep: true })

const CATEGORY_PRESETS = ['駐車場', '鍵・チェックイン', 'チェックアウト', 'Wi-Fi', 'ゴミ出し', 'アクセス・地図', '設備', 'その他']

function add(category = '', title = '') {
  form.facts.push({ category, title, body: '' })
}
function remove(i: number) {
  form.facts.splice(i, 1)
}
function addStarters() {
  const starters: [string, string][] = [
    ['駐車場', '駐車場はどこですか？'],
    ['鍵・チェックイン', 'チェックイン方法・鍵の受け取りは？'],
    ['Wi-Fi', 'Wi-Fiのパスワードは？'],
    ['ゴミ出し', 'ゴミはどうすればいい？'],
    ['アクセス・地図', '最寄り駅からの行き方は？'],
  ]
  for (const [c, t] of starters) add(c, t)
}
</script>

<style scoped>
.gh-label {
  display: block;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--gh-ink);
  margin-bottom: 0.3rem;
}
.gh-hint {
  font-size: 11.5px;
  color: var(--gh-ink-soft);
  margin-bottom: 0.5rem;
  line-height: 1.5;
}
</style>
