<template>
  <div class="max-w-[1080px] mx-auto px-4 sm:px-6 pt-8 pb-32">
    <NuxtLink to="/kikigaki" class="text-[12.5px] text-[var(--kk-ink-soft)] hover:text-[var(--kk-ink)]">← 一覧へ</NuxtLink>

    <div v-if="loading" class="mt-6 space-y-3">
      <div v-for="i in 4" :key="i" class="h-24 rounded-[14px] bg-white/70 animate-pulse" />
    </div>

    <p v-else-if="!record" class="kk-card px-5 py-10 mt-6 text-center text-[13px] text-[var(--kk-ink-faint)]">
      記録が見つかりませんでした。
    </p>

    <template v-else>
      <header class="mt-4 mb-5">
        <h1 class="kk-display text-[22px]">内容を確認・編集してください</h1>
        <p class="text-[12px] text-[var(--kk-ink-soft)] mt-1.5 leading-relaxed">
          AIの読み取りには間違いがあります。内容を直してから保存・PDFダウンロードしてください。<br>
          <strong>いつでも直せます。</strong>日付があとから分かったときもここで設定できます。
        </p>
        <p v-if="record.owner" class="text-[11.5px] text-[var(--kk-ink-faint)] mt-2">
          {{ record.owner }} さんがアップロード<span v-if="!record.isOwner">／この記録は全員で共有しています。直した内容は全員に反映されます</span>
        </p>
      </header>

      <p v-if="errorMessage" class="kk-card px-4 py-3 mb-4 text-[13px]" style="border-color: #f0c2c2; background: #fdf1f1; color: var(--kk-danger)">
        {{ errorMessage }}
      </p>

      <!-- AIで内容を修正（名前の言い間違い直しや軽微な言い回しの修正をAIに任せる） -->
      <section class="kk-card px-5 py-4 mb-5">
        <p class="kk-label mb-1.5">AIで内容を修正</p>
        <p class="text-[12px] text-[var(--kk-ink-faint)] mb-2 leading-relaxed">
          指示を書いて実行すると、下の内容全体をAIが書き換えます。名前や単語の言い間違い直しなど軽微な修正向けです。
        </p>
        <div class="flex flex-wrap gap-2">
          <input
            v-model="reviseInstruction"
            class="kk-input flex-1 min-w-[220px]"
            placeholder="例: 「阪中さん」を「坂中さん」に直して"
            :disabled="revising"
            @keydown.enter.prevent="runRevise"
          >
          <button class="kk-btn-ghost shrink-0" :disabled="revising || !reviseInstruction.trim()" @click="runRevise">
            {{ revising ? '修正中…' : 'AIで修正' }}
          </button>
        </div>
      </section>

      <!-- AIの自己申告（最優先で確認してほしいので先頭） -->
      <section
        v-if="minutes.unclearPoints.length"
        class="kk-card px-5 py-4 mb-5"
        style="border-color: #eccb96; background: var(--kk-warn-soft)"
      >
        <p class="text-[13px] font-bold" style="color: var(--kk-warn)">⚠ AIが聞き取れなかった・自信がない箇所</p>
        <ul class="list-disc pl-5 mt-2 space-y-1 text-[12.5px] leading-relaxed" style="color: var(--kk-warn)">
          <li v-for="(u, i) in minutes.unclearPoints" :key="i">{{ u }}</li>
        </ul>
        <p class="text-[11.5px] mt-2" style="color: var(--kk-warn)">録音を聞き直すか、文字起こし全文で確かめてください。</p>
      </section>

      <!-- PDFの出力レイアウトそのままの2カラム構成（日付＋タイトル／概要／決定事項 と 検討事項／タスク／予定） -->
      <div class="kk-sheet mb-4">
        <div class="kk-col">
          <section class="kk-card px-5 py-4 mb-4">
            <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <p class="kk-label mb-1">タイトル</p>
                <input v-model="minutes.title" class="kk-input" placeholder="例: 青年部 定例会">
              </div>
              <div>
                <p class="kk-label mb-1">日付</p>
                <input v-model="minutes.date" type="date" class="kk-input sm:w-[170px]">
              </div>
            </div>
          </section>

          <section class="kk-card px-5 py-4 mb-4">
            <p class="kk-label mb-2">概要</p>
            <AutoTextarea v-model="minutes.summary" placeholder="この会議が何だったかの短いまとめ" />
          </section>

          <section class="kk-card px-5 py-4 mb-4">
            <div class="flex items-center justify-between mb-2">
              <p class="kk-label">決定事項<span class="ml-1.5 font-normal">{{ minutes.decisions.length }}件</span></p>
              <button class="kk-btn-ghost !h-7 !px-2.5" @click="minutes.decisions.push({ content: '', note: '' })">＋ 追加</button>
            </div>
            <p v-if="!minutes.decisions.length" class="text-[12px] text-[var(--kk-ink-faint)] py-1">決定した事項は見つかりませんでした。</p>
            <ul v-else class="space-y-3">
              <li v-for="(item, i) in minutes.decisions" :key="i" class="kk-item">
                <div class="flex items-start gap-2">
                  <span class="kk-num">{{ i + 1 }}</span>
                  <AutoTextarea v-model="item.content" placeholder="決まったこと" class="flex-1 !font-semibold !text-[14px]" />
                  <button class="kk-btn-ghost !h-8 !px-2 shrink-0" title="この項目を削除" @click="minutes.decisions.splice(i, 1)">✕</button>
                </div>
                <div class="kk-note">
                  <span class="kk-note-label">補足</span>
                  <AutoTextarea
                    v-model="item.note"
                    placeholder="なくても構いません"
                    class="flex-1 !py-1 !text-[12.5px] !bg-transparent !border-transparent hover:!border-[var(--kk-line)] focus:!bg-white"
                  />
                </div>
              </li>
            </ul>
          </section>
        </div>

        <div class="kk-col">
          <section class="kk-card px-5 py-4 mb-4">
            <div class="flex items-center justify-between mb-2">
              <p class="kk-label">検討事項<span class="ml-1.5 font-normal">{{ minutes.discussions.length }}件</span></p>
              <button class="kk-btn-ghost !h-7 !px-2.5" @click="minutes.discussions.push({ content: '', note: '' })">＋ 追加</button>
            </div>
            <p v-if="!minutes.discussions.length" class="text-[12px] text-[var(--kk-ink-faint)] py-1">検討中の事項は見つかりませんでした。</p>
            <ul v-else class="space-y-3">
              <li v-for="(item, i) in minutes.discussions" :key="i" class="kk-item">
                <div class="flex items-start gap-2">
                  <span class="kk-num">{{ i + 1 }}</span>
                  <AutoTextarea v-model="item.content" placeholder="話し合ったが決まっていないこと" class="flex-1 !font-semibold !text-[14px]" />
                  <button class="kk-btn-ghost !h-8 !px-2 shrink-0" title="この項目を削除" @click="minutes.discussions.splice(i, 1)">✕</button>
                </div>
                <div class="kk-note">
                  <span class="kk-note-label">補足</span>
                  <AutoTextarea
                    v-model="item.note"
                    placeholder="なくても構いません"
                    class="flex-1 !py-1 !text-[12.5px] !bg-transparent !border-transparent hover:!border-[var(--kk-line)] focus:!bg-white"
                  />
                </div>
              </li>
            </ul>
          </section>

          <section class="kk-card px-5 py-4 mb-4">
            <div class="flex items-center justify-between mb-1">
              <p class="kk-label">タスク<span class="ml-1.5 font-normal">{{ minutes.taskCandidates.length }}件</span></p>
              <button class="kk-btn-ghost !h-7 !px-2.5" @click="addTask">＋ 追加</button>
            </div>
            <p v-if="!minutes.taskCandidates.length" class="text-[12px] text-[var(--kk-ink-faint)] py-1">タスクは見つかりませんでした。</p>
            <ul v-else class="space-y-3">
              <li v-for="(t, i) in minutes.taskCandidates" :key="i" class="flex gap-2">
                <div class="flex-1 grid gap-1.5 sm:grid-cols-[140px_1fr]">
                  <input v-model="t.assignee" class="kk-input" placeholder="担当">
                  <AutoTextarea v-model="t.task" placeholder="やること" />
                  <input v-model="t.due" class="kk-input !py-1.5 text-[12px]" placeholder="期限（会議での言い方）">
                  <label class="flex items-center gap-2">
                    <span class="text-[11.5px] text-[var(--kk-ink-faint)] whitespace-nowrap">期限日</span>
                    <input v-model="t.dueDate" type="date" class="kk-input !py-1.5 text-[12px]">
                  </label>
                </div>
                <button class="kk-btn-ghost !h-8 !px-2 self-start" title="削除" @click="minutes.taskCandidates.splice(i, 1)">✕</button>
              </li>
            </ul>
          </section>

          <section class="kk-card px-5 py-4 mb-4">
            <div class="flex items-center justify-between mb-1">
              <p class="kk-label">予定<span class="ml-1.5 font-normal">{{ minutes.eventCandidates.length }}件</span></p>
              <button class="kk-btn-ghost !h-7 !px-2.5" @click="addEvent">＋ 追加</button>
            </div>
            <p v-if="!minutes.eventCandidates.length" class="text-[12px] text-[var(--kk-ink-faint)] py-1">予定は見つかりませんでした。</p>
            <ul v-else class="space-y-3">
              <li v-for="(ev, i) in minutes.eventCandidates" :key="i" class="flex gap-2">
                <div class="flex-1 grid gap-1.5 sm:grid-cols-2">
                  <input v-model="ev.title" class="kk-input" placeholder="予定の名前">
                  <input v-model="ev.location" class="kk-input" placeholder="場所（任意）">
                  <input v-model="ev.datetime" class="kk-input !py-1.5 text-[12px] sm:col-span-2" placeholder="日時（会議での言い方）">
                  <label class="flex items-center gap-2">
                    <span class="text-[11.5px] text-[var(--kk-ink-faint)] whitespace-nowrap">開始</span>
                    <input v-model="ev.start" type="datetime-local" class="kk-input !py-1.5 text-[12px]">
                  </label>
                  <label class="flex items-center gap-2">
                    <span class="text-[11.5px] text-[var(--kk-ink-faint)] whitespace-nowrap">終了</span>
                    <input v-model="ev.end" type="datetime-local" class="kk-input !py-1.5 text-[12px]">
                  </label>
                </div>
                <button class="kk-btn-ghost !h-8 !px-2 self-start" title="削除" @click="minutes.eventCandidates.splice(i, 1)">✕</button>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <!-- PDFの文字数設定（左＝概要＋検討事項、右＝決定事項＋予定＋タスク の目安文字数） -->
      <details class="kk-card px-5 py-4 mb-4">
        <summary class="kk-label cursor-pointer select-none">PDFの文字数設定</summary>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <label class="flex items-center justify-between gap-2 text-[12.5px]">
            <span class="text-[var(--kk-ink-soft)]">概要（左側）の目安文字数</span>
            <input
              v-model.number="minutes.printSettings.summaryMaxChars"
              type="number"
              min="100"
              max="3000"
              step="50"
              class="kk-input !w-24 text-right"
            >
          </label>
          <label class="flex items-center justify-between gap-2 text-[12.5px]">
            <span class="text-[var(--kk-ink-soft)]">右側（決定事項・予定・タスク）の目安文字数</span>
            <input
              v-model.number="minutes.printSettings.rightMaxChars"
              type="number"
              min="100"
              max="3000"
              step="50"
              class="kk-input !w-24 text-right"
            >
          </label>
        </div>
        <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-2 leading-relaxed">
          PDF化のときに超えていたら、AIが文字数内に収まるよう要約し直します（元の内容はここでは変わりません）。
        </p>
      </details>

      <!-- 文字起こし全文（照合用） -->
      <details class="kk-card px-5 py-4 mb-6">
        <summary class="kk-label cursor-pointer select-none">文字起こし全文を表示（照合用）</summary>
        <p class="mt-3 text-[12.5px] leading-[1.9] whitespace-pre-wrap text-[var(--kk-ink-soft)] max-h-[420px] overflow-y-auto">{{ record.transcript }}</p>
      </details>

      <!-- 保存・PDF出力 -->
      <div class="kk-card px-5 py-4 sticky bottom-4 shadow-[0_6px_24px_rgba(40,44,52,0.1)]">
        <div class="flex flex-wrap items-center gap-2">
          <button class="kk-btn" :disabled="generatingPdf || saving" @click="downloadPdf">
            {{ generatingPdf ? 'PDFを作成しています…' : 'PDFでダウンロード' }}
          </button>
          <button v-if="driveReady" class="kk-btn-ghost" :disabled="savingToDrive || saving" @click="saveToDrive">
            {{ savingToDrive ? 'ドライブに保存中…' : 'Googleドライブに保存' }}
          </button>
          <button class="kk-btn-ghost" :disabled="saving || generatingPdf" @click="saveDraft">
            {{ saving ? '保存中…' : '保存' }}
          </button>
          <span v-if="savedAt" class="text-[11.5px] text-[var(--kk-ink-faint)]">保存しました</span>
          <span
            v-if="driveSaveMessage"
            class="text-[11.5px]"
            :style="driveSaveFailed ? 'color: var(--kk-danger)' : 'color: var(--kk-ink-faint)'"
          >{{ driveSaveMessage }}</span>
          <!-- 記録は全員で共有するが、消せるのはアップロードした本人だけ -->
          <button v-if="record.isOwner" class="kk-btn-ghost ml-auto" :disabled="saving || generatingPdf" @click="remove">削除</button>
        </div>
        <p v-if="driveConnected && !driveFolderId" class="text-[11px] text-[var(--kk-ink-faint)] mt-2">
          Googleと連携済みですが、保存先フォルダが未設定です。
          <NuxtLink to="/kikigaki" class="underline underline-offset-2">一覧ページで設定</NuxtLink>するとGoogleドライブにも保存できます。
        </p>
        <p v-else-if="!driveConnected" class="text-[11px] text-[var(--kk-ink-faint)] mt-2">
          <NuxtLink to="/kikigaki" class="underline underline-offset-2">Googleドライブと連携</NuxtLink>すると、PDFをそのままドライブにも保存できます。
        </p>
      </div>
    </template>

    <!-- PDF出力専用のレイアウト。画面には出さず、html2canvasで撮ってPDF化する -->
    <div v-if="record" ref="printRoot" class="kk-print" aria-hidden="true">
      <div class="kk-print-page">
        <div class="kk-print-col">
          <div class="kk-print-header">
            <span class="kk-print-date">{{ printDateLabel }}</span>
            <span>〈{{ minutes.title || '（タイトル未設定）' }}〉</span>
          </div>

          <!-- 概要＝もとの概要と検討事項をまとめた欄。文字数内ならそのまま両方出し、
               超えていたらAIがひとつながりの文章に要約し直した printSummaryMain だけを出す
               （そのときは printDiscussionLines が空になり、検討事項の小見出しごと消える）。 -->
          <div class="kk-print-section">
            <p class="kk-print-heading">概要</p>
            <p class="kk-print-body">{{ printSummaryMain || '（記載なし）' }}</p>
            <template v-if="printDiscussionLines.length">
              <p class="kk-print-subheading">検討事項</p>
              <ul class="kk-print-list">
                <li v-for="(d, i) in printDiscussionLines" :key="i">
                  {{ i + 1 }}. {{ d.main }}
                  <span v-if="d.note" class="kk-print-item-note">{{ d.note }}</span>
                </li>
              </ul>
            </template>
          </div>
        </div>

        <div class="kk-print-col kk-print-col--right">
          <div class="kk-print-section">
            <p class="kk-print-heading">決定事項</p>
            <p v-if="!printDecisionLines.length" class="kk-print-empty">（なし）</p>
            <ul v-else class="kk-print-list">
              <li v-for="(d, i) in printDecisionLines" :key="i">
                {{ i + 1 }}. {{ d.main }}
                <span v-if="d.note" class="kk-print-item-note">{{ d.note }}</span>
              </li>
            </ul>
          </div>

          <div class="kk-print-section">
            <p class="kk-print-heading">予定</p>
            <p v-if="!printEventLines.length" class="kk-print-empty">（なし）</p>
            <ul v-else class="kk-print-list">
              <li v-for="(ev, i) in printEventLines" :key="i">
                {{ i + 1 }}. {{ ev.main }}
                <span v-if="ev.note" class="kk-print-item-note">{{ ev.note }}</span>
              </li>
            </ul>
          </div>

          <div class="kk-print-section">
            <p class="kk-print-heading">タスク</p>
            <p v-if="!printTaskLines.length" class="kk-print-empty">（なし）</p>
            <ul v-else class="kk-print-list">
              <li v-for="(t, i) in printTaskLines" :key="i">
                {{ i + 1 }}. {{ t.main }}
                <span v-if="t.note" class="kk-print-item-note">{{ t.note }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import AutoTextarea from '~/components/kikigaki/AutoTextarea.vue'
import { emptyMinutes } from '~/types/kikigaki'
import type { KikigakiEventCandidate, KikigakiMinutes, KikigakiRecord } from '~/types/kikigaki'

definePageMeta({ layout: 'kikigaki' })
useHead({ title: 'キキガキ — 内容の確認' })

const route = useRoute()
const router = useRouter()
const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const id = computed(() => String(route.params.id ?? ''))
const record = ref<KikigakiRecord | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const saving = ref(false)
const savedAt = ref(0)
const generatingPdf = ref(false)
const printRoot = ref<HTMLElement | null>(null)

/** 画面で編集している議事録。record.minutes のコピー。保存・PDF出力ともこれをもとに行う */
const minutes = reactive<KikigakiMinutes>(emptyMinutes())

function apiMessage(e: any, fallback: string): string {
  return e?.data?.message || e?.data?.statusMessage || e?.message || fallback
}

function applyMinutes(src: KikigakiMinutes) {
  Object.assign(minutes, JSON.parse(JSON.stringify(src)))
}

// ── AIで内容を修正 ────────────────────────────────────────
// 指示欄1つの内容をもとに、議事録全体をAIに書き換えさせる（名前の言い間違い直し等の軽微な修正向け）。

const reviseInstruction = ref('')
const revising = ref(false)

async function runRevise() {
  const instruction = reviseInstruction.value.trim()
  if (!instruction || !record.value) return
  revising.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ minutes: KikigakiMinutes }>('/api/kikigaki/revise', {
      method: 'POST',
      body: { minutes, transcript: record.value.transcript, instruction },
    })
    applyMinutes(res.minutes)
    reviseInstruction.value = ''
  } catch (e: any) {
    errorMessage.value = apiMessage(e, 'AIによる修正に失敗しました')
  }
  revising.value = false
}

function addTask() {
  minutes.taskCandidates.push({ assignee: '', task: '', due: '', dueDate: '' })
}

function addEvent() {
  minutes.eventCandidates.push({ datetime: '', title: '', location: '', start: '', end: '' })
}

async function load() {
  loading.value = true
  try {
    const r = await $fetch<KikigakiRecord>(`/api/kikigaki/records/${id.value}`)
    record.value = r
    applyMinutes(r.minutes)
  } catch {
    record.value = null
  }
  loading.value = false
}

async function saveDraft() {
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/kikigaki/records/${id.value}`, { method: 'PATCH', body: { minutes } })
    savedAt.value = Date.now()
    setTimeout(() => {
      if (Date.now() - savedAt.value >= 2000) savedAt.value = 0
    }, 2100)
  } catch (e: any) {
    errorMessage.value = apiMessage(e, '保存に失敗しました')
  }
  saving.value = false
}

async function remove() {
  if (!confirm('この記録を削除しますか？（元に戻せません）')) return
  try {
    await $fetch(`/api/kikigaki/records/${id.value}`, { method: 'DELETE' })
    await router.push('/kikigaki')
  } catch (e: any) {
    errorMessage.value = apiMessage(e, '削除に失敗しました')
  }
}

// ── PDF出力 ──────────────────────────────────────────────
// html2canvas / jspdf はこの画面でしか使わないので、ボタンを押したときだけ読み込む。

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '日付未設定'
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`
}
const printDateLabel = computed(() => formatDateLabel(minutes.date))

function printEventWhen(ev: KikigakiEventCandidate): string {
  if (ev.start) {
    const fmt = (v: string) => v.replace('T', ' ')
    return ev.end ? `${fmt(ev.start)} 〜 ${fmt(ev.end)}` : fmt(ev.start)
  }
  return ev.datetime || '日時未定'
}

// ── PDF表示内容の組み立て ────────────────────────────────
// 左＝概要（概要＋検討事項をまとめた欄）／右＝決定事項・予定・タスクの3区分。
// レビュー画面で設定した目安文字数（minutes.printSettings）以内ならそのまま表示し、
// 超えているときだけAIに要約し直させる（呼び出しは downloadPdf のたびに文字数を見て判断する）。

interface PrintLine {
  main: string
  note?: string
}

const printSummaryMain = ref('')
const printDiscussionLines = ref<PrintLine[]>([])
const printDecisionLines = ref<PrintLine[]>([])
const printEventLines = ref<PrintLine[]>([])
const printTaskLines = ref<PrintLine[]>([])

function lineLength(l: PrintLine): number {
  return l.main.length + (l.note?.length ?? 0)
}

async function buildPrintContent() {
  // 左側＝概要＋検討事項
  const discussionLines: PrintLine[] = minutes.discussions.map((d) => ({ main: d.content, note: d.note }))
  const leftChars = minutes.summary.length + discussionLines.reduce((sum, l) => sum + lineLength(l), 0)
  const summaryMax = minutes.printSettings.summaryMaxChars

  if (leftChars <= summaryMax) {
    printSummaryMain.value = minutes.summary
    printDiscussionLines.value = discussionLines
  } else {
    try {
      const res = await $fetch<{ text: string }>('/api/kikigaki/print-condense', {
        method: 'POST',
        body: { target: 'left', summary: minutes.summary, discussions: minutes.discussions, maxChars: summaryMax },
      })
      printSummaryMain.value = res.text
      printDiscussionLines.value = []
    } catch {
      // AI要約に失敗しても元の内容でPDF化は続ける（1ページに収まるよう画像側で縮小されるため）
      printSummaryMain.value = minutes.summary
      printDiscussionLines.value = discussionLines
    }
  }

  // 右側＝決定事項・予定・タスク（この順で表示）
  const decisionLines: PrintLine[] = minutes.decisions.map((d) => ({ main: d.content, note: d.note }))
  const eventLines: PrintLine[] = minutes.eventCandidates.map((ev) => ({
    main: ev.title || '（無題）',
    note: ev.location ? `${printEventWhen(ev)} ・ ${ev.location}` : printEventWhen(ev),
  }))
  const taskLines: PrintLine[] = minutes.taskCandidates.map((t) => ({
    main: t.task,
    note: `担当: ${t.assignee || '未定'}${t.dueDate || t.due ? ` ・ 期限 ${t.dueDate || t.due}` : ''}`,
  }))
  const rightChars = [...decisionLines, ...eventLines, ...taskLines].reduce((sum, l) => sum + lineLength(l), 0)
  const rightMax = minutes.printSettings.rightMaxChars

  if (rightChars <= rightMax) {
    printDecisionLines.value = decisionLines
    printEventLines.value = eventLines
    printTaskLines.value = taskLines
  } else {
    try {
      const res = await $fetch<{ decisions: string[]; events: string[]; tasks: string[] }>(
        '/api/kikigaki/print-condense',
        {
          method: 'POST',
          body: { target: 'right', decisions: decisionLines, events: eventLines, tasks: taskLines, maxChars: rightMax },
        }
      )
      printDecisionLines.value = res.decisions.map((main) => ({ main }))
      printEventLines.value = res.events.map((main) => ({ main }))
      printTaskLines.value = res.tasks.map((main) => ({ main }))
    } catch {
      printDecisionLines.value = decisionLines
      printEventLines.value = eventLines
      printTaskLines.value = taskLines
    }
  }
}

/** PDFを組み立てる（画面には出さない）。ダウンロードとGoogleドライブ保存の両方から呼ぶ共通処理。 */
async function renderPdf(): Promise<{ pdf: any; fileName: string }> {
  await saveDraft()
  await buildPrintContent()
  await nextTick()

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const el = printRoot.value
  if (!el) throw new Error('印刷用の内容を用意できませんでした')

  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = 297
  const pageH = 210
  let w = pageW
  let h = (canvas.height / canvas.width) * pageW
  let x = 0
  let y = (pageH - h) / 2
  if (h > pageH) {
    h = pageH
    w = (canvas.width / canvas.height) * pageH
    x = (pageW - w) / 2
    y = 0
  }
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h)

  const safeTitle = (minutes.title || 'キキガキ議事録').replace(/[\\/:*?"<>|]/g, '_')
  const fileName = minutes.date ? `${safeTitle}_${minutes.date}.pdf` : `${safeTitle}.pdf`
  return { pdf, fileName }
}

async function downloadPdf() {
  errorMessage.value = ''
  generatingPdf.value = true
  try {
    const { pdf, fileName } = await renderPdf()
    pdf.save(fileName)
  } catch (e: any) {
    errorMessage.value = apiMessage(e, 'PDFの作成に失敗しました')
  }
  generatingPdf.value = false
}

// ── Googleドライブへの保存 ────────────────────────────────
// 連携・保存先フォルダの設定は /kikigaki の一覧ページで行う。ここでは状態を読み取って
// ボタンの出し分けと、実際のアップロードだけを行う。

const driveConnected = ref(false)
const driveFolderId = ref('')
const driveReady = computed(() => driveConnected.value && !!driveFolderId.value)
const savingToDrive = ref(false)
const driveSaveMessage = ref('')
const driveSaveFailed = ref(false)

async function loadGoogleStatus() {
  try {
    const status = await $fetch<{ connected: boolean; driveFolderId?: string }>('/api/kikigaki/google/status')
    driveConnected.value = status.connected
    driveFolderId.value = status.driveFolderId ?? ''
  } catch {
    /* 未ログイン時などは未連携のまま */
  }
}

async function saveToDrive() {
  errorMessage.value = ''
  driveSaveMessage.value = ''
  driveSaveFailed.value = false
  savingToDrive.value = true
  try {
    const { pdf, fileName } = await renderPdf()
    const pdfBase64 = pdf.output('datauristring').split(',')[1] ?? ''
    const res = await $fetch<{ saved: boolean }>('/api/kikigaki/google/drive-save', {
      method: 'POST',
      body: { fileName, pdfBase64 },
    })
    if (res.saved) {
      driveSaveMessage.value = 'Googleドライブに保存しました'
    } else {
      driveSaveFailed.value = true
      driveSaveMessage.value = 'Googleドライブと連携・フォルダ設定がされていません（一覧ページで設定してください）'
    }
  } catch (e: any) {
    driveSaveFailed.value = true
    driveSaveMessage.value = apiMessage(e, 'Googleドライブへの保存に失敗しました')
  }
  savingToDrive.value = false
}

watch(isLoggedIn, async (v) => {
  if (v) {
    await load()
    await loadGoogleStatus()
  }
})

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) {
    await load()
    await loadGoogleStatus()
  } else {
    loading.value = false
  }
})
</script>

<style scoped>
/* 2カラムのPDFレイアウトに合わせた並び。860px幅だと窮屈なので、この画面だけ広めのコンテナを使っている */
.kk-sheet {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 860px) {
  .kk-sheet {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}

/* 項目（主）と補足（従）の段差をつけるための見た目。
   同じ大きさの入力欄が並ぶと、どれが決定事項の本文でどれが補足なのか読み取れないため。 */
.kk-item {
  border: 1px solid var(--kk-line);
  border-radius: 12px;
  padding: 0.6rem 0.7rem;
  background: rgba(255, 255, 255, 0.55);
}

.kk-num {
  flex-shrink: 0;
  width: 1.4rem;
  height: 1.4rem;
  margin-top: 0.45rem;
  border-radius: 999px;
  background: var(--kk-accent-soft);
  color: var(--kk-accent);
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 補足は本文の下に字下げし、左の縦線で「本文にぶら下がるもの」だと分かるようにする */
.kk-note {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0.35rem 0 0 2.1rem;
  padding-left: 0.6rem;
  border-left: 2px solid var(--kk-line);
}

.kk-note-label {
  flex-shrink: 0;
  margin-top: 0.4rem;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--kk-ink-faint);
}

/* ── PDF出力専用テンプレート ──
   画面外（left: -99999px）に実寸のA4横サイズで置いておき、html2canvasで撮影してPDFへ埋め込む。
   display:none にすると撮影できないため、位置をずらすだけにしている。 */
.kk-print {
  position: fixed;
  top: 0;
  left: -99999px;
  z-index: -1;
  pointer-events: none;
}

.kk-print-page {
  width: 297mm;
  min-height: 210mm;
  box-sizing: border-box;
  padding: 12mm 14mm;
  background: #ffffff;
  color: #23272f;
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', system-ui, sans-serif;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.kk-print-col {
  padding-right: 8mm;
}

.kk-print-col--right {
  padding-left: 8mm;
  border-left: 1px solid #23272f;
}

.kk-print-header {
  font-family: 'Shippori Mincho', 'Hiragino Mincho ProN', serif;
  font-size: 15px;
  font-weight: 600;
  padding-bottom: 6px;
  margin-bottom: 10px;
  border-bottom: 1.5px solid #23272f;
  letter-spacing: 0.02em;
}
.kk-print-date {
  margin-right: 10px;
}

.kk-print-section {
  margin-bottom: 12px;
}
.kk-print-section:last-child {
  margin-bottom: 0;
}

.kk-print-heading {
  font-size: 12.5px;
  font-weight: 700;
  margin: 0 0 6px;
  padding-bottom: 3px;
  border-bottom: 1px solid #23272f;
}

.kk-print-body {
  font-size: 11.5px;
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 0;
}

/* 概要欄の中に検討事項を同居させるための小見出し。kk-print-heading より控えめにして
   「概要のなかの一部」に見えるようにし、区分自体は決定事項などと同格に見えないようにする */
.kk-print-subheading {
  font-size: 11px;
  font-weight: 700;
  color: #5b6472;
  margin: 10px 0 4px;
}

.kk-print-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.kk-print-list li {
  font-size: 11.5px;
  line-height: 1.7;
  margin-bottom: 6px;
  padding-left: 1.1em;
  text-indent: -1.1em;
}

.kk-print-item-note {
  display: block;
  padding-left: 1.1em;
  font-size: 10px;
  color: #5b6472;
  text-indent: 0;
}

.kk-print-empty {
  font-size: 11px;
  color: #9aa1ab;
  margin: 0;
}
</style>
