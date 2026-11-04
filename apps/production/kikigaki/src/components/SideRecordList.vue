<template>
  <!-- PCの左メニューの議事録の一覧。会議の日の新しい順で、月ごとに見出しを入れる（スマホのホームの一覧と同じ並び）。
       PDF・ドライブ・削除は、行にマウスを乗せると出る「⋯」のメニューから（左メニューはPCだけなので、乗せたときだけ出せばよい） -->
  <div class="kk-sl">
    <!-- タグで絞り込む（ホームの絞り込みとは別。左の一覧だけに効く） -->
    <div v-if="tagCounts.length" class="kk-sl-tags" role="group" aria-label="タグで絞り込む">
      <button type="button" class="kk-sl-tag" :class="{ 'is-on': !tag }" @click="tag = ''">すべて</button>
      <button
        v-for="t in tagCounts"
        :key="t.tag"
        type="button"
        class="kk-sl-tag"
        :class="{ 'is-on': tag === t.tag }"
        @click="tag = tag === t.tag ? '' : t.tag"
      >
        #{{ t.tag }}
      </button>
    </div>

    <div ref="scroller" class="kk-sl-scroll">
      <p v-if="loading && !records.length" class="kk-sl-empty">読み込んでいます…</p>
      <p v-else-if="!records.length" class="kk-sl-empty">まだ議事録はありません。</p>
      <section v-for="g in groups" :key="g.key" class="kk-sl-group">
        <h3 class="kk-sl-month">{{ g.label }}</h3>
        <div
          v-for="r in g.items"
          :key="r.id"
          class="kk-sl-row"
          :class="{ 'is-active': r.id === activeId, 'is-menu': menu?.id === r.id }"
          :data-id="r.id"
        >
          <NuxtLink :to="`/records/${r.id}`" class="kk-sl-link" :title="r.title || '（名前のない議事録）'">
            <MinutesModeBadge :mode="r.mode" icon-only />
            <span class="kk-sl-title">{{ r.title || '（名前のない議事録）' }}</span>
          </NuxtLink>
          <button
            type="button"
            class="kk-sl-more"
            :disabled="!!busy"
            :aria-label="`${r.title || '議事録'}の操作`"
            :aria-expanded="menu?.id === r.id"
            @click.stop="openMenu(r, $event)"
          >
            <span v-if="busy?.id === r.id" class="kk-sl-spin" />
            <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
          </button>
        </div>
      </section>
    </div>

    <!-- 「⋯」のメニュー。一覧は中だけスクロールするので、切れないよう画面に固定して出す -->
    <Teleport to="body">
      <div v-if="menu" class="kk-sl-menu-backdrop" @click="menu = null" />
      <div v-if="menu" class="kk-sl-menu" role="menu" :style="{ top: `${menu.top}px`, left: `${menu.left}px` }">
        <button type="button" role="menuitem" class="kk-sl-menu-item" @click="downloadPdf(menu.record)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
          PDFをダウンロード
        </button>
        <button v-if="driveConnected" type="button" role="menuitem" class="kk-sl-menu-item" @click="saveToDrive(menu.record)">
          <GoogleDriveIcon />
          Googleドライブに保存
        </button>
        <button type="button" role="menuitem" class="kk-sl-menu-item kk-sl-menu-item--danger" @click="askDelete(menu.record)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
          削除
        </button>
      </div>

      <!-- 結果のお知らせ。うまくいったときは少しして消え、失敗したときは閉じるまで残す -->
      <p v-if="toast" class="kk-sl-toast" :class="{ 'is-error': toast.error }" role="status">
        <span>{{ toast.text }}</span>
        <button type="button" class="kk-sl-toast-close" aria-label="閉じる" @click="toast = null">✕</button>
      </p>
    </Teleport>

    <BottomSheet
      :model-value="!!pendingDelete"
      title="この議事録を消しますか？"
      :closable="!deleting"
      @update:model-value="pendingDelete = null"
    >
      <p class="kk-lead m-0"><strong>{{ pendingDelete?.title || '（名前のない議事録）' }}</strong></p>
      <p class="kk-lead mt-1">一度消すと元には戻せません。</p>
      <div class="mt-4 flex flex-col gap-2">
        <button class="kk-btn-sub" :disabled="deleting" @click="removeRecord">
          {{ deleting ? '消しています…' : 'はい、消します' }}
        </button>
        <button class="kk-btn-text" :disabled="deleting" @click="pendingDelete = null">やめる</button>
      </div>
    </BottomSheet>

    <MinutesPdfMaker ref="pdfMaker" />
  </div>
</template>

<script setup lang="ts">
import { apiMessage } from '~/utils/apiMessage'
import { countTags } from '~/utils/tags'
import { groupByMonth } from '~/utils/sortRecords'
import type { MinutesRecord, RecordListItem } from '~/types/minutes'
import type MinutesPdfMakerType from '~/components/MinutesPdfMaker.vue'

const route = useRoute()
const router = useRouter()
const { isLoggedIn, authedFetch } = useAuth()
const { records, loading, ensure, load, removeLocal } = useRecordList()
const { version: tagsVersion, load: loadTags } = useTags()
const { connected: driveConnected, ensureToken, uploadPdf } = useDrive()

const tag = ref('')
const tagCounts = computed(() => countTags(records.value))
const groups = computed(() =>
  groupByMonth(tag.value ? records.value.filter((r) => r.tags.includes(tag.value)) : records.value)
)
// 選んでいたタグが無くなったら（消した・名前を変えた）「すべて」に戻す
watch(tagCounts, (list) => {
  if (tag.value && !list.some((t) => t.tag === tag.value)) tag.value = ''
})

/** 開いている議事録（確認画面にいるとき） */
const activeId = computed(() => (route.path.startsWith('/records/') ? String(route.params.id ?? '') : ''))

// 開いている議事録が見えるところまで一覧を動かす（新しく作った・古い日付の議事録でも見失わないように）
const scroller = ref<HTMLElement | null>(null)
watch(
  [activeId, () => records.value.length],
  async () => {
    if (!activeId.value) return
    await nextTick()
    scroller.value?.querySelector(`[data-id="${activeId.value}"]`)?.scrollIntoView({ block: 'nearest' })
  },
  { immediate: true }
)

// 読み込みは一度だけ（ホームが先に読んでいれば、それを使う）。退会中の人は読めないが、ここでは何も出さない
async function ensureLoaded() {
  if (isLoggedIn.value) await ensure().catch(() => {})
}
onMounted(ensureLoaded)
watch(isLoggedIn, ensureLoaded)
// 左メニューの設定でタグの名前を変えた・消したら読み直す
watch(tagsVersion, () => {
  if (isLoggedIn.value) load().catch(() => {})
})

// ── 「⋯」のメニュー ──
const menu = ref<{ id: string; record: RecordListItem; top: number; left: number } | null>(null)

function openMenu(r: RecordListItem, e: MouseEvent) {
  if (menu.value?.id === r.id) {
    menu.value = null
    return
  }
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const MENU_H = 130
  const top = rect.bottom + MENU_H > window.innerHeight ? rect.top - MENU_H : rect.bottom + 4
  menu.value = { id: r.id, record: r, top: Math.max(8, top), left: rect.left }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') menu.value = null
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  clearTimeout(toastTimer)
})

// ── お知らせ ──
const toast = ref<{ text: string; error: boolean } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

function notify(text: string, error = false) {
  clearTimeout(toastTimer)
  toast.value = { text, error }
  if (!error) toastTimer = setTimeout(() => (toast.value = null), 5000)
}

// ── PDF・ドライブ ──
const pdfMaker = ref<InstanceType<typeof MinutesPdfMakerType> | null>(null)
/** 作っている行。PDF作りは画面外の1枚の版を使い回すので、同時には1件だけにする */
const busy = ref<{ id: string } | null>(null)

/** 保存されている内容でPDFを作る（確認画面でまだ自動保存されていない直しは入らない） */
async function makePdf(id: string) {
  const res = await authedFetch<{ record: MinutesRecord }>(`/api/records/${id}`)
  if (!pdfMaker.value) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')
  return await pdfMaker.value.make(res.record.minutes)
}

async function downloadPdf(r: RecordListItem) {
  menu.value = null
  busy.value = { id: r.id }
  try {
    const { pdf, fileName } = await makePdf(r.id)
    pdf.save(fileName)
    notify(`「${r.title || '議事録'}」のPDFを保存しました。`)
  } catch (e) {
    notify(apiMessage(e, 'PDFを作れませんでした。もう一度お試しください。'), true)
  }
  busy.value = null
}

async function saveToDrive(r: RecordListItem) {
  menu.value = null
  busy.value = { id: r.id }
  try {
    // 許可の画面はボタンを押した直後でないとブラウザに止められるので、PDF作りより先に権限を取る
    await ensureToken()
  } catch (e) {
    notify(apiMessage(e, 'Googleドライブとつなげませんでした。もう一度お試しください。'), true)
    busy.value = null
    return
  }
  try {
    const { pdf, fileName } = await makePdf(r.id)
    await uploadPdf(pdf.output('blob'), fileName)
    notify(`「${r.title || '議事録'}」をGoogleドライブの「キキガキ議事録」フォルダに保存しました。`)
  } catch (e) {
    notify(apiMessage(e, 'ドライブに保存できませんでした。もう一度お試しください。'), true)
  }
  busy.value = null
}

// ── 削除 ──
const pendingDelete = ref<RecordListItem | null>(null)
const deleting = ref(false)

function askDelete(r: RecordListItem) {
  menu.value = null
  pendingDelete.value = r
}

async function removeRecord() {
  const r = pendingDelete.value
  if (!r) return
  deleting.value = true
  try {
    await authedFetch(`/api/records/${r.id}`, { method: 'DELETE' })
    removeLocal(r.id)
    loadTags().catch(() => {})
    pendingDelete.value = null
    notify(`「${r.title || '議事録'}」を消しました。`)
    // 開いていた議事録を消したら、ホームへ戻る
    if (r.id === activeId.value) await router.push('/')
  } catch (e) {
    pendingDelete.value = null
    notify(apiMessage(e, '消せませんでした。もう一度お試しください。'), true)
  }
  deleting.value = false
}
</script>

<style scoped>
.kk-sl {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.kk-sl-tags {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding: 0 0.4rem 0.15rem;
  scrollbar-width: none;
}
.kk-sl-tag {
  flex: none;
  height: 22px;
  padding: 0 0.5rem;
  border: 1px solid var(--kk-line);
  border-radius: 999px;
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: var(--kk-ink-soft);
  cursor: pointer;
}
.kk-sl-tag:hover {
  border-color: var(--kk-accent);
}
.kk-sl-tag.is-on {
  background: var(--kk-accent);
  border-color: var(--kk-accent);
  color: #fff;
}
.kk-sl-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  margin: 0 -0.2rem;
  padding: 0 0.2rem;
}
.kk-sl-empty {
  margin: 0;
  padding: 0.4rem 0.6rem;
  font-size: 12px;
  color: var(--kk-ink-faint);
}
.kk-sl-group + .kk-sl-group {
  margin-top: 0.5rem;
}
.kk-sl-month {
  margin: 0;
  padding: 0.3rem 0.6rem 0.2rem;
  font-size: 11px;
  font-weight: 700;
  color: var(--kk-ink-faint);
}
.kk-sl-row {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 8px;
}
.kk-sl-row:hover,
.kk-sl-row.is-menu {
  background: var(--kk-bg);
}
.kk-sl-row.is-active {
  background: var(--kk-accent-soft);
}
.kk-sl-link {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.5rem;
  font-size: 13px;
  color: var(--kk-ink);
  text-decoration: none;
}
.kk-sl-row.is-active .kk-sl-link {
  color: var(--kk-accent-strong);
  font-weight: 700;
}
/* 名前は1行に収め、はみ出す分は「…」で省く */
.kk-sl-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 「⋯」はマウスを乗せた行・メニューを開いている行・作っている最中の行だけに出す */
.kk-sl-more {
  flex: none;
  width: 26px;
  height: 26px;
  margin-right: 0.2rem;
  display: none;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--kk-ink-soft);
  cursor: pointer;
}
.kk-sl-row:hover .kk-sl-more,
.kk-sl-row.is-menu .kk-sl-more,
.kk-sl-more:focus-visible,
.kk-sl-more:has(.kk-sl-spin) {
  display: inline-flex;
}
.kk-sl-more:hover:not(:disabled) {
  background: var(--kk-line);
  color: var(--kk-ink);
}
.kk-sl-more:disabled {
  cursor: default;
}
.kk-sl-more svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}
.kk-sl-spin {
  width: 13px;
  height: 13px;
  border-radius: 999px;
  border: 2px solid var(--kk-accent);
  border-top-color: transparent;
  animation: kk-sl-spin 0.8s linear infinite;
}
@keyframes kk-sl-spin {
  to { transform: rotate(360deg); }
}

.kk-sl-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
}
.kk-sl-menu {
  position: fixed;
  z-index: 61;
  min-width: 200px;
  padding: 0.3rem;
  background: var(--kk-panel);
  border: 1px solid var(--kk-line-strong);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(35, 39, 47, 0.18);
}
.kk-sl-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--kk-ink);
  text-align: left;
  cursor: pointer;
}
.kk-sl-menu-item:hover {
  background: var(--kk-bg);
}
.kk-sl-menu-item svg {
  width: 16px;
  height: 16px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-sl-menu-item--danger {
  color: var(--kk-danger);
}
.kk-sl-menu-item--danger:hover {
  background: var(--kk-danger-soft);
}

.kk-sl-toast {
  position: fixed;
  left: 50%;
  bottom: 20px;
  z-index: 62;
  transform: translateX(-50%);
  max-width: min(560px, calc(100vw - 32px));
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  background: var(--kk-ink);
  color: #fff;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: 0 8px 24px rgba(35, 39, 47, 0.25);
}
.kk-sl-toast.is-error {
  background: var(--kk-danger);
}
.kk-sl-toast-close {
  flex: none;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 13px;
  cursor: pointer;
  opacity: 0.8;
}
</style>
