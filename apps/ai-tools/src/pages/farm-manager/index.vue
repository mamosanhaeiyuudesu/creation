<template>
  <div class="max-w-[880px] mx-auto px-4 sm:px-6 pt-5 pb-28">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🌾</span>
        <div>
          <h1 class="text-[21px] sm:text-[24px] font-bold leading-none">{{ settings.farmName || '農園の経営' }}</h1>
          <p class="text-[12px] text-[var(--fm-ink-soft)] mt-1">納品書を撮るだけで、毎月の数字が見える</p>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <NuxtLink to="/farm-manager/settings" class="text-[13px] text-[var(--fm-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]">設定</NuxtLink>
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--fm-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]" @click="showPasswordModal = true">パスワード</button>
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--fm-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
      </div>
    </div>

    <!-- 月の切り替え -->
    <div class="flex items-center justify-center gap-3 mb-4">
      <button class="fm-btn-ghost !h-9 !px-3.5" aria-label="前の月" @click="shiftMonth(-1)">‹</button>
      <div class="text-center min-w-[130px]">
        <p class="text-[18px] font-bold leading-none fm-num">{{ monthLabel }}</p>
        <button v-if="month !== currentMonth" class="text-[11.5px] text-[var(--fm-in-deep)] mt-1" @click="month = currentMonth">今月に戻る</button>
      </div>
      <button class="fm-btn-ghost !h-9 !px-3.5" :disabled="month >= currentMonth" aria-label="次の月" @click="shiftMonth(1)">›</button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div class="h-28 rounded-2xl bg-[var(--fm-paper-2)]/70 animate-pulse" />
      <div class="h-64 rounded-2xl bg-[var(--fm-paper-2)]/70 animate-pulse" />
    </div>

    <!-- 読み込み失敗。空の画面が「データ無し」と「取得失敗」の2つの意味を持つと必ず誤解される -->
    <div v-else-if="loadError" class="fm-card p-6 text-center">
      <p class="text-[14px] mb-3">数字を読み込めませんでした。通信を確認してもう一度お試しください。</p>
      <button class="fm-btn" @click="load">読み込み直す</button>
    </div>

    <template v-else-if="summary">
      <!-- ① 5秒で分かる判定。色だけで黒字/赤字が伝わることを最優先にする -->
      <div
        class="rounded-2xl p-5 mb-3 text-center border-2"
        :style="{
          borderColor: isProfit ? 'var(--fm-plus)' : 'var(--fm-minus)',
          background: isProfit ? 'rgba(47,114,57,0.06)' : 'rgba(192,57,43,0.06)',
        }"
      >
        <p class="text-[13px] font-bold" :style="{ color: isProfit ? 'var(--fm-plus)' : 'var(--fm-minus)' }">
          {{ isProfit ? 'この月は黒字' : 'この月は赤字' }}
        </p>
        <p class="fm-num text-[34px] sm:text-[40px] font-bold leading-tight" :style="{ color: isProfit ? 'var(--fm-plus)' : 'var(--fm-minus)' }">
          {{ isProfit ? '' : '▲' }}{{ formatYen(Math.abs(summary.totals.operatingProfit)) }}
        </p>
        <p class="text-[12px] text-[var(--fm-ink-soft)]">
          E. 営業利益 ／ 取引 {{ summary.transactionCount }}件
          <span v-if="summary.cultivatedAreaA > 0" class="fm-num">・10aあたり {{ formatYen(per10a(summary.totals.operatingProfit)) }}</span>
        </p>
      </div>

      <!-- ② 仮置き・要確認。数字を止めないために仮置きを許した以上、ここを必ず見せて戻ってこられるようにする -->
      <NuxtLink
        v-if="pendingCount > 0"
        :to="`/farm-manager/provisional?month=${month}`"
        class="flex items-center gap-3 rounded-2xl border border-[var(--fm-warn)] bg-[#fffbef] px-4 py-3 mb-3 no-underline"
      >
        <span class="text-2xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🗂️</span>
        <div class="flex-1 min-w-0">
          <p class="text-[14px] font-bold text-[#96620b]">分類がまだの明細が {{ pendingCount }}件</p>
          <p class="text-[12px] text-[var(--fm-ink-soft)] fm-num">合計 {{ formatYen(pendingAmount) }} ・ まとめて振り替えられます</p>
        </div>
        <span class="text-[var(--fm-warn)] text-lg">›</span>
      </NuxtLink>

      <!-- ③ Excelの損益構造そのままのウォーターフォール -->
      <div class="fm-card p-4 sm:p-5 mb-3">
        <div class="flex items-center justify-between mb-3.5">
          <h2 class="text-[15px] font-bold">お金の流れ</h2>
          <div class="flex gap-1">
            <button class="fm-chip !text-[12px]" :class="{ 'fm-chip--on': compareMode === 'month' }" @click="compareMode = 'month'">前月比</button>
            <button class="fm-chip !text-[12px]" :class="{ 'fm-chip--on': compareMode === 'year' }" @click="compareMode = 'year'">前年同月比</button>
          </div>
        </div>
        <FmWaterfall :totals="summary.totals" :compare="compareTotals" :compare-label="compareLabel" />

        <div class="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--fm-line)] text-[11.5px] text-[var(--fm-ink-soft)]">
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm" style="background:var(--fm-in)" />畑の中で使ったお金（変動費）</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm" style="background:var(--fm-out)" />畑の外で使ったお金（固定費）</span>
        </div>
      </div>

      <!-- ④ 科目別の内訳 -->
      <div class="fm-card p-4 sm:p-5 mb-3">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-[15px] font-bold">何にかかったか</h2>
          <div class="flex gap-1">
            <button class="fm-chip !text-[12px]" :class="{ 'fm-chip--on': pieTab === 'variable' }" @click="pieTab = 'variable'">畑の中</button>
            <button class="fm-chip !text-[12px]" :class="pieTab === 'fixed' ? 'fm-chip--out-on' : ''" @click="pieTab = 'fixed'">畑の外</button>
            <button class="fm-chip !text-[12px]" :class="pieTab === 'revenue' ? 'fm-chip--rev-on' : ''" @click="pieTab = 'revenue'">売上</button>
          </div>
        </div>
        <FmDonut :rows="pieRows" :palette="piePalette" :title="pieTitle" />
      </div>

      <!-- ⑤ 深掘り。細かい数字は見たい人だけが開く階層に置く（仕様§6-1） -->
      <details class="fm-card p-4 sm:p-5 mb-3">
        <summary class="text-[15px] font-bold cursor-pointer select-none">もっと詳しく（経常利益・現金）</summary>
        <dl class="mt-4 space-y-2.5">
          <div v-for="row in detailRows" :key="row.label" class="flex items-baseline justify-between gap-3 border-b border-[var(--fm-line)] last:border-0 pb-2">
            <dt class="text-[13px] text-[var(--fm-ink-soft)]">
              {{ row.label }}
              <span v-if="row.hint" class="block text-[11px]">{{ row.hint }}</span>
            </dt>
            <dd class="fm-num font-bold text-[15px]" :style="{ color: row.color ?? 'var(--fm-ink)' }">
              {{ row.value < 0 ? '▲' : '' }}{{ formatYen(Math.abs(row.value)) }}
            </dd>
          </div>
        </dl>

        <div v-if="summary.vendors.length" class="mt-5">
          <h3 class="text-[13px] font-bold text-[var(--fm-ink-soft)] mb-2">取引先ごと（経費）</h3>
          <ul class="space-y-1.5">
            <li v-for="v in summary.vendors.slice(0, 8)" :key="v.vendorName" class="flex items-center justify-between gap-2">
              <span class="text-[13px] truncate">{{ v.vendorName }}</span>
              <span class="fm-num text-[13px] font-bold">{{ formatYen(v.amount) }}</span>
            </li>
          </ul>
        </div>
      </details>

      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/farm-manager/list" class="fm-btn-ghost inline-flex items-center">明細を見る</NuxtLink>
        <NuxtLink :to="`/farm-manager/provisional?month=${month}`" class="fm-btn-ghost inline-flex items-center">仮置き一覧</NuxtLink>
        <button class="fm-btn-ghost" :disabled="makingPdf" @click="downloadPdf">
          <span v-if="makingPdf" class="inline-block w-3.5 h-3.5 rounded-full border-2 border-[var(--fm-line)] border-t-[var(--fm-in)] animate-spin align-middle mr-1.5" />
          月次サマリーをPDFに
        </button>
      </div>

      <!-- PDF出力専用のレイアウト。画面には出さず html2canvas で撮ってPDF化する（キキガキと同じ作り） -->
      <div ref="printRoot" class="fm-print" aria-hidden="true">
        <div class="fm-print-page">
          <h1>{{ settings.farmName || '農園' }}　{{ monthLabel }}の収支</h1>
          <table>
            <tr v-for="row in printRows" :key="row.label" :class="row.strong ? 'strong' : ''">
              <th>{{ row.label }}</th>
              <td>{{ row.value < 0 ? '▲' : '' }}{{ formatYen(Math.abs(row.value)) }}</td>
            </tr>
          </table>
          <h2>何にかかったか</h2>
          <div class="cols">
            <div>
              <h3>B. 変動費（畑の中）</h3>
              <p v-for="r in summary.breakdown.variable" :key="r.accountCode">
                {{ r.accountName }}<span>{{ formatYen(r.amount) }}</span>
              </p>
              <p v-if="!summary.breakdown.variable.length">記録なし</p>
            </div>
            <div>
              <h3>D. 固定費（畑の外）</h3>
              <p v-for="r in summary.breakdown.fixed" :key="r.accountCode">
                {{ r.accountName }}<span>{{ formatYen(r.amount) }}</span>
              </p>
              <p v-if="!summary.breakdown.fixed.length">記録なし</p>
            </div>
          </div>
          <p class="note" v-if="pendingCount > 0">※ 分類がまだの明細が {{ pendingCount }}件（{{ formatYen(pendingAmount) }}）あります。</p>
        </div>
      </div>
    </template>

    <!-- 撮るボタンは常に指の届く位置に置く（現場での利用が主。仕様§8） -->
    <NuxtLink
      to="/farm-manager/new"
      class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] fm-btn !h-14 !px-7 shadow-lg inline-flex items-center gap-2 no-underline text-[16px]"
      style="box-shadow: 0 8px 24px rgba(47,114,57,0.32)"
    >
      <span style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">📷</span>
      納品書を読み取る
    </NuxtLink>

    <AuthModal v-if="showAuthModal" accent="orange" />
    <PasswordModal v-model:show="showPasswordModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import FmWaterfall from '~/components/farm-manager/FmWaterfall.vue'
import FmDonut from '~/components/farm-manager/FmDonut.vue'
import type { FarmSettings, MonthlySummary } from '~/types/farm-manager'

definePageMeta({ layout: 'farm-manager' })
useHead({ title: '農園の経営 | farm-manager' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const showPasswordModal = ref(false)

const currentMonth = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 7)
const month = ref(currentMonth)
const summary = ref<MonthlySummary | null>(null)
const settings = ref<FarmSettings>({ farmName: '', cultivatedAreaA: 0, openingCash: 0 })
const loading = ref(true)
const loadError = ref(false)
const compareMode = ref<'month' | 'year'>('month')
const pieTab = ref<'variable' | 'fixed' | 'revenue'>('variable')

const monthLabel = computed(() => `${month.value.slice(0, 4)}年${Number(month.value.slice(5))}月`)
const isProfit = computed(() => (summary.value?.totals.operatingProfit ?? 0) >= 0)

const compareTotals = computed(() => (compareMode.value === 'month' ? summary.value?.prevMonth : summary.value?.prevYear) ?? null)
const compareLabel = computed(() => (compareMode.value === 'month' ? '前月' : '前年同月'))

const pendingCount = computed(() => (summary.value?.provisional.count ?? 0) + (summary.value?.needsConfirmation.count ?? 0))
const pendingAmount = computed(() => (summary.value?.provisional.amount ?? 0) + (summary.value?.needsConfirmation.amount ?? 0))

const pieRows = computed(() => summary.value?.breakdown[pieTab.value] ?? [])
const piePalette = computed(() => (pieTab.value === 'variable' ? 'in' : pieTab.value === 'fixed' ? 'out' : 'rev') as 'in' | 'out' | 'rev')
const pieTitle = computed(() => (pieTab.value === 'variable' ? '畑の中' : pieTab.value === 'fixed' ? '畑の外' : '売上'))

const detailRows = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { label: 'F. 雑収入（助成金・利息）', hint: '補助金は売上に混ぜず、ここで分けて見る', value: s.totals.nonOperatingIncome, color: undefined as string | undefined },
    { label: 'F. 営業外費用（支払利息）', hint: '', value: -s.totals.nonOperatingExpense, color: undefined },
    { label: 'G. 経常利益', hint: '', value: s.totals.ordinaryProfit, color: s.totals.ordinaryProfit >= 0 ? 'var(--fm-plus)' : 'var(--fm-minus)' },
    { label: '　うち減価償却費', hint: '現金は出ていかないので足し戻す', value: s.totals.depreciation, color: undefined },
    { label: 'H. 現金の増減', hint: '', value: s.totals.cashChange, color: s.totals.cashChange >= 0 ? 'var(--fm-plus)' : 'var(--fm-minus)' },
    { label: 'J. 期首現金残高', hint: '年初の現金＋今月までの増減', value: s.openingCash, color: undefined },
    { label: 'K. 期末現金残高', hint: '', value: s.closingCash, color: undefined },
    { label: '未払い（掛けのまま）', hint: `${s.unpaid.count}件`, value: s.unpaid.amount, color: 'var(--fm-warn)' },
    ...(s.cultivatedAreaA > 0
      ? [{ label: '10aあたりの経費', hint: `栽培面積 ${s.cultivatedAreaA}a`, value: per10a(s.totals.variable + s.totals.fixed), color: undefined }]
      : []),
  ]
})

function per10a(v: number): number {
  const area = summary.value?.cultivatedAreaA ?? 0
  return area > 0 ? Math.round((v / area) * 10) : 0
}

function formatYen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

function shiftMonth(delta: number) {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1))
  const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  if (next > currentMonth) return
  month.value = next
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [s, st] = await Promise.all([
      $fetch<MonthlySummary>('/api/farm-manager/summary', { query: { month: month.value } }),
      $fetch<FarmSettings>('/api/farm-manager/settings'),
    ])
    summary.value = s
    settings.value = st
  } catch (e: any) {
    // 未ログインならモーダルが出るので、それ以外を失敗として扱う
    if (e?.statusCode !== 401) loadError.value = true
    summary.value = null
  } finally {
    loading.value = false
  }
}

watch(month, load)
// AuthModal はログインしても画面を読み込み直さないので、ここで取り直す
watch(isLoggedIn, (v) => { if (v) load() })

// ── 月次サマリーのPDF（仕様§8）──
// html2canvas / jspdf はこの画面でしか使わないので、ボタンを押したときだけ読み込む。
const printRoot = ref<HTMLElement>()
const makingPdf = ref(false)

const printRows = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { label: 'A. 売上高', value: s.totals.revenue, strong: false },
    { label: 'B. 変動費（畑の中）', value: -s.totals.variable, strong: false },
    { label: 'C. 粗利益', value: s.totals.grossProfit, strong: false },
    { label: 'D. 固定費（畑の外）', value: -s.totals.fixed, strong: false },
    { label: 'E. 営業利益', value: s.totals.operatingProfit, strong: true },
    { label: 'F. 営業外損益', value: s.totals.nonOperatingIncome - s.totals.nonOperatingExpense, strong: false },
    { label: 'G. 経常利益', value: s.totals.ordinaryProfit, strong: true },
    { label: 'H. 現金の増減', value: s.totals.cashChange, strong: false },
    { label: 'K. 期末現金残高', value: s.closingCash, strong: false },
  ]
})

async function downloadPdf() {
  if (makingPdf.value) return
  makingPdf.value = true
  try {
    await nextTick()
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const el = printRoot.value
    if (!el) throw new Error('PDFの内容を用意できませんでした')
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = 210
    const pageH = 297
    let w = pageW
    let h = (canvas.height / canvas.width) * pageW
    let x = 0
    let y = 0
    if (h > pageH) {
      h = pageH
      w = (canvas.width / canvas.height) * pageH
      x = (pageW - w) / 2
    }
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h)
    pdf.save(`${settings.value.farmName || '農園'}_${month.value}_収支.pdf`)
  } catch (e: any) {
    alert(e?.message || 'PDFの作成に失敗しました')
  } finally {
    makingPdf.value = false
  }
}

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  await checkAuth()
  await load()
})
</script>

<style scoped>
/* ── PDF出力専用テンプレート ──
   画面外（left: -99999px）にA4縦の実寸で置いておき、html2canvasで撮影してPDFへ埋め込む。
   display:none にすると撮影できないため、位置をずらすだけにしている。 */
.fm-print {
  position: fixed;
  top: 0;
  left: -99999px;
  z-index: -1;
  pointer-events: none;
}
.fm-print-page {
  width: 210mm;
  min-height: 297mm;
  padding: 18mm;
  background: #fff;
  color: #222;
  font-size: 12pt;
}
.fm-print-page h1 { font-size: 20pt; font-weight: 700; margin-bottom: 10mm; }
.fm-print-page h2 { font-size: 14pt; font-weight: 700; margin: 10mm 0 4mm; }
.fm-print-page h3 { font-size: 11pt; font-weight: 700; margin-bottom: 2mm; }
.fm-print-page table { width: 100%; border-collapse: collapse; }
.fm-print-page th { text-align: left; font-weight: 400; padding: 2.5mm 0; border-bottom: 1px solid #ddd; }
.fm-print-page td { text-align: right; padding: 2.5mm 0; border-bottom: 1px solid #ddd; font-variant-numeric: tabular-nums; }
.fm-print-page tr.strong th, .fm-print-page tr.strong td { font-weight: 700; border-bottom: 2px solid #888; }
.fm-print-page .cols { display: flex; gap: 10mm; }
.fm-print-page .cols > div { flex: 1; }
.fm-print-page .cols p { display: flex; justify-content: space-between; font-size: 10.5pt; padding: 1.2mm 0; border-bottom: 1px dotted #ddd; }
.fm-print-page .note { margin-top: 8mm; font-size: 10pt; color: #9a6a10; }

.fm-chip--out-on {
  background: var(--fm-out);
  border-color: var(--fm-out);
  color: #fff;
}
.fm-chip--rev-on {
  background: var(--fm-rev);
  border-color: var(--fm-rev);
  color: #fff;
}
</style>
