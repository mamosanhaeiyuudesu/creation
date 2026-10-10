<template>
  <div>
    <!-- 画面だけに出る操作バー（印刷には出ない） -->
    <div class="pr-bar pr-noprint">
      <div class="pr-bar__inner">
        <div class="flex items-center gap-2">
          <NuxtLink :to="`/manabi/${id}`" class="pr-back" aria-label="問題にもどる">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </NuxtLink>
          <span class="pr-bar__title">A4の問題集</span>
          <button class="pr-print" :disabled="!set" @click="print">印刷・PDFにする</button>
        </div>

        <div v-if="set" class="pr-opts">
          <label class="pr-opt pr-opt--wide">
            <span>題</span>
            <input v-model="docTitle" type="text" maxlength="60" />
          </label>
          <div class="pr-opt">
            <span>選択肢の記号</span>
            <select v-model="markKind">
              <option value="circle">① ② ③ ④</option>
              <option value="kana">ア イ ウ エ</option>
              <option value="alpha">A B C D</option>
            </select>
          </div>
          <div class="pr-opt">
            <span>段組</span>
            <select v-model.number="columns">
              <option :value="1">1段</option>
              <option :value="2">2段（コンパクト）</option>
            </select>
          </div>
          <div class="pr-opt">
            <span>答え</span>
            <select v-model="answerMode">
              <option value="full">別ページに解答と解説</option>
              <option value="answers">別ページに解答だけ</option>
              <option value="none">付けない</option>
            </select>
          </div>
          <label class="pr-opt pr-opt--check">
            <input v-model="nameField" type="checkbox" />
            <span>氏名・点数の欄</span>
          </label>
        </div>
        <p v-if="set" class="pr-hint">
          「印刷・PDFにする」を押し、印刷画面の送信先を「PDFに保存」にするとPDFになります（用紙：A4）。
        </p>
      </div>
    </div>

    <p v-if="pending" class="pr-noprint pr-msg">読み込み中…</p>
    <p v-else-if="!set" class="pr-noprint pr-msg">この問題は見つかりませんでした</p>

    <!-- 紙面。画面ではA4の幅の紙として、印刷ではそのまま用紙いっぱいに出る -->
    <article v-else class="pr-sheet">
      <section>
        <header class="pr-head">
          <h1 class="pr-h1">{{ docTitle || set.title }}</h1>
          <p class="pr-meta">テーマ：{{ set.theme }}　／　全{{ set.questions.length }}問（選択式）</p>
          <p v-if="nameField" class="pr-name">
            <span>　　年　　組　　番</span>
            <span class="pr-name__who">氏名</span>
            <span class="pr-name__score">点数　　　／{{ set.questions.length }}</span>
          </p>
        </header>

        <ol class="pr-questions" :class="{ 'pr-questions--2': columns === 2 }">
          <li v-for="(q, qi) in set.questions" :key="qi" class="pr-q">
            <p class="pr-q__text"><span class="pr-q__num">{{ qi + 1 }}</span>{{ q.q }}</p>
            <ul class="pr-choices" :class="{ 'pr-choices--grid': isShort(q.choices) }">
              <li v-for="(c, ci) in q.choices" :key="ci">
                <span class="pr-mark">{{ marks[ci] }}</span>{{ c }}
              </li>
            </ul>
          </li>
        </ol>
      </section>

      <!-- 答え。授業で配るのは問題だけにして、ここは先生の手元用に別ページにする -->
      <section v-if="answerMode !== 'none'" class="pr-answers">
        <h2 class="pr-h2">{{ docTitle || set.title }}　{{ answerMode === 'full' ? '解答と解説' : '解答' }}</h2>

        <ol v-if="answerMode === 'answers'" class="pr-key">
          <li v-for="(q, qi) in set.questions" :key="qi"><span class="pr-key__num">{{ qi + 1 }}</span>{{ marks[q.answer] }}</li>
        </ol>

        <ol v-else class="pr-expl">
          <li v-for="(q, qi) in set.questions" :key="qi" class="pr-expl__item">
            <p class="pr-expl__head">
              <span class="pr-q__num">{{ qi + 1 }}</span>
              <b>{{ marks[q.answer] }}</b>　{{ q.choices[q.answer] }}
            </p>
            <p v-if="q.explanation" class="pr-expl__body">{{ q.explanation }}</p>
          </li>
        </ol>
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { ManabiSet } from '~/types/manabi'

definePageMeta({ layout: 'manabi-print' })

const route = useRoute()
const id = String(route.params.id || '')
const { data: set, pending } = await useFetch<ManabiSet>(`/api/manabi/sets/${id}`, { key: `manabi-set-${id}` })

const MARKS = {
  circle: ['①', '②', '③', '④'],
  kana: ['ア', 'イ', 'ウ', 'エ'],
  alpha: ['A', 'B', 'C', 'D'],
} as const

const docTitle = ref(set.value?.title ?? '')
const markKind = ref<keyof typeof MARKS>('circle')
const columns = ref<1 | 2>(1)
const answerMode = ref<'full' | 'answers' | 'none'>('full')
const nameField = ref(true)
const marks = computed(() => MARKS[markKind.value])

// ブラウザは PDF の保存名に <title> を使うので、題をそのまま入れておく
useHead(() => ({
  title: `${docTitle.value || set.value?.title || 'まなび'} 問題集`,
  meta: [{ name: 'robots', content: 'noindex' }],
}))

/** 選択肢がどれも短いときだけ 2×2 に並べて紙面を節約する */
const isShort = (choices: string[]) => choices.every((c) => c.length <= 12)

const print = () => window.print()
</script>

<style>
.pr-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 1px solid #d8d8d0;
}
.pr-bar__inner {
  max-width: 210mm;
  margin: 0 auto;
  padding: 0.6rem 1rem 0.7rem;
}
.pr-back {
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #555;
}
.pr-back:hover {
  background: #eee;
}
.pr-bar__title {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
}
.pr-print {
  height: 2.4rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: #2f5f3f;
}
.pr-print:disabled {
  opacity: 0.4;
}
.pr-opts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1rem;
  margin-top: 0.6rem;
}
.pr-opt {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 12.5px;
  color: #444;
}
.pr-opt--wide {
  flex: 1 1 100%;
}
.pr-opt--wide input {
  flex: 1;
  min-width: 0;
}
.pr-opt input[type='text'],
.pr-opt select {
  height: 2rem;
  padding: 0 0.5rem;
  border: 1px solid #c9c9c0;
  border-radius: 6px;
  background: #fff;
  font-size: 14px; /* iOS がフォーカス時に拡大しない下限に近づける */
  color: #111;
}
.pr-opt--check {
  cursor: pointer;
}
.pr-hint {
  margin-top: 0.5rem;
  font-size: 11.5px;
  color: #777;
}
.pr-msg {
  padding: 4rem 1rem;
  text-align: center;
  color: #555;
}

/* 紙面 */
.pr-sheet {
  width: 210mm;
  max-width: 100%;
  margin: 1rem auto 3rem;
  padding: 16mm 15mm;
  background: #fff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.15);
  font-size: 10.5pt;
  line-height: 1.7;
  color: #111;
}
.pr-head {
  margin-bottom: 6mm;
  padding-bottom: 3mm;
  border-bottom: 1.5px solid #111;
}
.pr-h1 {
  font-size: 16pt;
  font-weight: 700;
  line-height: 1.4;
}
.pr-meta {
  margin-top: 1mm;
  font-size: 9pt;
  color: #444;
}
.pr-name {
  display: flex;
  gap: 8mm;
  margin-top: 4mm;
  font-size: 10pt;
}
.pr-name__who {
  flex: 1;
  border-bottom: 1px solid #111;
}
.pr-name__score {
  white-space: nowrap;
}

.pr-questions {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pr-questions--2 {
  column-count: 2;
  column-gap: 9mm;
  column-rule: 1px solid #ddd;
}
.pr-q {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-bottom: 5mm;
}
.pr-q__text {
  display: flex;
  gap: 2mm;
  font-weight: 500;
}
.pr-q__num {
  flex-shrink: 0;
  min-width: 6mm;
  height: 6mm;
  margin-right: 2mm;
  display: inline-grid;
  place-items: center;
  border: 1px solid #111;
  border-radius: 50%;
  font-size: 8.5pt;
  font-weight: 700;
  line-height: 1;
}
.pr-q__text .pr-q__num {
  margin-right: 0;
}
.pr-choices {
  list-style: none;
  margin: 1.5mm 0 0 8mm;
  padding: 0;
}
.pr-choices li {
  padding: 0.3mm 0;
  padding-left: 6mm;
  text-indent: -6mm;
}
.pr-choices--grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 4mm;
}
.pr-mark {
  display: inline-block;
  width: 6mm;
  text-indent: 0;
}

/* 答えのページ */
.pr-answers {
  break-before: page;
  page-break-before: always;
  margin-top: 12mm;
}
.pr-h2 {
  margin-bottom: 5mm;
  padding-bottom: 2mm;
  border-bottom: 1.5px solid #111;
  font-size: 13pt;
  font-weight: 700;
}
.pr-key {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 3mm 4mm;
  font-size: 12pt;
}
.pr-key__num {
  display: inline-block;
  min-width: 9mm;
  margin-right: 2mm;
  color: #555;
}
.pr-expl {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pr-expl__item {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-bottom: 4mm;
}
.pr-expl__head {
  display: flex;
  align-items: center;
}
.pr-expl__body {
  margin: 0.8mm 0 0 8mm;
  font-size: 9.5pt;
  color: #333;
}

@page {
  size: A4;
  margin: 15mm;
}
@media print {
  .pr-noprint {
    display: none !important;
  }
  .pr-sheet {
    width: auto;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }
  .pr-root,
  .pr-sheet {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pr-answers {
    margin-top: 0;
  }
}

@media (max-width: 640px) {
  .pr-sheet {
    padding: 8mm 5mm;
    font-size: 10pt;
  }
  .pr-key {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
