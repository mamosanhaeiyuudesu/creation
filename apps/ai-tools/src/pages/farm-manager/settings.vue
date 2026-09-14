<template>
  <div class="max-w-[720px] mx-auto px-4 sm:px-6 pt-5 pb-28">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/farm-manager" class="text-[13px] text-[var(--fm-ink-soft)] hover:text-[var(--fm-in-deep)] no-underline">‹ 経営の画面</NuxtLink>
    </div>

    <header class="flex items-center gap-2.5 mb-5">
      <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">⚙️</span>
      <h1 class="text-[21px] font-bold leading-none">設定</h1>
    </header>

    <!-- 農園 -->
    <section class="fm-card p-4 mb-3">
      <h2 class="text-[15px] font-bold mb-3">農園のこと</h2>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2">
          <label class="fm-label">農園の名前</label>
          <input v-model="settings.farmName" class="fm-input" placeholder="◯◯農園" />
        </div>
        <div>
          <label class="fm-label">栽培面積（a）</label>
          <input v-model.number="settings.cultivatedAreaA" type="number" inputmode="decimal" class="fm-input fm-num" placeholder="0" />
          <p class="text-[11px] text-[var(--fm-ink-soft)] mt-1">入れると「10aあたり」で見られます</p>
        </div>
        <div>
          <label class="fm-label">期首現金残高（円）</label>
          <input v-model.number="settings.openingCash" type="number" inputmode="numeric" class="fm-input fm-num" placeholder="0" />
          <p class="text-[11px] text-[var(--fm-ink-soft)] mt-1">その年の1月時点の現金</p>
        </div>
      </div>
      <button class="fm-btn mt-3" :disabled="savingSettings" @click="saveSettings">保存</button>
      <span v-if="settingsSaved" class="text-[13px] text-[var(--fm-in-deep)] ml-2">保存しました</span>
    </section>

    <!-- 従事者 -->
    <section class="fm-card p-4 mb-3">
      <h2 class="text-[15px] font-bold mb-1">はたらく人（人件費の内訳）</h2>
      <p class="text-[12px] text-[var(--fm-ink-soft)] mb-3">人ごとに登録しておくと、人件費を人単位で見られます。</p>

      <ul class="space-y-2 mb-3">
        <li v-for="w in workers" :key="w.id" class="flex flex-wrap items-center gap-2 border border-[var(--fm-line)] rounded-xl p-2.5">
          <input v-model="w.name" class="fm-input !w-auto flex-1 min-w-[110px]" @blur="updateWorker(w)" @keydown.enter="blurOnEnter" />
          <select v-model="w.employmentType" class="fm-input !w-auto text-[13px]" @change="updateWorker(w)">
            <option v-for="(label, key) in EMPLOYMENT_LABEL" :key="key" :value="key">{{ label }}</option>
          </select>
          <div class="relative w-[120px]">
            <input v-model.number="w.monthlyCost" type="number" inputmode="numeric" class="fm-input fm-num text-right pr-10" @blur="updateWorker(w)" @keydown.enter="blurOnEnter" />
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--fm-ink-soft)]">円/月</span>
          </div>
          <button class="text-[12px] text-[var(--fm-ink-soft)] hover:text-[var(--fm-minus)] px-1" @click="removeWorker(w.id)">削除</button>
        </li>
      </ul>

      <div class="flex gap-2">
        <input v-model="newWorkerName" class="fm-input flex-1" placeholder="名前を入れて追加" @keydown.enter="runOnEnter($event, addWorker)" />
        <button class="fm-btn-ghost shrink-0" :disabled="!newWorkerName.trim()" @click="addWorker">追加</button>
      </div>

      <div v-if="workers.some((w) => w.monthlyCost > 0)" class="mt-4 pt-3 border-t border-[var(--fm-line)]">
        <div class="flex flex-wrap items-center gap-2">
          <input v-model="payrollMonth" type="month" class="fm-input !w-auto text-[13px]" />
          <button class="fm-btn-ghost" :disabled="payrolling" @click="postPayroll">この月の人件費を計上する</button>
        </div>
        <p class="text-[11.5px] text-[var(--fm-ink-soft)] mt-1.5">月額の合計を1件の取引として登録します（人件費は納品書が出ないため）。</p>
        <p v-if="payrollMsg" class="text-[12.5px] mt-1.5" :style="{ color: payrollOk ? 'var(--fm-in-deep)' : 'var(--fm-minus)' }">{{ payrollMsg }}</p>
      </div>
    </section>

    <!-- 学習ルール -->
    <section class="fm-card p-4 mb-3">
      <h2 class="text-[15px] font-bold mb-1">覚えた分類</h2>
      <p class="text-[12px] text-[var(--fm-ink-soft)] mb-3">確定した「取引先 × 品目」は、次から自動で同じ科目に入ります。違うと思ったら消してください。</p>
      <p v-if="!rules.length" class="text-[13px] text-[var(--fm-ink-soft)] py-2">まだ何も覚えていません。</p>
      <ul v-else class="space-y-1.5 max-h-[320px] overflow-y-auto">
        <li v-for="r in rules" :key="r.id" class="flex items-center gap-2 text-[13px] border-b border-[var(--fm-line)] last:border-0 pb-1.5">
          <span class="truncate flex-1">{{ r.vendorNamePattern }} × {{ r.itemNamePattern }}</span>
          <span class="fm-tag shrink-0" :class="r.costType === 'FIXED' ? 'fm-tag--out' : 'fm-tag--in'">{{ r.accountName }}</span>
          <span class="fm-num text-[11px] text-[var(--fm-ink-soft)] shrink-0">{{ r.hitCount }}回</span>
          <button class="text-[12px] text-[var(--fm-ink-soft)] hover:text-[var(--fm-minus)] shrink-0" @click="removeRule(r.id)">消す</button>
        </li>
      </ul>
    </section>

    <!-- 科目の追加 -->
    <section class="fm-card p-4 mb-3">
      <h2 class="text-[15px] font-bold mb-1">科目を足す</h2>
      <p class="text-[12px] text-[var(--fm-ink-soft)] mb-3">実態に合わせて項目を増やせます（いまは{{ accounts.length }}科目）。</p>
      <div class="flex flex-wrap gap-2">
        <input v-model="newAccountName" class="fm-input flex-1 min-w-[160px]" placeholder="科目名" @keydown.enter="runOnEnter($event, addAccount)" />
        <select v-model="newAccountCategory" class="fm-input !w-auto text-[14px]">
          <option value="B_VARIABLE">B. 変動費（畑の中）</option>
          <option value="D_FIXED">D. 固定費（畑の外）</option>
          <option value="F_NON_OPERATING">F. 営業外</option>
          <option value="A_REVENUE">A. 売上高</option>
        </select>
        <button class="fm-btn-ghost shrink-0" :disabled="!newAccountName.trim()" @click="addAccount">追加</button>
      </div>
    </section>

    <!-- Excelとの行き来 -->
    <section class="fm-card p-4 mb-3">
      <h2 class="text-[15px] font-bold mb-1">Excelとのやりとり</h2>
      <p class="text-[12px] text-[var(--fm-ink-soft)] mb-3">いまのExcelをやめずに、並べて使えます。CSV（Excelで開ける形）で出し入れします。</p>

      <div class="flex flex-wrap items-center gap-2 mb-4">
        <input v-model.number="exportYear" type="number" class="fm-input !w-24 fm-num text-[14px]" />
        <button class="fm-btn-ghost" @click="exportLadder">収支表を書き出す</button>
        <button class="fm-btn-ghost" @click="exportItems">明細を書き出す</button>
      </div>

      <label class="fm-label">Excelから取り込む（CSVを貼り付け）</label>
      <textarea
        v-model="importCsv"
        rows="5"
        class="fm-input font-mono !text-[12px] resize-y"
        placeholder="発生日,取引先,品目,金額,科目名&#10;2026-07-03,◯◯農機店,軽油 20L,3600,燃料費"
      />
      <div class="flex flex-wrap gap-2 mt-2">
        <button class="fm-btn-ghost" :disabled="!importCsv.trim() || importing" @click="runImport(true)">中身を確かめる</button>
        <button class="fm-btn" :disabled="!importCsv.trim() || importing" @click="runImport(false)">取り込む</button>
      </div>
      <div v-if="importResult" class="mt-3 rounded-xl border border-[var(--fm-line)] bg-[var(--fm-paper-2)]/60 p-3 text-[12.5px] leading-relaxed">
        <p class="font-bold mb-1">
          {{ importResult.dryRun ? '取り込むとこうなります' : '取り込みました' }}：
          伝票 {{ importResult.transactions }}件 / 明細 {{ importResult.items }}件
        </p>
        <p v-for="(w, i) in importResult.warnings" :key="i" class="text-[var(--fm-warn)]">・{{ w }}</p>
      </div>
      <p v-if="importError" class="mt-2 text-[13px] text-[var(--fm-minus)]">{{ importError }}</p>
    </section>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import { EMPLOYMENT_LABEL } from '~/types/farm-manager'
import type { AccountMaster, AccountRule, FarmSettings, Worker } from '~/types/farm-manager'

definePageMeta({ layout: 'farm-manager' })
useHead({ title: '設定 | farm-manager' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const settings = reactive<FarmSettings>({ farmName: '', cultivatedAreaA: 0, openingCash: 0 })
const workers = ref<Worker[]>([])
const rules = ref<(AccountRule & { accountName: string })[]>([])
const accounts = ref<AccountMaster[]>([])

const savingSettings = ref(false)
const settingsSaved = ref(false)
const newWorkerName = ref('')
const newAccountName = ref('')
const newAccountCategory = ref('B_VARIABLE')
const currentMonth = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 7)
const payrollMonth = ref(currentMonth)
const payrolling = ref(false)
const payrollMsg = ref('')
const payrollOk = ref(false)
const exportYear = ref(Number(currentMonth.slice(0, 4)))
const importCsv = ref('')
const importing = ref(false)
const importError = ref('')
interface ImportResult { dryRun: boolean; transactions: number; items: number; provisional: number; warnings: string[] }
const importResult = ref<ImportResult | null>(null)

// 日本語入力の変換確定Enterでも @keydown.enter は発火する。
// そのまま blur/追加を走らせると「素振り素振り」のような二重入力になるので必ず弾く。
function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
function blurOnEnter(e: KeyboardEvent) {
  if (isImeEnter(e)) return
  ;(e.target as HTMLInputElement).blur()
}
function runOnEnter(e: KeyboardEvent, fn: () => void) {
  if (isImeEnter(e)) return
  fn()
}

async function load() {
  try {
    const [s, w, r, a] = await Promise.all([
      $fetch<FarmSettings>('/api/farm-manager/settings'),
      $fetch<Worker[]>('/api/farm-manager/workers'),
      $fetch<(AccountRule & { accountName: string })[]>('/api/farm-manager/rules'),
      $fetch<AccountMaster[]>('/api/farm-manager/accounts'),
    ])
    Object.assign(settings, s)
    workers.value = w
    rules.value = r
    accounts.value = a
  } catch { /* 未ログインならモーダルが出る */ }
}

async function saveSettings() {
  savingSettings.value = true
  settingsSaved.value = false
  try {
    const saved = await $fetch<FarmSettings>('/api/farm-manager/settings', { method: 'PUT', body: settings })
    Object.assign(settings, saved)
    settingsSaved.value = true
  } catch (e: any) {
    alert(e?.data?.message || '保存に失敗しました')
  } finally {
    savingSettings.value = false
  }
}

async function addWorker() {
  const name = newWorkerName.value.trim()
  if (!name) return
  workers.value = await $fetch<Worker[]>('/api/farm-manager/workers', { method: 'POST', body: { name } })
  newWorkerName.value = ''
}
async function updateWorker(w: Worker) {
  await $fetch(`/api/farm-manager/workers/${w.id}`, {
    method: 'PATCH',
    body: { name: w.name, employmentType: w.employmentType, monthlyCost: w.monthlyCost },
  })
}
async function removeWorker(id: string) {
  if (!confirm('この人を削除します。過去の記録はそのまま残ります。')) return
  workers.value = await $fetch<Worker[]>(`/api/farm-manager/workers/${id}`, { method: 'DELETE' })
}

async function postPayroll() {
  payrolling.value = true
  payrollMsg.value = ''
  try {
    await $fetch('/api/farm-manager/workers/payroll', { method: 'POST', body: { month: payrollMonth.value } })
    payrollOk.value = true
    payrollMsg.value = `${payrollMonth.value} の人件費を計上しました。`
  } catch (e: any) {
    payrollOk.value = false
    payrollMsg.value = e?.data?.message || '計上に失敗しました'
  } finally {
    payrolling.value = false
  }
}

async function removeRule(id: string) {
  await $fetch(`/api/farm-manager/rules/${id}`, { method: 'DELETE' })
  rules.value = rules.value.filter((r) => r.id !== id)
}

async function addAccount() {
  const name = newAccountName.value.trim()
  if (!name) return
  try {
    await $fetch('/api/farm-manager/accounts', { method: 'POST', body: { name, category: newAccountCategory.value } })
    newAccountName.value = ''
    accounts.value = await $fetch<AccountMaster[]>('/api/farm-manager/accounts')
  } catch (e: any) {
    alert(e?.data?.message || '追加に失敗しました')
  }
}

function exportLadder() {
  window.location.href = `/api/farm-manager/export/csv?type=ladder&year=${exportYear.value}`
}
function exportItems() {
  window.location.href = `/api/farm-manager/export/csv?type=items&year=${exportYear.value}`
}

async function runImport(dryRun: boolean) {
  importing.value = true
  importError.value = ''
  importResult.value = null
  try {
    importResult.value = await $fetch<ImportResult>('/api/farm-manager/import', { method: 'POST', body: { csv: importCsv.value, dryRun } })
    if (!dryRun) importCsv.value = ''
  } catch (e: any) {
    importError.value = e?.data?.message || '取り込みに失敗しました'
  } finally {
    importing.value = false
  }
}

watch(isLoggedIn, (v) => { if (v) load() })

onMounted(async () => {
  await checkAuth()
  await load()
})
</script>
