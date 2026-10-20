<template>
  <div>
    <p v-if="state === 'loading'" class="kk-lead py-10 text-center">読み込んでいます…</p>

    <!-- 管理者でない人には、ふつうの「見つかりません」と同じに見せる（管理画面があることを伝えない） -->
    <div v-else-if="state === 'notfound'" class="py-16 text-center">
      <p class="kk-h1 m-0">ページが見つかりません</p>
      <NuxtLink to="/" class="kk-btn-text mt-3 inline-block">最初の画面にもどる</NuxtLink>
    </div>

    <template v-else>
      <div class="kk-adm-head">
        <div>
          <h1 class="kk-h1 m-0">管理画面</h1>
          <p class="kk-note m-0">利用者と契約の状態。議事録の中身（名前・本文）はここには出しません。</p>
        </div>
        <span class="kk-adm-mode" :class="{ 'is-paid': !summary?.monitorMode }">
          {{ summary?.monitorMode ? 'モニター期間中（全員が無料で使えます）' : '有料モード' }}
        </span>
      </div>

      <p v-if="errorMessage" class="kk-notice kk-notice--error kk-msg mt-3">
        <span>{{ errorMessage }}</span>
        <button type="button" class="kk-msg-close" aria-label="閉じる" @click="errorMessage = ''">✕</button>
      </p>
      <p v-if="savedMessage" class="kk-notice kk-notice--info kk-msg mt-3">
        <span>{{ savedMessage }}</span>
        <button type="button" class="kk-msg-close" aria-label="閉じる" @click="savedMessage = ''">✕</button>
      </p>

      <!-- 全体の数字 -->
      <div v-if="summary" class="kk-adm-stats mt-3">
        <div v-for="s in stats" :key="s.label" class="kk-card kk-adm-stat">
          <span class="kk-adm-stat-label">{{ s.label }}</span>
          <span class="kk-adm-stat-num" :class="s.tone">{{ s.value }}</span>
          <span v-if="s.sub" class="kk-adm-stat-sub">{{ s.sub }}</span>
        </div>
      </div>

      <!-- 保存容量（D1）の目安 -->
      <section v-if="summary" class="kk-card kk-adm-storage mt-3">
        <div class="kk-adm-storage-head">
          <h2 class="kk-h2 m-0">保存容量（D1）</h2>
          <span class="kk-adm-storage-num">
            {{ formatBytes(summary.storage.dbBytes) }} / {{ formatBytes(summary.storage.limitBytes) }}
            <span class="kk-note">（{{ storagePercent }}%）</span>
          </span>
        </div>
        <div class="kk-adm-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="storagePercent">
          <div class="kk-adm-meter-fill" :class="{ 'is-warn': storagePercent >= 70 }" :style="{ width: `${Math.max(1, storagePercent)}%` }" />
        </div>
        <p class="kk-note mt-1 mb-0">
          議事録1件あたり平均 {{ formatBytes(summary.storage.avgRecordBytes) }}。
          このままの平均で、あと約 <strong>{{ summary.storage.remainingRecords.toLocaleString() }}件</strong> 入ります。
          上限は Workers の無料プランの1データベースあたりの値です（有料プランなら 10GB）。
        </p>
      </section>

      <!-- 利用者の一覧 -->
      <section class="kk-card kk-adm-list mt-4">
        <div class="kk-adm-list-head">
          <h2 class="kk-h2 m-0">利用者<span class="kk-note ml-1">{{ filtered.length }} / {{ users.length }}人</span></h2>
          <div class="kk-adm-tools">
            <input v-model="query" class="kk-input kk-adm-search" placeholder="メール・名前で探す" aria-label="メール・名前で探す">
            <div class="kk-adm-filters" role="group" aria-label="絞り込み">
              <button
                v-for="f in filters"
                :key="f.key"
                type="button"
                class="kk-adm-chip"
                :class="{ 'is-on': filter === f.key }"
                @click="filter = f.key"
              >
                {{ f.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="kk-adm-scroll">
          <table class="kk-adm-table">
            <thead>
              <tr>
                <th>利用者</th>
                <th>登録日</th>
                <th>最後のログイン</th>
                <th class="text-right">議事録</th>
                <th class="text-right">今月のAI</th>
                <th v-if="summary?.approvalRequired">承認</th>
                <th>契約</th>
                <th>支払い不要</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filtered.length">
                <td :colspan="summary?.approvalRequired ? 8 : 7" class="kk-adm-empty">当てはまる利用者はいません。</td>
              </tr>
              <tr v-for="u in filtered" :key="u.id" :class="{ 'is-blocked': !u.canUse, 'is-pending': !u.approved }">
                <td>
                  <span class="kk-adm-email">{{ u.email || '（メールなし）' }}</span>
                  <span v-if="u.displayName" class="kk-adm-sub">{{ u.displayName }}</span>
                  <span class="kk-adm-sub kk-adm-id" :title="u.id">{{ u.id }}</span>
                  <!-- お休み（退会）中。預かる期限を過ぎたら、ここから消せる -->
                  <span v-if="u.withdrawn" class="kk-adm-sub">
                    <span class="kk-adm-badge" :class="u.retentionExpired ? 'is-warn' : ''">{{ u.retentionExpired ? 'お預かり期限切れ' : 'お休み中' }}</span>
                    {{ u.retainUntil }}まで預かり
                    <button v-if="u.retentionExpired" type="button" class="kk-adm-approve" @click="purgeTarget = u">データを消す</button>
                  </span>
                </td>
                <td class="kk-adm-date">{{ u.createdAt.slice(0, 10) }}</td>
                <td class="kk-adm-date">{{ u.lastLoginAt }}</td>
                <td class="text-right">{{ u.recordCount }}</td>
                <td class="text-right">
                  <span :class="{ 'kk-adm-warn': u.usedPercent >= 80 }">{{ u.usedPercent }}%</span>
                  <span class="kk-adm-sub">約{{ u.costYen }}円</span>
                  <button
                    v-if="u.usedPercent > 0"
                    type="button"
                    class="kk-adm-approved"
                    title="今月の利用量を0に戻します"
                    @click="resetTarget = u"
                  >
                    0にリセット
                  </button>
                </td>
                <td v-if="summary?.approvalRequired">
                  <span v-if="u.isAdmin" class="kk-adm-sub">—</span>
                  <button
                    v-else-if="!u.approved"
                    type="button"
                    class="kk-adm-approve"
                    :disabled="approvingId === u.id"
                    @click="setApproval(u, true)"
                  >
                    {{ approvingId === u.id ? '承認中…' : '承認する' }}
                  </button>
                  <button v-else type="button" class="kk-adm-approved" title="押すと承認を取り消せます" @click="unapproveTarget = u">
                    承認済み
                  </button>
                </td>
                <td>
                  <span class="kk-adm-badge" :class="statusTone(u.status)">{{ statusLabel(u.status) }}</span>
                  <span v-if="u.currentPeriodEnd && u.status" class="kk-adm-sub">
                    {{ u.cancelAtPeriodEnd ? `${u.currentPeriodEnd}で解約` : `次回 ${u.currentPeriodEnd}` }}
                  </span>
                </td>
                <td>
                  <span v-if="u.isAdmin" class="kk-adm-badge is-admin">管理者</span>
                  <button
                    v-else
                    type="button"
                    class="kk-adm-grant"
                    :class="{ 'is-on': u.freeAccess }"
                    :aria-label="`${u.email}の支払い不要を変える`"
                    @click="openGrant(u)"
                  >
                    <span class="kk-adm-switch" aria-hidden="true" />
                    {{ u.freeAccess ? '不要' : '—' }}
                  </button>
                  <span v-if="u.note" class="kk-adm-sub kk-adm-note" :title="u.note">{{ u.note }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 操作の記録 -->
      <details class="kk-card kk-adm-audit mt-4" @toggle="onAuditToggle">
        <summary>操作の記録（新しい順・50件まで）</summary>
        <p v-if="auditLoading" class="kk-note px-4 pb-3 m-0">読み込んでいます…</p>
        <p v-else-if="!audit.length" class="kk-note px-4 pb-3 m-0">まだ記録はありません。</p>
        <ul v-else class="kk-adm-audit-list">
          <li v-for="a in audit" :key="a.id">
            <span class="kk-adm-date">{{ a.createdAt }}</span>
            <span>{{ a.adminEmail }} が <strong>{{ a.targetEmail }}</strong> を{{ actionLabel(a.action) }}</span>
            <span v-if="a.detail" class="kk-adm-sub">メモ: {{ a.detail }}</span>
          </li>
        </ul>
      </details>

      <!-- 承認の取り消し（押し間違いで、使っている人を止めないよう確認を挟む） -->
      <BottomSheet
        :model-value="!!unapproveTarget"
        title="承認を取り消しますか？"
        :closable="!approvingId"
        @update:model-value="unapproveTarget = null"
      >
        <template v-if="unapproveTarget">
          <p class="kk-lead m-0"><strong>{{ unapproveTarget.email }}</strong></p>
          <p class="kk-lead mt-1">取り消すと、この人は議事録作りとAIの直しが使えなくなります（議事録の閲覧とPDFは使えます）。</p>
          <div class="mt-4 flex flex-col gap-2">
            <button class="kk-btn-sub" :disabled="!!approvingId" @click="setApproval(unapproveTarget, false)">
              {{ approvingId ? '取り消しています…' : 'はい、取り消します' }}
            </button>
            <button class="kk-btn-text" :disabled="!!approvingId" @click="unapproveTarget = null">やめる</button>
          </div>
        </template>
      </BottomSheet>

      <!-- 今月のAI利用量のリセット（元に戻せないので確認を挟む） -->
      <BottomSheet
        :model-value="!!resetTarget"
        title="今月のAI利用量をリセットしますか？"
        :closable="!resetting"
        @update:model-value="resetTarget = null"
      >
        <template v-if="resetTarget">
          <p class="kk-lead m-0"><strong>{{ resetTarget.email }}</strong></p>
          <p class="kk-lead mt-1">
            今月の利用量（{{ resetTarget.usedPercent }}%・約{{ resetTarget.costYen }}円）を0%に戻します。元には戻せません。
          </p>
          <div class="mt-4 flex flex-col gap-2">
            <button class="kk-btn-sub" :disabled="resetting" @click="resetUsage(resetTarget)">
              {{ resetting ? 'リセットしています…' : 'はい、0にリセットします' }}
            </button>
            <button class="kk-btn-text" :disabled="resetting" @click="resetTarget = null">やめる</button>
          </div>
        </template>
      </BottomSheet>

      <!-- 預かる期限が切れたお休み中のデータを消す（元に戻せないので確認を挟む） -->
      <BottomSheet
        :model-value="!!purgeTarget"
        title="この人のデータを消しますか？"
        :closable="!purging"
        @update:model-value="purgeTarget = null"
      >
        <template v-if="purgeTarget">
          <p class="kk-lead m-0"><strong>{{ purgeTarget.email }}</strong></p>
          <p class="kk-lead mt-1">
            お預かりの期限（{{ purgeTarget.retainUntil }}）を過ぎています。議事録（{{ purgeTarget.recordCount }}件）・設定などをすべて消します。元には戻せません。
          </p>
          <div class="mt-4 flex flex-col gap-2">
            <button class="kk-btn-sub" :disabled="purging" @click="purgeUser(purgeTarget)">
              {{ purging ? '消しています…' : 'はい、消します' }}
            </button>
            <button class="kk-btn-text" :disabled="purging" @click="purgeTarget = null">やめる</button>
          </div>
        </template>
      </BottomSheet>

      <!-- 支払い不要の切り替え -->
      <BottomSheet :model-value="!!editing" title="支払い不要の設定" :closable="!saving" @update:model-value="editing = null">
        <template v-if="editing">
          <p class="kk-lead m-0"><strong>{{ editing.email }}</strong></p>
          <label class="kk-adm-check mt-3">
            <input v-model="draftFree" type="checkbox">
            <span>お支払いなしで使えるようにする</span>
          </label>
          <p class="kk-note mt-1">有料モードでも、契約なしで議事録作り・AIの直しが使えます。月の利用上限は他の人と同じです。</p>
          <label class="kk-field-label mt-3" for="grant-note">メモ（なぜそうしたか。本人には見えません）</label>
          <input id="grant-note" v-model="draftNote" class="kk-input" maxlength="200" placeholder="れい: 家族／モニターのお礼">
          <div class="mt-4 flex flex-col gap-2">
            <button class="kk-btn" :disabled="saving" @click="saveGrant">{{ saving ? '保存しています…' : '保存する' }}</button>
            <button class="kk-btn-text" :disabled="saving" @click="editing = null">やめる</button>
          </div>
        </template>
      </BottomSheet>
    </template>
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import { isActiveStatus, isPaymentProblem } from '~/types/billing'
import type { AdminAuditRow, AdminSummary, AdminUserRow } from '~/types/admin'



const router = useRouter()
const { isLoggedIn, waitReady, authedFetch } = useAuth()

const state = ref<'loading' | 'ready' | 'notfound'>('loading')
// 題名は管理者と分かってから出す（タブの題名で管理画面があることを伝えない）
useHead({
  title: computed(() => (state.value === 'ready' ? `管理画面 — ${SERVICE.name}` : SERVICE.name)),
  meta: [{ name: 'robots', content: 'noindex' }],
})
const errorMessage = ref('')
const savedMessage = ref('')
const users = ref<AdminUserRow[]>([])
const summary = ref<AdminSummary | null>(null)

async function load() {
  try {
    const res = await authedFetch<{ users: AdminUserRow[]; summary: AdminSummary }>('/api/admin/users')
    users.value = res.users
    summary.value = res.summary
    state.value = 'ready'
  } catch (e: any) {
    // 管理者でなければサーバーは 404 を返す。そのときは見つからない画面にする
    if (e?.statusCode === 404 || e?.status === 404) {
      state.value = 'notfound'
      return
    }
    errorMessage.value = apiMessage(e, '読み込めませんでした。画面を開き直してみてください。')
    state.value = 'ready'
  }
}

// ── 全体の数字 ──
const stats = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    ...(s.approvalRequired
      ? [{ label: '承認待ち', value: `${s.pendingCount}人`, sub: '承認すると使えるようになります', tone: s.pendingCount ? 'is-warn' : '' }]
      : []),
    { label: '登録者', value: `${s.userCount}人`, sub: '', tone: '' },
    ...(s.withdrawnCount
      ? [{ label: 'お休み中', value: `${s.withdrawnCount}人`, sub: s.expiredCount ? `うち期限切れ ${s.expiredCount}人（消せます）` : '預かり期間中', tone: s.expiredCount ? 'is-warn' : '' }]
      : []),
    { label: '契約中', value: `${s.payingCount}人`, sub: s.trialingCount ? `うち無料期間 ${s.trialingCount}人` : '', tone: '' },
    { label: '支払い遅れ', value: `${s.paymentProblemCount}人`, sub: 'カードの更新待ち', tone: s.paymentProblemCount ? 'is-warn' : '' },
    { label: '支払い不要', value: `${s.freeAccessCount}人`, sub: '管理者を含む', tone: '' },
    { label: '議事録', value: `${s.recordCount}件`, sub: `直近30日 ${s.recentRecordCount}件`, tone: '' },
    { label: '今月のAI代', value: `約${s.monthCostYen.toLocaleString()}円`, sub: '1ドル=160円で換算', tone: '' },
  ]
})

// ── 絞り込み ──
type FilterKey = 'all' | 'pending' | 'paying' | 'free' | 'none' | 'problem' | 'withdrawn'
const filters = computed<{ key: FilterKey; label: string }[]>(() => [
  { key: 'all', label: 'すべて' },
  ...(summary.value?.approvalRequired ? [{ key: 'pending' as const, label: '承認待ち' }] : []),
  { key: 'paying', label: '契約中' },
  { key: 'free', label: '支払い不要' },
  { key: 'none', label: '未契約' },
  { key: 'problem', label: '支払い遅れ' },
  { key: 'withdrawn', label: 'お休み中' },
])
const filter = ref<FilterKey>('all')
const query = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return users.value.filter((u) => {
    if (q && !`${u.email} ${u.displayName} ${u.id}`.toLowerCase().includes(q)) return false
    switch (filter.value) {
      case 'pending':
        return !u.approved
      case 'paying':
        return isActiveStatus(u.status)
      case 'free':
        return u.freeAccess || u.isAdmin
      case 'none':
        return !isActiveStatus(u.status) && !u.freeAccess && !u.isAdmin
      case 'problem':
        return isPaymentProblem(u.status)
      case 'withdrawn':
        return u.withdrawn
      default:
        return true
    }
  })
})

const STATUS_LABELS: Record<string, string> = {
  active: '契約中',
  trialing: '無料期間',
  past_due: '支払い遅れ',
  unpaid: '未払いで停止',
  canceled: '解約済み',
  incomplete: '手続き途中',
  incomplete_expired: '手続き切れ',
  paused: '一時停止',
}
function statusLabel(status: string): string {
  if (!status) return '未契約'
  return STATUS_LABELS[status] ?? status
}
function statusTone(status: string): string {
  if (isPaymentProblem(status)) return 'is-warn'
  if (status === 'trialing') return 'is-trial'
  if (isActiveStatus(status)) return 'is-ok'
  return ''
}

// ── 保存容量 ──
const storagePercent = computed(() => {
  const st = summary.value?.storage
  if (!st || !st.limitBytes) return 0
  return Math.min(100, Math.round((st.dbBytes / st.limitBytes) * 1000) / 10)
})

function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(1)}GB`
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`
  if (n >= 1024) return `${Math.round(n / 1024)}KB`
  return `${n}B`
}

// ── 承認 ──
const approvingId = ref('')
const unapproveTarget = ref<AdminUserRow | null>(null)

async function setApproval(u: AdminUserRow, approved: boolean) {
  errorMessage.value = ''
  savedMessage.value = ''
  approvingId.value = u.id
  try {
    await authedFetch(`/api/admin/users/${encodeURIComponent(u.id)}/approval`, {
      method: 'PUT',
      body: { approved },
    })
    savedMessage.value = approved ? `${u.email} を承認しました。` : `${u.email} の承認を取り消しました。`
    unapproveTarget.value = null
    await load()
    if (auditOpen.value) await loadAudit()
  } catch (e) {
    errorMessage.value = apiMessage(e, '保存できませんでした。もう一度お試しください。')
  }
  approvingId.value = ''
}

// ── 今月のAI利用量のリセット ──
const resetTarget = ref<AdminUserRow | null>(null)
const resetting = ref(false)

async function resetUsage(u: AdminUserRow) {
  errorMessage.value = ''
  savedMessage.value = ''
  resetting.value = true
  try {
    await authedFetch(`/api/admin/users/${encodeURIComponent(u.id)}/usage-reset`, { method: 'POST' })
    savedMessage.value = `${u.email} の今月のAI利用量を0にしました。`
    resetTarget.value = null
    await load()
    if (auditOpen.value) await loadAudit()
  } catch (e) {
    errorMessage.value = apiMessage(e, '保存できませんでした。もう一度お試しください。')
  }
  resetting.value = false
}

// ── 預かる期限を過ぎたお休み中のデータを消す ──
const purgeTarget = ref<AdminUserRow | null>(null)
const purging = ref(false)

async function purgeUser(u: AdminUserRow) {
  errorMessage.value = ''
  savedMessage.value = ''
  purging.value = true
  try {
    await authedFetch(`/api/admin/users/${encodeURIComponent(u.id)}/purge`, { method: 'POST' })
    savedMessage.value = `${u.email} のデータを消しました。`
    purgeTarget.value = null
    await load()
    if (auditOpen.value) await loadAudit()
  } catch (e) {
    errorMessage.value = apiMessage(e, '消せませんでした。もう一度お試しください。')
  }
  purging.value = false
}

// ── 支払い不要の切り替え ──
const editing = ref<AdminUserRow | null>(null)
const draftFree = ref(false)
const draftNote = ref('')
const saving = ref(false)

function openGrant(u: AdminUserRow) {
  editing.value = u
  draftFree.value = u.freeAccess
  draftNote.value = u.note
}

async function saveGrant() {
  const u = editing.value
  if (!u) return
  errorMessage.value = ''
  savedMessage.value = ''
  saving.value = true
  try {
    await authedFetch(`/api/admin/users/${encodeURIComponent(u.id)}/grant`, {
      method: 'PUT',
      body: { freeAccess: draftFree.value, note: draftNote.value },
    })
    savedMessage.value = draftFree.value
      ? `${u.email} を支払い不要にしました。`
      : `${u.email} の支払い不要を外しました。`
    editing.value = null
    await load()
    if (auditOpen.value) await loadAudit()
  } catch (e) {
    errorMessage.value = apiMessage(e, '保存できませんでした。もう一度お試しください。')
  }
  saving.value = false
}

// ── 操作の記録（開いたときだけ読む） ──
const audit = ref<AdminAuditRow[]>([])
const auditLoading = ref(false)
const auditOpen = ref(false)

async function loadAudit() {
  auditLoading.value = true
  try {
    audit.value = (await authedFetch<{ audit: AdminAuditRow[] }>('/api/admin/audit')).audit
  } catch (e) {
    errorMessage.value = apiMessage(e, '操作の記録を読み込めませんでした。')
  }
  auditLoading.value = false
}

function onAuditToggle(e: Event) {
  auditOpen.value = (e.target as HTMLDetailsElement).open
  if (auditOpen.value) loadAudit()
}

function actionLabel(action: string): string {
  if (action === 'grant_free_access') return '支払い不要にしました'
  if (action === 'revoke_free_access') return '支払い不要から外しました'
  if (action === 'approve') return '承認しました'
  if (action === 'reset_ai_usage') return '今月のAI利用量を0にしました'
  if (action === 'unapprove') return '承認を取り消しました'
  if (action === 'purge_expired') return '預かる期限が切れたためデータを消しました'
  return `操作しました（${action}）`
}

watch(isLoggedIn, async (v) => {
  if (v) await load()
})

onMounted(async () => {
  await waitReady()
  if (!isLoggedIn.value) {
    await router.replace('/')
    return
  }
  await load()
})
</script>

<style scoped>
.kk-adm-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5rem;
}
.kk-adm-mode {
  font-size: 12px;
  font-weight: 700;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
}
.kk-adm-mode.is-paid {
  background: var(--kk-cta-soft);
  color: var(--kk-warn);
}

.kk-adm-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
}
.kk-adm-stat {
  padding: 0.55rem 0.8rem;
  display: flex;
  flex-direction: column;
}
.kk-adm-stat-label {
  font-size: 11.5px;
  color: var(--kk-ink-faint);
}
.kk-adm-stat-num {
  font-size: 19px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--kk-accent-strong);
}
.kk-adm-stat-num.is-warn {
  color: var(--kk-warn);
}
.kk-adm-stat-sub {
  font-size: 11px;
  color: var(--kk-ink-faint);
}

.kk-adm-storage {
  padding: 0.7rem 0.9rem;
}
.kk-adm-storage-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.3rem;
}
.kk-adm-storage-num {
  font-size: 14px;
  font-weight: 700;
  color: var(--kk-accent-strong);
}
.kk-adm-meter {
  margin-top: 0.4rem;
  height: 8px;
  border-radius: 999px;
  background: var(--kk-accent-soft);
  overflow: hidden;
}
.kk-adm-meter-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--kk-accent);
}
.kk-adm-meter-fill.is-warn {
  background: var(--kk-cta);
}
.kk-adm-list {
  overflow: hidden;
}
.kk-adm-list-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid var(--kk-line);
}
.kk-adm-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.kk-adm-search {
  width: 14rem;
  padding: 0.3rem 0.6rem;
}
.kk-adm-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.kk-adm-chip {
  height: 28px;
  padding: 0 0.65rem;
  border: 1px solid var(--kk-line);
  border-radius: 999px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  color: var(--kk-ink-soft);
  cursor: pointer;
}
.kk-adm-chip.is-on {
  border-color: var(--kk-accent);
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  font-weight: 700;
}

/* 列が多いので、狭い画面では表ごと横に動かす */
.kk-adm-scroll {
  overflow-x: auto;
}
.kk-adm-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}
.kk-adm-table th {
  padding: 0.4rem 0.75rem;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--kk-ink-faint);
  text-align: left;
  background: #f8fafd;
  border-bottom: 1px solid var(--kk-line);
  white-space: nowrap;
}
.kk-adm-table td {
  padding: 0.45rem 0.75rem;
  font-size: 12.5px;
  color: var(--kk-ink-soft);
  border-bottom: 1px solid var(--kk-line);
  vertical-align: top;
}
.kk-adm-table tbody tr:last-child td {
  border-bottom: 0;
}
.kk-adm-table tbody tr:hover {
  background: #f8fbff;
}
/* いま使えない人（有料モードで未契約など）は薄くする */
.kk-adm-table tr.is-blocked .kk-adm-email {
  color: var(--kk-ink-faint);
}
/* 承認待ちの行は目立たせる（新しく来た人に気づけるように） */
.kk-adm-table tr.is-pending td {
  background: #fffaf2;
}
.kk-adm-approve {
  height: 26px;
  padding: 0 0.7rem;
  border: 0;
  border-radius: 999px;
  background: var(--kk-cta);
  color: #fff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.kk-adm-approve:hover:not(:disabled) {
  background: var(--kk-cta-strong);
}
.kk-adm-approve:disabled {
  opacity: 0.5;
  cursor: default;
}
.kk-adm-approved {
  padding: 0 0.45rem;
  border: 0;
  border-radius: 999px;
  background: #e8f6ee;
  color: #1e7a45;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.kk-adm-approved:hover {
  background: var(--kk-danger-soft);
  color: var(--kk-danger);
}
.kk-adm-empty {
  text-align: center;
  padding: 1.5rem !important;
}
.kk-adm-email {
  display: block;
  font-weight: 700;
  color: var(--kk-ink);
}
.kk-adm-sub {
  display: block;
  font-size: 11px;
  color: var(--kk-ink-faint);
}
.kk-adm-id {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.kk-adm-note {
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kk-adm-date {
  white-space: nowrap;
}
.kk-adm-warn {
  color: var(--kk-warn);
  font-weight: 700;
}
.kk-adm-badge {
  display: inline-block;
  padding: 0 0.45rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: #eef1f5;
  color: var(--kk-ink-soft);
  white-space: nowrap;
}
.kk-adm-badge.is-ok {
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
}
.kk-adm-badge.is-trial {
  background: #e8f6ee;
  color: #1e7a45;
}
.kk-adm-badge.is-warn {
  background: var(--kk-warn-soft);
  color: var(--kk-warn);
}
.kk-adm-badge.is-admin {
  background: #f1ecfb;
  color: #5b3fa8;
}

/* 支払い不要のスイッチ。押すと確認の画面が出る（その場で切り替えない＝押し間違いで外さない） */
.kk-adm-grant {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.1rem 0.3rem 0.1rem 0.1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--kk-ink-faint);
  cursor: pointer;
}
.kk-adm-grant:hover {
  background: var(--kk-accent-soft);
}
.kk-adm-switch {
  position: relative;
  width: 30px;
  height: 17px;
  border-radius: 999px;
  background: #cfd8e3;
  transition: background-color 0.15s;
}
.kk-adm-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 13px;
  height: 13px;
  border-radius: 999px;
  background: #fff;
  transition: transform 0.15s;
}
.kk-adm-grant.is-on {
  color: var(--kk-accent-strong);
}
.kk-adm-grant.is-on .kk-adm-switch {
  background: var(--kk-accent);
}
.kk-adm-grant.is-on .kk-adm-switch::after {
  transform: translateX(13px);
}

.kk-adm-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.kk-adm-check input {
  width: 18px;
  height: 18px;
  accent-color: var(--kk-accent);
}

.kk-adm-audit summary {
  padding: 0.6rem 0.9rem;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.kk-adm-audit-list {
  list-style: none;
  margin: 0;
  padding: 0 0.9rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 12.5px;
  color: var(--kk-ink-soft);
}
.kk-adm-audit-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.6rem;
  padding-top: 0.35rem;
  border-top: 1px dashed var(--kk-line);
}

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
</style>
