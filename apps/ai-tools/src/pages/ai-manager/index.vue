<template>
  <div class="am-page">
    <div class="am-page-head">
      <h1 class="am-h1">{{ tab === 'timeline' ? '全体タイムライン' : '一覧' }}</h1>
      <p v-if="index" class="am-note mt-1">{{ formatDateTime(index.generatedAt) }} 時点のデータ</p>
    </div>

    <p v-if="loading" class="text-center py-10" style="color: var(--am-ink-soft)">読み込んでいます…</p>
    <div v-else-if="error" class="am-card p-6 text-center">
      <p class="m-0 mb-3">{{ error }}</p>
      <button v-if="isLoggedIn" type="button" class="am-btn" @click="load">読み込み直す</button>
    </div>

    <template v-else-if="index">
      <!-- 全体タイムライン（トップの既定） -->
      <section v-if="tab === 'timeline'">
        <div class="flex flex-wrap gap-1.5 mb-4">
          <button
            v-for="t in TIMELINE_TYPES"
            :key="t"
            type="button"
            class="am-chip"
            :class="{ 'is-on': timelineTypes.includes(t) }"
            @click="toggleTimelineType(t)"
          >
            {{ AI_MANAGER_CHANGE_LABELS[t] }}
          </button>
        </div>
        <div v-for="day in timelineDays" :key="day.date" class="mb-5">
          <h2 class="am-day">{{ day.date }}（{{ day.entries.length }}件）</h2>
          <ul class="am-card m-0 p-0 list-none overflow-hidden">
            <li v-for="e in day.entries" :key="e.key" class="am-row px-4 py-3" @click="openSite(e.site.id, e.version.commit)">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="am-app" :data-tool="e.site.tool">{{ AI_MANAGER_TOOL_LABELS[e.site.tool] }}</span>
                <span class="font-bold">{{ e.site.feature }}</span>
                <span v-for="t in e.types" :key="t" class="am-badge" :data-type="t">{{ AI_MANAGER_CHANGE_LABELS[t] }}</span>
                <span class="am-note ml-auto tabular-nums">{{ formatTime(e.version.date) }}</span>
              </div>
              <p class="m-0 mt-1" style="color: var(--am-ink-soft)">{{ e.version.change?.summary }}</p>
            </li>
          </ul>
        </div>
        <p v-if="!timelineDays.length" class="text-center py-8" style="color: var(--am-ink-soft)">当てはまる修正はありません</p>
      </section>

      <!-- 一覧 -->
      <section v-else class="am-card overflow-x-auto">
        <table class="am-table">
          <thead>
            <tr>
              <th class="am-th">ツール</th>
              <th class="am-th">機能</th>
              <th class="am-th">model</th>
              <th class="am-th">option</th>
              <th class="am-th" style="text-align: right">修正</th>
              <th class="am-th">最後に変えた日</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sites" :key="s.id" class="am-row" @click="openSite(s.id)">
              <td class="am-td whitespace-nowrap">
                <span class="am-app" :data-tool="s.tool">{{ AI_MANAGER_TOOL_LABELS[s.tool] }}</span>
              </td>
              <td class="am-td">
                <div class="font-bold">{{ s.feature }}</div>
                <div v-if="latestChange(s)" class="am-note mt-0.5" style="color: var(--am-ink-soft)">
                  最近の修正（{{ formatDate(latestChange(s)!.date) }}）: {{ latestChange(s)!.change!.summary }}
                </div>
              </td>
              <td class="am-td whitespace-nowrap" style="font-size: 12.5px">{{ last(s).model }}</td>
              <td class="am-td" style="font-size: 12.5px; color: var(--am-ink-soft)">
                <div v-for="o in optionList(last(s).options)" :key="o.key" class="truncate am-opt-w" :title="`${o.label}: ${o.value}`">{{ o.label }}: {{ o.value }}</div>
              </td>
              <td class="am-td tabular-nums whitespace-nowrap" style="text-align: right">{{ s.versions.length - 1 }}回</td>
              <td class="am-td whitespace-nowrap tabular-nums">{{ formatDate(s.versions[s.versions.length - 1]!.date) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <AuthModal v-if="showAuthModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AuthModal from '~/components/AuthModal.vue'
import {
  AI_MANAGER_CHANGE_LABELS,
  AI_MANAGER_TOOL_LABELS,
  formatAiManagerOption,
  sortAiManagerChangeTypes,
  type AiManagerChangeType,
  type AiManagerIndex,
  type AiManagerSiteMeta,
  type AiManagerVersionMeta,
} from '~/types/ai-manager'

// トップは全体タイムライン（プロンプトの修正だけ）が既定。上部の select の絞り込みとモデル別のタブは置かない（本人の希望）。
// 撤去済み・プロンプトの無い呼び出しはデータを作る段階で外してある（scripts/ai-manager/build.mjs）

definePageMeta({ layout: 'ai-manager' })
useHead({ title: 'AI管理 | ai-manager', meta: [{ name: 'robots', content: 'noindex' }] })

// タブの切り替えは左サイドバー（layouts/ai-manager.vue）の ?tab= で行う
type TabId = 'timeline' | 'list'

// 新設は出さない。プロンプトを左端に
const TIMELINE_TYPES: AiManagerChangeType[] = ['prompt', 'model', 'options', 'moved', 'forked']

const route = useRoute()
const router = useRouter()
const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const index = ref<AiManagerIndex | null>(null)
const loading = ref(true)
const error = ref('')

const tab = computed<TabId>(() => (route.query.tab === 'list' ? 'list' : 'timeline'))
const timelineTypes = ref<AiManagerChangeType[]>(['prompt'])

async function load() {
  loading.value = true
  error.value = ''
  try {
    index.value = await $fetch<AiManagerIndex>('/api/ai-manager')
  } catch (err: any) {
    const status = err?.statusCode ?? err?.response?.status
    error.value =
      status === 401 ? 'ログインしてください。' : status === 403 ? 'この画面は管理者だけが見られます。' : 'データを読み込めませんでした。'
  } finally {
    loading.value = false
  }
}

// AuthModal はログインしても画面を読み込み直さないので、ここで取り直す
watch(isLoggedIn, (v) => {
  if (v) load()
})

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})

// ---- 表示用

const sites = computed(() => index.value?.sites ?? [])
const last = (s: AiManagerSiteMeta): AiManagerVersionMeta => s.versions[s.versions.length - 1]!

/** いちばん新しい修正（移動だけのものは飛ばす） */
const latestChange = (s: AiManagerSiteMeta) => [...s.versions].reverse().find((v) => v.change && v.change.types.some((t) => t !== 'moved'))

const optionList = (options: Record<string, string>) =>
  Object.entries(options).map(([key, value]) => ({ key, ...formatAiManagerOption(key, value) }))

function openSite(id: string, commit?: string) {
  router.push({ path: '/ai-manager/site', query: { id }, hash: commit ? `#v-${commit.slice(0, 12)}` : undefined })
}

// ---- 全体タイムライン

interface TimelineEntry {
  key: string
  site: AiManagerSiteMeta
  version: AiManagerVersionMeta
  types: AiManagerChangeType[]
}

function toggleTimelineType(t: AiManagerChangeType) {
  timelineTypes.value = timelineTypes.value.includes(t) ? timelineTypes.value.filter((x) => x !== t) : [...timelineTypes.value, t]
}

const timelineDays = computed(() => {
  const entries: TimelineEntry[] = []
  for (const s of sites.value) {
    for (const v of s.versions) {
      // 最初の版（新設）は修正ではないので出さない
      const types = v.change?.types ?? []
      if (!types.some((t) => timelineTypes.value.includes(t))) continue
      entries.push({ key: `${s.id}@${v.commit}`, site: s, version: v, types: sortAiManagerChangeTypes(types) })
    }
  }
  entries.sort((a, b) => b.version.date.localeCompare(a.version.date))
  const days: { date: string; entries: TimelineEntry[] }[] = []
  for (const e of entries) {
    const d = formatDate(e.version.date)
    if (days[days.length - 1]?.date !== d) days.push({ date: d, entries: [] })
    days[days.length - 1]!.entries.push(e)
  }
  return days
})

// ---- 日付（JST）

const jst = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000)
const pad = (n: number) => String(n).padStart(2, '0')
function formatDate(iso: string): string {
  const d = jst(iso)
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`
}
function formatTime(iso: string): string {
  const d = jst(iso)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}
function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`
}
</script>
