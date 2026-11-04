<template>
  <!-- 一覧で議事録を押したときの画面。PDFと同じ見た目で見せ、ここから保存・編集・削除ができる。
       見た目はPDFそのもの（MinutesPdfMaker で作ったページの画像を並べる）なので、保存したPDFと食い違わない -->
  <div class="kk-view">
    <div class="kk-view-head">
      <button type="button" class="kk-view-back" title="一覧へ" aria-label="一覧へ" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <h1 class="kk-view-title">
        <MinutesModeBadge v-if="record" :mode="record.minutes.mode" compact />
        <span class="truncate">{{ record ? record.title || '（名前のない議事録）' : '議事録' }}</span>
      </h1>

      <!-- スマホでは画面の下に固定する（長い議事録を下まで見ても、上に戻らずに押せるように） -->
      <div v-if="record" class="kk-view-bar">
        <NuxtLink :to="`/records/${record.id}`" class="kk-view-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16zM13 7l4 4" /></svg>
          編集する
        </NuxtLink>
        <button v-if="driveConnected" type="button" class="kk-view-btn" :disabled="!rendered || !!busy" @click="saveToDrive">
          <GoogleDriveIcon />
          {{ busy === 'drive' ? '保存中…' : 'ドライブ' }}
        </button>
        <button type="button" class="kk-view-btn kk-view-btn--primary" :disabled="!rendered || !!busy" @click="downloadPdf">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
          {{ busy === 'pdf' ? '保存中…' : 'PDFを保存' }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="kk-notice kk-notice--error kk-msg mt-3">
      <span>{{ errorMessage }}</span>
      <button type="button" class="kk-msg-close" aria-label="閉じる" @click="errorMessage = ''">✕</button>
    </p>
    <p v-if="savedMessage" class="kk-notice kk-notice--info kk-msg mt-3">
      <span>{{ savedMessage }}</span>
      <button type="button" class="kk-msg-close" aria-label="閉じる" @click="savedMessage = ''">✕</button>
    </p>

    <p v-if="loading" class="kk-lead py-10 text-center">読み込んでいます…</p>
    <p v-else-if="record && !rendered" class="kk-lead py-10 text-center">PDFの見た目を作っています…</p>

    <div v-if="rendered" class="kk-view-pages" :class="`is-${rendered.kind}`">
      <img
        v-for="(img, i) in rendered.images"
        :key="i"
        :src="img"
        class="kk-view-page"
        :alt="`${record?.title || '議事録'}の${i + 1}ページ目`"
      >
    </div>

    <div v-if="record" class="kk-view-foot">
      <button type="button" class="kk-view-delete" :disabled="!!busy" @click="confirmingDelete = true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
        この議事録を削除
      </button>
    </div>

    <!-- 削除の確認（確認画面と同じ文言）。消している間は閉じられないようにする -->
    <BottomSheet v-model="confirmingDelete" title="この議事録を消しますか？" :closable="!deleting">
      <p class="kk-lead">一度消すと元には戻せません。</p>
      <div class="mt-4 flex flex-col gap-2">
        <button class="kk-btn-sub" :disabled="deleting" @click="remove">{{ deleting ? '消しています…' : 'はい、消します' }}</button>
        <button class="kk-btn-text" :disabled="deleting" @click="confirmingDelete = false">やめる</button>
      </div>
    </BottomSheet>

    <MinutesPdfMaker ref="pdfMaker" />
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import type { RenderedPages } from '~/utils/printLines'
import type { MinutesRecord } from '~/types/minutes'
import type MinutesPdfMakerType from '~/components/MinutesPdfMaker.vue'

useHead({ title: `議事録を見る — ${SERVICE.name}` })

const route = useRoute()
const router = useRouter()
const { isLoggedIn, authedFetch, waitReady } = useAuth()
const { connected: driveConnected, refresh: refreshDrive, uploadPdf, ensureToken } = useDrive()
const { load: loadTags } = useTags()

const id = computed(() => String(route.params.id ?? ''))
const record = ref<MinutesRecord | null>(null)
const loading = ref(true)
/** 作ったページの画像。PDFの保存にもこれを使う（もう一度作らない） */
const rendered = ref<RenderedPages | null>(null)
const busy = ref<'' | 'pdf' | 'drive'>('')
const errorMessage = ref('')
const savedMessage = ref('')
const confirmingDelete = ref(false)
const deleting = ref(false)
const pdfMaker = ref<InstanceType<typeof MinutesPdfMakerType> | null>(null)

/** 一覧から来たときは戻る（タグの絞り込み・並び順をそのまま残すため）。直接開いたときは一覧へ */
function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/')
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await authedFetch<{ record: MinutesRecord }>(`/api/records/${id.value}`)
    record.value = res.record
  } catch (e) {
    errorMessage.value = apiMessage(e, 'この議事録を開けませんでした。一覧からもう一度お試しください。')
    record.value = null
  }
  loading.value = false
  if (!record.value) return
  try {
    await nextTick()
    if (!pdfMaker.value) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')
    rendered.value = await pdfMaker.value.render(record.value.minutes)
  } catch (e) {
    errorMessage.value = apiMessage(e, 'PDFの見た目を作れませんでした。画面を開き直してお試しください。')
  }
}

async function makePdf() {
  if (!pdfMaker.value || !rendered.value || !record.value) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')
  return await pdfMaker.value.toPdf(rendered.value, record.value.minutes)
}

async function downloadPdf() {
  errorMessage.value = ''
  savedMessage.value = ''
  busy.value = 'pdf'
  try {
    const { pdf, fileName } = await makePdf()
    pdf.save(fileName)
    savedMessage.value = 'PDFを保存しました。スマホの「ファイル」や「ダウンロード」から開けます。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'PDFを作れませんでした。もう一度お試しください。')
  }
  busy.value = ''
}

/** PDFをGoogleドライブの「キキガキ議事録」フォルダへ保存する（ダウンロードはしない） */
async function saveToDrive() {
  errorMessage.value = ''
  savedMessage.value = ''
  busy.value = 'drive'
  try {
    // 許可の画面はボタンを押した直後でないとブラウザに止められるので、PDF作りより先に権限を取る
    await ensureToken()
  } catch (e) {
    errorMessage.value = apiMessage(e, 'Googleドライブとつなげませんでした。もう一度お試しください。')
    busy.value = ''
    return
  }
  try {
    const { pdf, fileName } = await makePdf()
    await uploadPdf(pdf.output('blob'), fileName)
    savedMessage.value = 'Googleドライブの「キキガキ議事録」フォルダに保存しました（同じ名前のPDFは上書きしました）。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'ドライブに保存できませんでした。もう一度お試しください。')
  }
  busy.value = ''
}

async function remove() {
  deleting.value = true
  errorMessage.value = ''
  try {
    await authedFetch(`/api/records/${id.value}`, { method: 'DELETE' })
    // 左メニューのタグの件数を合わせる
    loadTags().catch(() => {})
    await router.push('/')
  } catch (e) {
    errorMessage.value = apiMessage(e, '消せませんでした。もう一度お試しください。')
    deleting.value = false
    confirmingDelete.value = false
  }
}

watch(isLoggedIn, async (v) => {
  if (v) await load()
})

onMounted(async () => {
  refreshDrive()
  await waitReady()
  if (!isLoggedIn.value) {
    await router.replace('/')
    return
  }
  await load()
})
</script>

<style scoped>
.kk-view-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}
.kk-view-back {
  width: 32px;
  height: 32px;
  flex: none;
  border: 0;
  border-radius: 8px;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--kk-ink-soft);
  cursor: pointer;
}
.kk-view-back:hover { background: var(--kk-accent-soft); color: var(--kk-accent-strong); }
.kk-view-back svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-view-title {
  flex: 1 1 240px;
  min-width: 0;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}
.kk-view-bar {
  display: flex;
  gap: 0.4rem;
  margin-left: auto;
}
.kk-view-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 40px;
  padding: 0 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--kk-line);
  background: #fff;
  color: var(--kk-ink);
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}
.kk-view-btn svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-view-btn:hover:not(:disabled) { border-color: var(--kk-accent); background: var(--kk-accent-soft); }
.kk-view-btn:disabled { opacity: 0.45; cursor: default; }
.kk-view-btn--primary { background: var(--kk-cta); border-color: var(--kk-cta); color: #fff; }
.kk-view-btn--primary:hover:not(:disabled) { background: var(--kk-cta-strong); border-color: var(--kk-cta-strong); }

/* ページの画像。紙に見えるよう、影を付けて縦に並べる。縦のPDFは横より細くする */
.kk-view-pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 0.9rem;
}
.kk-view-page {
  display: block;
  width: 100%;
  height: auto;
  background: #fff;
  border: 1px solid var(--kk-line);
  box-shadow: 0 4px 18px rgba(20, 60, 120, 0.12);
}
.kk-view-pages.is-portrait .kk-view-page {
  max-width: 760px;
}

.kk-view-foot {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}
.kk-view-delete {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.7rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--kk-danger);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}
.kk-view-delete svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-view-delete:hover:not(:disabled) { background: var(--kk-danger-soft); }
.kk-view-delete:disabled { opacity: 0.45; cursor: default; }

.kk-msg {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.kk-msg-close {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
}

/* スマホでは、編集・ドライブ・PDFを画面の下に固定する */
@media (max-width: 639px) {
  .kk-view {
    padding-bottom: calc(68px + env(safe-area-inset-bottom));
  }
  .kk-view-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    margin: 0;
    padding: 0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.96);
    border-top: 1px solid var(--kk-line);
    box-shadow: 0 -4px 16px rgba(20, 60, 120, 0.08);
    backdrop-filter: blur(6px);
  }
  .kk-view-btn {
    flex: 1 1 0;
    min-width: 0;
    height: 48px;
    padding: 0 0.4rem;
  }
  .kk-view-btn--primary {
    flex-grow: 1.4;
  }
}
</style>
