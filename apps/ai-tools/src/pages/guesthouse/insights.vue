<template>
  <div class="max-w-[900px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <Breadcrumb class="mb-2" :items="[{ label: '管理トップ', to: '/guesthouse' }, { label: '顧客分析' }]" />

    <div class="flex items-start justify-between gap-3 mb-2">
      <h1 class="gh-display text-[22px] font-bold flex items-center gap-2">
        顧客分析
        <HelpTip label="このページの説明">
          <ul class="space-y-1.5">
            <li class="flex gap-1.5"><span class="shrink-0">・</span><span>お客さん日記と聞き取りメモを、AIが<b>決まった分類</b>に整理して集計しています。</span></li>
            <li class="flex gap-1.5"><span class="shrink-0">・</span><span>新しく書いた日記・編集した日記があるときだけ「更新」で読み直します（前に読んだ分は読み直さないので、待たされません）。</span></li>
            <li class="flex gap-1.5"><span class="shrink-0">・</span><span>満足度に点数は付けません。<b>お客様が実際に書かれた言葉</b>と、それが何件あったかだけを出します。</span></li>
            <li class="flex gap-1.5"><span class="shrink-0">・</span><span>上の切り替えで、<b>全部まとめて</b>見るか、<b>宿ごとに分けて</b>見るかを選べます。</span></li>
          </ul>
        </HelpTip>
      </h1>
      <button class="gh-btn-ghost !h-9 !px-3.5 text-[12.5px] shrink-0" :disabled="busy || loading" @click="refresh">
        {{ busy ? '分析中…' : '更新' }}
      </button>
    </div>

    <div v-if="notAdmin" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-10 text-center">
      <p class="text-[15px] font-bold mb-1">管理者専用のページです</p>
    </div>

    <template v-else>
      <p class="text-[12.5px] text-[var(--gh-ink-soft)] mb-1">
        分析済み {{ data?.basedOn ?? 0 }} 組 ／ 日記 {{ data?.diaryCount ?? 0 }} 件
        <span v-if="data?.computedAt"> ・ 最終更新 {{ formatDate(data.computedAt) }}</span>
      </p>
      <p v-if="data?.stale" class="text-[12.5px] text-[var(--gh-warn)] mb-3">
        <template v-if="busy">読み込んでいます… 残り {{ remaining }} 件（この画面を開いたままお待ちください）</template>
        <template v-else>まだ読み込んでいない日記が {{ remaining }} 件あります。「更新」で分析できます。</template>
      </p>
      <div v-else class="mb-3" />

      <p v-if="error" class="text-[12.5px] text-[var(--gh-warn)] mb-4">{{ error }}</p>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-32 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
      </div>

      <p v-else-if="!allProfiles.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-12 text-[13.5px]">
        まだ分析結果がありません。<br class="sm:hidden" />お客さん日記を書いたうえで「更新」を押してください。
      </p>

      <div v-else class="space-y-8">
        <!-- 施設の切り替え：混在（全部まとめて）／宿ごとに絞り込み。以下すべての集計に効く -->
        <section class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-3.5">
          <p class="text-[12.5px] font-bold mb-2 flex items-center gap-2">
            どの宿で見るか
            <HelpTip label="宿の切り替えについて">
              阪中さんが登録されている<b>宿が2つ以上ある</b>ときは、ここで宿を選ぶと、その宿に泊まられたお客様だけで数え直します（旅程・満足・不満の声、すべてが切り替わります）。<b>すべての宿</b>を選ぶと、全部まとめた通しの数字になります。
            </HelpTip>
          </p>
          <div class="flex flex-wrap gap-1.5">
            <button type="button" class="gh-chip" :class="{ 'gh-chip--on': !houseFilter }" @click="selectHouse('')">
              すべての宿（まとめて） <b class="ml-0.5">{{ allProfiles.length }}</b>
            </button>
            <button
              v-for="h in houseTabs"
              :key="h.id"
              type="button"
              class="gh-chip"
              :class="{ 'gh-chip--on': houseFilter === h.id }"
              @click="selectHouse(h.id)"
            >
              {{ h.name }} <b class="ml-0.5">{{ h.count }}</b>
            </button>
          </div>
          <p v-if="houseFilter" class="text-[11.5px] text-[var(--gh-ink-soft)] mt-2">
            「{{ currentHouseName }}」に泊まられた {{ profiles.length }} 組だけで数えています。
          </p>
          <!-- 宿が1つしか登録されていないと分けようがないので、分け方そのものを案内する -->
          <p v-else-if="houseTabs.length < 2" class="text-[11.5px] text-[var(--gh-ink-soft)] mt-2">
            いまは宿が1つだけです。別の宿のぶんを分けて見るには、
            <NuxtLink to="/guesthouse/houses" class="text-[var(--gh-forest-deep)] underline underline-offset-2">宿の登録</NuxtLink>
            でその宿を足し、そちらの会話・日記として記録してください。
          </p>
        </section>

        <p v-if="!profiles.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-12 text-[13.5px]">
          この宿のお客様は、まだ分析結果がありません。
        </p>

        <template v-else>
          <!-- 旅程：日本旅行全体の中での高野山エリア -->
          <section>
            <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
              旅程のなかの宿
              <HelpTip label="旅程のなかの宿とは">
                日記の旅程から「この宿の前にいた場所（From）」「次に向かう場所（To）」を読み取って、つないだ図です。日本の旅のどのあたりに高野山エリアが置かれているかが見えます。帯にカーソルを合わせると組数が出ます。<br />
                前後がはっきり書かれていない日記でも、旅程の並び（経由地）が読み取れていれば、その<b>隣の地点</b>を From / To として使っています。
              </HelpTip>
            </h2>
            <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">左が前の滞在地（From）、中央が宿、右が次の行き先（To）。帯の太さが組数です。</p>
            <div class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-2 sm:p-3 overflow-x-auto">
              <JourneySankey :profiles="profiles" />
            </div>
          </section>

          <!-- 旅程の順番：旅全体のうち何番目にこの宿へ来たか -->
          <section>
            <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
              旅程のなかの位置
              <HelpTip label="旅程のなかの位置とは">
                日記の旅程に書かれた経由地を通った順に数えて、<b>旅全体のうち何番目にこの宿へ来たか</b>を出しています（例：全10地点中8番目＝旅の後半）。前半・中盤・後半のざっくりした3つに丸めているので、「東京から入る人」「高山から回ってくる人」のように経路が違っても、<b>旅のどのあたりで来られるか</b>の傾向として読めます。
              </HelpTip>
            </h2>
            <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">後半が多ければ「旅の締めくくりに選ばれている」、前半が多ければ「旅の入り口になっている」ということです。</p>
            <RoutePosition :profiles="profiles" />
          </section>

          <!-- 満足・不満の声：宿/観光地/食事/アクティビティ × 満足/不満 の2軸だけで見せる -->
          <section>
            <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
              満足・不満の声
              <HelpTip label="満足・不満の声の見方">
                日記のなかの感想を、<b>満足／不満</b>と、<b>宿・観光地・食事・アクティビティ</b>のどれについてかで分けています。<b>点数は付けていません</b>——自由に書かれた文章から点数を作ると、根拠のない精度が出てしまうためです。<br />
                まず上のタブで満足／不満を選び、次に下のタブで話題を選ぶと、その組み合わせに当てはまる件数とお客様の言葉が一覧できます。話題タブの下には、その中でよく出てくる具体的な言葉（料理名・場所名など）がタグとして出るので、さらに絞り込めます。既定は「すべて」です。
              </HelpTip>
            </h2>
            <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">タブを切り替えると、あてはまる感想の件数と言葉が入れ替わります。</p>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <button
                v-for="s in sentimentTabs"
                :key="s.key"
                type="button"
                class="gh-chip"
                :class="{ 'gh-chip--on': sentiment === s.key }"
                @click="selectSentiment(s.key)"
              >
                {{ s.label }} <b class="ml-0.5">{{ s.count }}</b>
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5 mb-3">
              <button
                v-for="c in categoryTabs"
                :key="c.key"
                type="button"
                class="gh-chip"
                :class="{ 'gh-chip--on': category === c.key }"
                @click="selectCategory(c.key)"
              >
                {{ c.label }} <b class="ml-0.5">{{ c.count }}</b>
              </button>
            </div>
            <!-- よく出てくる具体語のタグ：2件以上のものだけ出す（1件だけでは絞り込みの意味が薄い） -->
            <div v-if="keywordTabs.length" class="flex flex-wrap gap-1.5 mb-3">
              <button type="button" class="gh-chip" :class="{ 'gh-chip--on': !keywordFilter }" @click="keywordFilter = ''">
                すべて
              </button>
              <button
                v-for="k in keywordTabs"
                :key="k.key"
                type="button"
                class="gh-chip"
                :class="{ 'gh-chip--on': keywordFilter === k.key }"
                @click="selectKeyword(k.key)"
              >
                {{ k.key }} <b class="ml-0.5">{{ k.count }}</b>
              </button>
            </div>
            <p v-if="!impressionMentions.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-8 text-[13px]">
              {{ category }}についての{{ sentimentLabel }}の声は、まだ読み取れていません。
            </p>
            <ul v-else class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-3 space-y-2">
              <li v-for="(m, i) in impressionMentions" :key="i" class="text-[12.5px] leading-relaxed">
                <NuxtLink :to="`/guesthouse/session/${m.sessionId}`" class="text-[var(--gh-forest-deep)] underline underline-offset-2">{{ m.guestName || '名前未設定' }}</NuxtLink>
                <span class="text-[var(--gh-ink-soft)]">：「{{ m.quote }}」</span>
              </li>
            </ul>
          </section>
        </template>
      </div>
    </template>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import HelpTip from '~/components/guesthouse/HelpTip.vue'
import Breadcrumb from '~/components/guesthouse/Breadcrumb.vue'
import JourneySankey from '~/components/guesthouse/JourneySankey.client.vue'
import RoutePosition from '~/components/guesthouse/RoutePosition.vue'
import type { GuestProfile, ImpressionCategory, Insights, InsightsRefreshResult } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: '顧客分析 | ゲストハウス案内' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

// サーバ側の語彙（guesthouse-insights.ts の IMPRESSION_CATEGORIES）と対。
// 増やすときは両方を直す（サーバ utils はクライアントに持ち込めないのでここに持ち直している）。
const IMPRESSION_CATEGORY_LIST: ImpressionCategory[] = ['宿', '観光地', '食事', 'アクティビティ']
const SENTIMENT_LABEL = { positive: '満足', negative: '不満' } as const
type Sentiment = keyof typeof SENTIMENT_LABEL

const data = ref<Insights | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notAdmin = ref(false)
// 感想をどちら向きで見るか。既定は「満足」。
const sentiment = ref<Sentiment>('positive')
// 感想を何について見るか。既定は「宿」。
const category = ref<ImpressionCategory>('宿')
// どの宿で見るか。空文字＝すべての宿をまとめて（混在）見る状態。
const houseFilter = ref('')
// よく出てくる具体語での絞り込み。空文字＝すべて。
const keywordFilter = ref('')

/** まだ読み込んでいない日記の件数（更新中は残り件数として出す）。 */
const remaining = computed(() => Math.max(0, (data.value?.diaryCount ?? 0) - (data.value?.basedOn ?? 0)))

/** 抽出できているすべての組（宿の絞り込み前）。 */
const allProfiles = computed<GuestProfile[]>(() => data.value?.profiles ?? [])

/** 宿の切り替えタブ。組数の多い順（登録だけあって日記が無い宿は出さない）。 */
const houseTabs = computed(() => {
  const map = new Map<string, { id: string; name: string; count: number }>()
  for (const p of allProfiles.value) {
    const cur = map.get(p.houseId) ?? { id: p.houseId, name: p.houseName || '宿名なし', count: 0 }
    cur.count++
    map.set(p.houseId, cur)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
})

const currentHouseName = computed(() => houseTabs.value.find((h) => h.id === houseFilter.value)?.name ?? '')

/** 以下すべての集計の対象。宿を選んでいればその宿のお客様だけ、選んでいなければ全部。 */
const profiles = computed<GuestProfile[]>(() =>
  houseFilter.value ? allProfiles.value.filter((p) => p.houseId === houseFilter.value) : allProfiles.value
)

function selectHouse(id: string) {
  houseFilter.value = id
  keywordFilter.value = ''
}

function selectSentiment(key: Sentiment) {
  sentiment.value = key
  keywordFilter.value = ''
}

function selectCategory(key: ImpressionCategory) {
  category.value = key
  keywordFilter.value = ''
}

function selectKeyword(key: string) {
  keywordFilter.value = keywordFilter.value === key ? '' : key
}

const sentimentLabel = computed(() => SENTIMENT_LABEL[sentiment.value])

/** 満足／不満タブの件数（今選んでいる話題タブとは無関係に、全話題ぶんを数える）。 */
const sentimentTabs = computed(() =>
  (Object.keys(SENTIMENT_LABEL) as Sentiment[]).map((key) => ({
    key,
    label: SENTIMENT_LABEL[key],
    count: profiles.value.reduce((n, p) => n + p.impressions.filter((im) => im.sentiment === key).length, 0),
  }))
)

/** 話題タブの件数（今選んでいる満足／不満のぶんだけを数える）。 */
const categoryTabs = computed(() =>
  IMPRESSION_CATEGORY_LIST.map((key) => ({
    key,
    label: key,
    count: profiles.value.reduce(
      (n, p) => n + p.impressions.filter((im) => im.sentiment === sentiment.value && im.category === key).length,
      0
    ),
  }))
)

/** 選んだ満足／不満 × 話題に当てはまる感想の一覧（タグ絞り込み前）。 */
const impressionMentionsAll = computed(() => {
  const list: { sessionId: string; guestName: string; quote: string; keywords: string[] }[] = []
  for (const p of profiles.value) {
    for (const im of p.impressions) {
      if (im.sentiment !== sentiment.value || im.category !== category.value) continue
      list.push({ sessionId: p.sessionId, guestName: p.guestName, quote: im.quote, keywords: im.keywords ?? [] })
    }
  }
  return list
})

/** よく出てくる具体語のタグ（多い順・上位12個）。1件しか無いタグは絞り込みの意味が薄いので出さない。 */
const keywordTabs = computed(() => {
  const counts = new Map<string, number>()
  for (const m of impressionMentionsAll.value) {
    for (const k of m.keywords) counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([key, count]) => ({ key, count }))
})

/** タグを選んでいれば、それを含む感想だけに絞り込む。 */
const impressionMentions = computed(() =>
  keywordFilter.value ? impressionMentionsAll.value.filter((m) => m.keywords.includes(keywordFilter.value)) : impressionMentionsAll.value
)

function formatDate(s: string): string {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : s || ''
}

async function load() {
  loading.value = true
  try {
    data.value = await $fetch<Insights>('/api/guesthouse/insights')
  } catch (e: any) {
    if ((e?.statusCode ?? e?.response?.status) === 403) notAdmin.value = true
    data.value = null
  } finally {
    loading.value = false
  }
}

/**
 * 未読み込みの日記を読み直す。
 * サーバは1回につき少しずつしか進めない（Claude を日記1件ごとに呼ぶため）ので、
 * 進みが止まるまで続けて呼ぶ。途中の結果もそのつど画面に反映するので、残り件数が減っていくのが見える。
 */
async function refresh() {
  busy.value = true
  error.value = ''
  try {
    for (let i = 0; i < 30; i++) {
      const res = await $fetch<InsightsRefreshResult>('/api/guesthouse/insights/refresh', { method: 'POST' })
      data.value = res
      if (!res.stale || res.extracted === 0) break
    }
  } catch (e: any) {
    error.value = e?.data?.message || '分析に失敗しました。時間をおいて「更新」を押すと、続きから読み込みます。'
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await checkAuth()
  if (!isLoggedIn.value) {
    loading.value = false
    return
  }
  await load()
})
</script>
