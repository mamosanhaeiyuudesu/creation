<template>
  <div class="max-w-[860px] mx-auto px-4 sm:px-6 pt-8 pb-32">
    <NuxtLink to="/kikigaki" class="text-[12.5px] text-[var(--kk-ink-soft)] hover:text-[var(--kk-ink)]">← 一覧へ</NuxtLink>

    <div v-if="loading" class="mt-6 space-y-3">
      <div v-for="i in 4" :key="i" class="h-24 rounded-[14px] bg-white/70 animate-pulse" />
    </div>

    <p v-else-if="!record" class="kk-card px-5 py-10 mt-6 text-center text-[13px] text-[var(--kk-ink-faint)]">
      記録が見つかりませんでした。
    </p>

    <!-- ── 画面C: 送信完了 ── -->
    <template v-else-if="record.status === 'approved'">
      <div class="kk-card px-6 py-8 mt-6 text-center">
        <p class="text-[32px] leading-none mb-3">✓</p>
        <h1 class="kk-display text-[20px]">Googleへ送信しました</h1>
        <p class="text-[13px] text-[var(--kk-ink-soft)] mt-2">{{ record.minutes.title || '（タイトル未設定）' }}</p>

        <div class="flex justify-center gap-8 mt-6 text-center">
          <div>
            <p class="text-[22px] font-bold">{{ result?.sentTasks ?? record.sentTasks }}</p>
            <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-0.5">登録したタスク</p>
          </div>
          <div>
            <p class="text-[22px] font-bold">{{ result?.sentEvents ?? record.sentEvents }}</p>
            <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-0.5">登録した予定</p>
          </div>
        </div>

        <a v-if="record.docUrl" :href="record.docUrl" target="_blank" rel="noopener" class="kk-btn mt-6">議事録ドキュメントを開く</a>
      </div>

      <div
        v-if="result?.warnings?.length"
        class="kk-card px-5 py-4 mt-4 text-[12.5px] leading-relaxed"
        style="border-color: #eccb96; background: var(--kk-warn-soft); color: var(--kk-warn)"
      >
        <p class="font-bold mb-1">一部は書き込めませんでした（手動で補ってください）</p>
        <ul class="list-disc pl-5 space-y-0.5">
          <li v-for="(w, i) in result.warnings" :key="i">{{ w }}</li>
        </ul>
      </div>
    </template>

    <!-- ── 画面B: レビュー・編集 ── -->
    <template v-else>
      <header class="mt-4 mb-5">
        <h1 class="kk-display text-[22px]">内容を確認してください</h1>
        <p class="text-[12px] text-[var(--kk-ink-soft)] mt-1.5 leading-relaxed">
          AIの読み取りには間違いがあります。ここで直してから承認してください。<br>
          <strong>承認するまで、Googleには何も書き込まれません。</strong>
        </p>
      </header>

      <p v-if="errorMessage" class="kk-card px-4 py-3 mb-4 text-[13px]" style="border-color: #f0c2c2; background: #fdf1f1; color: var(--kk-danger)">
        {{ errorMessage }}
      </p>

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

      <!-- 基本情報 -->
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
        <div class="mt-3">
          <p class="kk-label mb-1">概要</p>
          <textarea v-model="minutes.summary" rows="3" class="kk-input resize-y" />
        </div>
      </section>

      <!-- 決定事項 / 検討事項 -->
      <section v-for="group in pointGroups" :key="group.key" class="kk-card px-5 py-4 mb-4">
        <div class="flex items-center justify-between mb-2">
          <p class="kk-label">{{ group.label }}<span class="ml-1.5 font-normal">{{ group.items.length }}件</span></p>
          <button class="kk-btn-ghost !h-7 !px-2.5" @click="group.items.push({ content: '', note: '' })">＋ 追加</button>
        </div>
        <p v-if="!group.items.length" class="text-[12px] text-[var(--kk-ink-faint)] py-1">{{ group.empty }}</p>
        <ul v-else class="space-y-2">
          <li v-for="(item, i) in group.items" :key="i" class="flex gap-2">
            <div class="flex-1 space-y-1.5">
              <input v-model="item.content" class="kk-input" :placeholder="group.placeholder">
              <input v-model="item.note" class="kk-input !py-1.5 text-[12px]" placeholder="補足（任意）">
            </div>
            <button class="kk-btn-ghost !h-8 !px-2 self-start" title="削除" @click="group.items.splice(i, 1)">✕</button>
          </li>
        </ul>
      </section>

      <!-- タスク候補 -->
      <section class="kk-card px-5 py-4 mb-4">
        <div class="flex items-center justify-between mb-1">
          <p class="kk-label">タスク候補<span class="ml-1.5 font-normal">{{ minutes.taskCandidates.length }}件</span></p>
          <button class="kk-btn-ghost !h-7 !px-2.5" @click="addTask">＋ 追加</button>
        </div>
        <p class="text-[11.5px] text-[var(--kk-ink-faint)] mb-2">残したものがGoogle ToDo リストに登録されます。</p>
        <p v-if="!minutes.taskCandidates.length" class="text-[12px] text-[var(--kk-ink-faint)] py-1">タスクは見つかりませんでした。</p>
        <ul v-else class="space-y-3">
          <li v-for="(t, i) in minutes.taskCandidates" :key="i" class="flex gap-2">
            <div class="flex-1 grid gap-1.5 sm:grid-cols-[140px_1fr]">
              <input v-model="t.assignee" class="kk-input" placeholder="担当">
              <input v-model="t.task" class="kk-input" placeholder="やること">
              <input v-model="t.due" class="kk-input !py-1.5 text-[12px]" placeholder="期限（会議での言い方）">
              <label class="flex items-center gap-2">
                <span class="text-[11.5px] text-[var(--kk-ink-faint)] whitespace-nowrap">登録する期限</span>
                <input v-model="t.dueDate" type="date" class="kk-input !py-1.5 text-[12px]">
              </label>
            </div>
            <button class="kk-btn-ghost !h-8 !px-2 self-start" title="削除" @click="minutes.taskCandidates.splice(i, 1)">✕</button>
          </li>
        </ul>
      </section>

      <!-- 予定候補 -->
      <section class="kk-card px-5 py-4 mb-4">
        <div class="flex items-center justify-between mb-1">
          <p class="kk-label">予定候補<span class="ml-1.5 font-normal">{{ minutes.eventCandidates.length }}件</span></p>
          <button class="kk-btn-ghost !h-7 !px-2.5" @click="addEvent">＋ 追加</button>
        </div>
        <p class="text-[11.5px] text-[var(--kk-ink-faint)] mb-2">
          <strong>開始日時を入れたものだけ</strong>カレンダーに登録されます（空のままなら登録しません）。
        </p>
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

      <!-- 文字起こし全文（照合用） -->
      <details class="kk-card px-5 py-4 mb-6">
        <summary class="kk-label cursor-pointer select-none">文字起こし全文を表示（照合用）</summary>
        <p class="mt-3 text-[12.5px] leading-[1.9] whitespace-pre-wrap text-[var(--kk-ink-soft)] max-h-[420px] overflow-y-auto">{{ record.transcript }}</p>
      </details>

      <!-- 承認 -->
      <div class="kk-card px-5 py-4 sticky bottom-4 shadow-[0_6px_24px_rgba(40,44,52,0.1)]">
        <p class="text-[12px] text-[var(--kk-ink-soft)] leading-relaxed mb-3">
          送信する内容: ドキュメント1件 ／ 議事録一覧に1行 ／ タスク {{ minutes.taskCandidates.length }}件 ／ 予定 {{ calendarCount }}件
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <button class="kk-btn" :disabled="sending || !minutes.title" @click="approve">
            {{ sending ? '送信しています…' : '承認してGoogleへ送信' }}
          </button>
          <button class="kk-btn-ghost" :disabled="sending || saving" @click="saveDraft">
            {{ saving ? '保存中…' : '下書きを保存' }}
          </button>
          <span v-if="savedAt" class="text-[11.5px] text-[var(--kk-ink-faint)]">保存しました</span>
          <button class="kk-btn-ghost ml-auto" :disabled="sending" @click="remove">削除</button>
        </div>
        <p v-if="!minutes.title" class="text-[11.5px] mt-2" style="color: var(--kk-warn)">タイトルを入力すると送信できます。</p>
      </div>
    </template>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import { emptyMinutes } from '~/types/kikigaki'
import type { KikigakiApproveResult, KikigakiMinutes, KikigakiRecord } from '~/types/kikigaki'

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
const sending = ref(false)
const savedAt = ref(0)
const result = ref<KikigakiApproveResult | null>(null)

/** 画面で編集している議事録。record.minutes のコピーで、承認時はこれをそのまま送る */
const minutes = reactive<KikigakiMinutes>(emptyMinutes())

const pointGroups = computed(() => [
  {
    key: 'decisions',
    label: '決定事項',
    empty: '決定した事項は見つかりませんでした。',
    placeholder: '決まったこと',
    items: minutes.decisions,
  },
  {
    key: 'discussions',
    label: '検討事項',
    empty: '検討中の事項は見つかりませんでした。',
    placeholder: '話し合ったが決まっていないこと',
    items: minutes.discussions,
  },
])

/** カレンダーへ実際に送られる件数（開始日時が入っているものだけ） */
const calendarCount = computed(() => minutes.eventCandidates.filter((e) => e.start).length)

function apiMessage(e: any, fallback: string): string {
  return e?.data?.message || e?.data?.statusMessage || e?.message || fallback
}

function applyMinutes(src: KikigakiMinutes) {
  Object.assign(minutes, JSON.parse(JSON.stringify(src)))
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

// ここが Google への唯一の入口。confirm で何が書き込まれるかを必ず見せてから送る。
async function approve() {
  const lines = [
    'Googleへ書き込みます。よろしいですか？',
    '',
    '・議事録ドキュメントを1件つくる',
    '・議事録一覧に1行追記する',
    `・ToDo リストにタスクを ${minutes.taskCandidates.length}件 登録する`,
    `・カレンダーに予定を ${calendarCount.value}件 登録する`,
  ]
  if (!confirm(lines.join('\n'))) return

  sending.value = true
  errorMessage.value = ''
  try {
    result.value = await $fetch<KikigakiApproveResult>('/api/kikigaki/approve', {
      method: 'POST',
      body: { id: id.value, minutes },
    })
    await load()
  } catch (e: any) {
    errorMessage.value = apiMessage(e, '送信に失敗しました')
  }
  sending.value = false
}

async function remove() {
  if (!confirm('この記録を削除しますか？（元に戻せません）')) return
  await $fetch(`/api/kikigaki/records/${id.value}`, { method: 'DELETE' })
  await router.push('/kikigaki')
}

watch(isLoggedIn, async (v) => {
  if (v) await load()
})

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})
</script>
