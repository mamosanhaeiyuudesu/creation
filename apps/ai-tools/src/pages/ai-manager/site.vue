<template>
  <div>
    <header class="bg-white border-b border-slate-200">
      <div class="am-wrap-sm mx-auto px-4 py-3">
        <NuxtLink to="/ai-manager" class="text-xs text-sky-700 hover:underline">← AI管理の一覧へ</NuxtLink>
        <template v-if="site">
          <h1 class="text-lg font-bold m-0 mt-1 flex flex-wrap items-center gap-2">
            <span class="am-app" :data-tool="site.tool">{{ AI_MANAGER_TOOL_LABELS[site.tool] }}</span>
            {{ site.feature }}
            <span v-if="site.status === 'removed'" class="am-badge">撤去済み</span>
          </h1>
          <p class="text-sm text-slate-600 m-0 mt-1">
            {{ live.model }}
            <span class="text-slate-400">·</span> {{ AI_MANAGER_PROVIDER_LABELS[live.provider] ?? live.provider }}・{{ AI_MANAGER_KIND_LABELS[live.kind] ?? live.kind }}
            <template v-for="o in optionList(live.options)" :key="o.key">
              <span class="text-slate-400">·</span> {{ o.label }} {{ o.value }}
            </template>
            <span class="text-slate-400">·</span> 修正 {{ changes.length }}回
          </p>
        </template>
      </div>
    </header>

    <main class="am-wrap-sm mx-auto px-4 py-4">
      <p v-if="loading" class="text-center text-slate-500 py-10">読み込んでいます…</p>
      <div v-else-if="error" class="bg-white border border-slate-200 rounded p-6 text-center">
        <p class="m-0">{{ error }}</p>
      </div>

      <template v-else-if="site">
        <!-- いまのプロンプト（全文） -->
        <section class="mb-6">
          <div class="flex items-center gap-2 mb-1.5">
            <h2 class="text-sm font-bold m-0">{{ site.status === 'removed' ? '撤去する前のシステムプロンプト' : 'いまのシステムプロンプト' }}</h2>
            <button v-if="live.system" type="button" class="text-xs text-sky-700 hover:underline ml-auto" @click="copy(live.system)">{{ copied ? 'コピーしました' : 'コピー' }}</button>
          </div>
          <div v-if="live.system" class="am-prose">{{ live.system }}</div>
          <p v-else class="text-sm text-slate-500 m-0">システムプロンプトはありません（指示はユーザープロンプトに書いています）。</p>

          <template v-if="live.user">
            <h2 class="text-sm font-bold m-0 mt-4 mb-1.5">いまのユーザープロンプト</h2>
            <div class="am-prose am-prose-sub">{{ live.user }}</div>
          </template>
        </section>

        <!-- 修正の歴史（新しい順・すべて開いた状態） -->
        <h2 class="text-sm font-bold m-0 mb-2">これまでの修正</h2>
        <ol class="list-none m-0 p-0 border-l-2 border-slate-200 ml-2">
          <template v-for="item in history" :key="item.version.commit">
            <li v-if="item.appChange" class="ml-4 my-3 text-xs text-slate-500">
              ── {{ AI_MANAGER_APP_LABELS[item.appChange.from] }} から {{ AI_MANAGER_APP_LABELS[item.appChange.to] }} へ{{ item.types.includes('forked') ? '派生' : '移動' }} ──
            </li>
            <li :id="`v-${item.version.commit.slice(0, 12)}`" class="ml-4 mb-4 relative">
              <span class="absolute am-dot top-3 w-3 h-3 rounded-full border-2 border-white" :style="{ background: dotColor(item.types) }" />
              <div class="bg-white border rounded px-4 py-3" :class="highlight === item.version.commit.slice(0, 12) ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-200'">
                <div class="flex flex-wrap items-center gap-1.5 text-sm">
                  <span class="tabular-nums font-bold">{{ formatDate(item.version.date) }}</span>
                  <span v-for="t in item.types" :key="t" class="am-badge" :data-type="t">{{ AI_MANAGER_CHANGE_LABELS[t] }}</span>
                  <span class="text-xs text-slate-500 ml-auto">{{ item.version.model }}</span>
                </div>
                <p class="am-summary">{{ item.summary }}</p>

                <!-- モデル・オプションは変わったものだけ -->
                <ul v-if="settingChanges(item).length" class="list-none m-0 mt-2 p-0 text-sm space-y-0.5">
                  <li v-for="c in settingChanges(item)" :key="c.label">
                    <span class="text-slate-500">{{ c.label }}:</span>
                    <template v-if="c.before !== null"><span class="am-ins-del ml-1">{{ c.before }}</span> → </template>
                    <span class="am-ins-add" :class="{ 'ml-1': c.before === null }">{{ c.after ?? '（なし）' }}</span>
                  </li>
                </ul>

                <!-- システムプロンプトの差分（主役） -->
                <div v-if="item.prev && item.prev.system !== item.version.system" class="mt-3">
                  <h3 class="am-h3">システムプロンプトの修正</h3>
                  <ProseDiffView :rows="diffOf(item, 'system')" />
                </div>

                <!-- ユーザープロンプトは大きく変わったときだけ -->
                <div v-if="item.prev && item.version.userChanged" class="mt-3">
                  <h3 class="am-h3">ユーザープロンプトの修正</h3>
                  <ProseDiffView :rows="diffOf(item, 'user')" />
                </div>
              </div>
            </li>
          </template>
        </ol>

        <!-- いちばん最初のプロンプト（どこから育ったかを見比べるため） -->
        <section v-if="first" class="mt-8">
          <h2 class="text-sm font-bold m-0 mb-1.5">
            最初のシステムプロンプト
            <span class="font-normal text-slate-500">（{{ formatDate(first.date) }}・{{ first.model }}）</span>
          </h2>
          <div v-if="first.system" class="am-prose">{{ first.system }}</div>
          <p v-else class="text-sm text-slate-500 m-0">システムプロンプトはありませんでした。</p>

          <template v-if="first.user">
            <h2 class="text-sm font-bold m-0 mt-4 mb-1.5">最初のユーザープロンプト</h2>
            <div class="am-prose am-prose-sub">{{ first.user }}</div>
          </template>
        </section>
      </template>
    </main>

    <AuthModal v-if="showAuthModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AuthModal from '~/components/AuthModal.vue'
import ProseDiffView from '~/components/ai-manager/ProseDiffView.vue'
import {
  AI_MANAGER_APP_LABELS,
  AI_MANAGER_CHANGE_LABELS,
  AI_MANAGER_KIND_LABELS,
  AI_MANAGER_PROVIDER_LABELS,
  AI_MANAGER_TOOL_LABELS,
  formatAiManagerOption,
  sortAiManagerChangeTypes,
  type AiManagerApp,
  type AiManagerChangeType,
  type AiManagerSite,
  type AiManagerVersion,
} from '~/types/ai-manager'
import { proseDiff, type ProseRow } from '~/utils/ai-manager-diff'

// 1か所の全部をひと目で見る画面。展開の操作は置かない（本人の希望）。
// コード（共通処理の本文・関数名・ファイルの場所）とコミットログは出さず、要約と文章の差分で伝える。

definePageMeta({ layout: 'ai-manager' })
useHead({ title: 'AI管理 | ai-manager', meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const site = ref<AiManagerSite | null>(null)
const loading = ref(true)
const error = ref('')
const highlight = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    site.value = await $fetch<AiManagerSite>('/api/ai-manager/site', { query: { id: String(route.query.id ?? '') } })
    useHead({ title: `${site.value.feature} | AI管理` })
    await focusHash()
  } catch (err: any) {
    const status = err?.statusCode ?? err?.response?.status
    error.value =
      status === 401
        ? 'ログインしてください。'
        : status === 403
          ? 'この画面は管理者だけが見られます。'
          : status === 404
            ? 'この呼び出し箇所は見つかりませんでした（データを作り直したときに名前が変わった可能性があります）。'
            : 'データを読み込めませんでした。'
  } finally {
    loading.value = false
  }
}

/** 全体タイムラインから来たときは、その修正の位置まで送って枠を色付けする */
async function focusHash() {
  const m = route.hash.match(/^#v-([0-9a-f]+)$/)
  if (!m || !site.value) return
  highlight.value = m[1]!
  loading.value = false
  await nextTick()
  document.getElementById(`v-${m[1]}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

watch(isLoggedIn, (v) => {
  if (v) load()
})

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})

const live = computed<AiManagerVersion>(() => {
  const vs = site.value!.versions
  return [...vs].reverse().find((v) => !v.change?.types.includes('removed')) ?? vs[vs.length - 1]!
})

const changes = computed(() => (site.value?.versions ?? []).filter((v) => v.change))

/** いちばん古い版。派生（キキガキ本番版）なら派生元の最初の版になる */
const first = computed(() => site.value?.versions[0] ?? null)

interface HistoryItem {
  version: AiManagerVersion
  prev: AiManagerVersion | null
  types: AiManagerChangeType[]
  summary: string
  appChange: { from: AiManagerApp; to: AiManagerApp } | null
}

const history = computed<HistoryItem[]>(() => {
  const vs = site.value?.versions ?? []
  return vs
    .map((v, k) => {
      const prev = vs[k - 1] ?? null
      const types: AiManagerChangeType[] = k === 0 ? ['new'] : sortAiManagerChangeTypes(v.change?.types ?? [])
      const summary = k === 0 ? `${v.model} で新しく作成` : v.change?.summary ?? ''
      const appChange = prev && prev.app !== v.app ? { from: prev.app, to: v.app } : null
      return { version: v, prev, types, summary, appChange }
    })
    .reverse()
})

function optionList(options: Record<string, string>) {
  return Object.entries(options).map(([key, value]) => ({ key, ...formatAiManagerOption(key, value) }))
}

/** モデルとオプションのうち、前の版から変わったものだけ（書き方の空白だけの違いは除く） */
function settingChanges(item: HistoryItem) {
  const out: { label: string; before: string | null; after: string | null }[] = []
  const prev = item.prev
  if (!prev) return out
  if (prev.model !== item.version.model) out.push({ label: 'モデル', before: prev.model, after: item.version.model })
  const keys = [...new Set([...Object.keys(prev.options), ...Object.keys(item.version.options)])]
  const squash = (v: string | undefined) => v?.replace(/\s+/g, '')
  for (const key of keys) {
    const a = prev.options[key]
    const b = item.version.options[key]
    if (squash(a) === squash(b)) continue
    const fa = a === undefined ? null : formatAiManagerOption(key, a)
    const fb = b === undefined ? null : formatAiManagerOption(key, b)
    out.push({ label: (fb ?? fa)!.label, before: fa?.value ?? null, after: fb?.value ?? null })
  }
  return out
}

const diffCache = new Map<string, ProseRow[]>()
function diffOf(item: HistoryItem, k: 'system' | 'user'): ProseRow[] {
  const key = `${item.version.commit}:${k}`
  if (!diffCache.has(key)) diffCache.set(key, proseDiff(item.prev?.[k] ?? null, item.version[k]))
  return diffCache.get(key)!
}

/** 点の色は一覧のバッジ（layouts/ai-manager.vue の data-type）とそろえる */
function dotColor(types: AiManagerChangeType[]) {
  if (types.includes('removed')) return '#f87171'
  if (types.includes('new') || types.includes('forked')) return '#22c55e'
  if (types.includes('model')) return '#f59e0b'
  if (types.includes('prompt')) return '#0ea5e9'
  if (types.includes('options')) return '#6366f1'
  return '#94a3b8'
}

const copied = ref(false)
async function copy(text: string | null) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    copied.value = false
  }
}

// ---- 日付（JST）

const jst = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000)
const pad = (n: number) => String(n).padStart(2, '0')
function formatDate(iso: string): string {
  const d = jst(iso)
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`
}
</script>
