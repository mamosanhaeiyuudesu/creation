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
      <p v-if="data?.stale" class="text-[12.5px] text-[var(--gh-warn)] mb-4">
        まだ読み込んでいない日記が {{ (data.diaryCount ?? 0) - (data.basedOn ?? 0) }} 件あります。「更新」で分析できます。
      </p>
      <div v-else class="mb-4" />

      <p v-if="error" class="text-[12.5px] text-[var(--gh-warn)] mb-4">{{ error }}</p>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-32 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
      </div>

      <p v-else-if="!profiles.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-12 text-[13.5px]">
        まだ分析結果がありません。<br class="sm:hidden" />お客さん日記を書いたうえで「更新」を押してください。
      </p>

      <div v-else class="space-y-8">
        <!-- 旅程：日本旅行全体の中での高野山エリア -->
        <section>
          <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
            旅程のなかの宿
            <HelpTip label="旅程のなかの宿とは">
              日記の旅程から「この宿の前にいた場所」「次に向かう場所」を読み取って、つないだ図です。日本の旅のどのあたりに高野山エリアが置かれているかが見えます。帯にカーソルを合わせると組数が出ます。
            </HelpTip>
          </h2>
          <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">左が前の滞在地、中央が宿、右が次の行き先。帯の太さが組数です。</p>
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

        <!-- 滞在の型 -->
        <section>
          <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
            宿が占めた位置
            <HelpTip label="宿が占めた位置とは">
              この地域での数日のなかで、宿がどんな役割だったかの分類です。<b>拠点型</b>＝宿は主に寝る・休む場所で、旅の中心は高野山などエリア側。<b>目的地型</b>＝宿の体験（川遊び・農園・食事など）そのものが旅の目的の一部。<b>通過型</b>＝移動の都合で1泊しただけ。
            </HelpTip>
          </h2>
          <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">目的地型が増えるほど、宿が旅の「目的」になっているということです。</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div v-for="s in stayTypeCounts" :key="s.key" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-3.5">
              <p class="text-[12px] text-[var(--gh-ink-soft)] mb-0.5">{{ s.label }}</p>
              <p class="gh-display text-[22px] font-bold leading-none">
                {{ s.count }}<span class="text-[12px] font-normal text-[var(--gh-ink-soft)] ml-0.5">組</span>
              </p>
              <div class="mt-2 h-1.5 rounded-full bg-[var(--gh-paper-2)] overflow-hidden">
                <div class="h-full rounded-full" :style="{ width: pct(s.count) + '%', background: s.color }" />
              </div>
            </div>
          </div>
        </section>

        <!-- 満足度：どの側面が良い方向で語られたか -->
        <section>
          <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
            満足度
            <HelpTip label="満足度の見方">
              日記のなかで、どの側面が良い方向・気になる方向で語られたかを数えたものです。<b>点数は付けていません</b>——自由に書かれた文章から点数を作ると、根拠のない精度が出てしまうためです。行を開くと、その根拠になったお客様の言葉がそのまま出ます。<br />
              お客様は高野山の宿坊など<b>ご自身で手配された宿</b>にも泊まっておられます。その感想を混ぜると宿そのものの評価が読めなくなるので、<b>この宿／宿坊・ほかの宿／エリア</b>を分けて数えています（既定は「この宿」）。どちらの話か本文から判断できなかった感想は「エリア・その他」に入ります。
            </HelpTip>
          </h2>
          <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">行をタップすると、根拠になった日記の言葉が読めます。</p>
          <div class="flex flex-wrap gap-1.5 mb-3">
            <button
              v-for="t in subjectTabs"
              :key="t.key"
              type="button"
              class="gh-chip"
              :class="{ 'gh-chip--on': aspectSubject === t.key }"
              @click="selectSubject(t.key)"
            >
              {{ t.label }} <b class="ml-0.5">{{ t.count }}</b>
            </button>
          </div>
          <p v-if="!aspectStats.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-8 text-[13px]">
            {{ ASPECT_SUBJECT_LABEL[aspectSubject] }}についての感想は、まだ読み取れていません。
          </p>
          <ul v-else class="space-y-2">
            <li v-for="a in aspectStats" :key="a.aspect" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] overflow-hidden">
              <button type="button" class="w-full text-left px-4 py-3 flex items-center gap-3" @click="toggleAspect(a.aspect)">
                <span class="font-bold text-[14px] w-[6.5rem] shrink-0">{{ a.aspect }}</span>
                <span class="flex-1 flex h-2.5 rounded-full overflow-hidden bg-[var(--gh-paper-2)]">
                  <span class="bg-[var(--gh-forest)]" :style="{ width: (a.positive / maxAspect) * 100 + '%' }" />
                  <span class="bg-[var(--gh-warn)]" :style="{ width: (a.negative / maxAspect) * 100 + '%' }" />
                </span>
                <span class="text-[12px] text-[var(--gh-ink-soft)] shrink-0 tabular-nums">
                  <b class="text-[var(--gh-forest-deep)]">{{ a.positive }}</b><template v-if="a.negative"> / <b class="text-[var(--gh-warn)]">{{ a.negative }}</b></template>
                </span>
                <span class="text-[11px] text-[var(--gh-ink-faint)] shrink-0">{{ openAspect === a.aspect ? '▲' : '▼' }}</span>
              </button>
              <ul v-if="openAspect === a.aspect" class="border-t border-[var(--gh-line)] px-4 py-3 space-y-2">
                <li v-for="(m, i) in a.mentions" :key="i" class="text-[12.5px] leading-relaxed">
                  <span class="gh-chip !py-0.5 !px-2 !text-[10.5px] mr-1.5" :class="m.sentiment === 'negative' ? '!text-[var(--gh-warn)]' : '!text-[var(--gh-forest-deep)]'">
                    {{ m.sentiment === 'negative' ? '気になる' : '良い' }}
                  </span>
                  <NuxtLink :to="`/guesthouse/session/${m.sessionId}`" class="text-[var(--gh-forest-deep)] underline underline-offset-2">{{ m.guestName || '名前未設定' }}</NuxtLink>
                  <span class="text-[var(--gh-ink-soft)]">：「{{ m.quote }}」</span>
                </li>
              </ul>
            </li>
          </ul>
        </section>

        <!-- 関心の対象 / エリア内の訪問先 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <section>
            <h2 class="gh-display text-[16px] font-bold mb-3">関心の対象</h2>
            <ul v-if="topicStats.length" class="space-y-1.5">
              <li v-for="t in topicStats" :key="t.name" class="flex items-center gap-2.5 text-[13px]">
                <span class="w-[6rem] shrink-0">{{ t.name }}</span>
                <span class="flex-1 h-2 rounded-full bg-[var(--gh-paper-2)] overflow-hidden">
                  <span class="block h-full rounded-full bg-[var(--gh-forest-soft)]" :style="{ width: (t.count / topicStats[0].count) * 100 + '%' }" />
                </span>
                <span class="text-[12px] text-[var(--gh-ink-soft)] tabular-nums shrink-0">{{ t.count }}</span>
              </li>
            </ul>
            <p v-else class="text-[12.5px] text-[var(--gh-ink-soft)]">まだ読み取れていません。</p>
          </section>

          <section>
            <h2 class="gh-display text-[16px] font-bold mb-3 flex items-center gap-2">
              エリア内で回られた場所
              <HelpTip label="この一覧について">
                日記の旅程に出てきた、宿の外の立ち寄り先です。ここに出てこない場所は「まだ案内できていない／書き留められていない」ということでもあります。
              </HelpTip>
            </h2>
            <div v-if="spotStats.length" class="flex flex-wrap gap-1.5">
              <span v-for="s in spotStats" :key="s.name" class="gh-chip">
                {{ s.name }} <b class="text-[var(--gh-forest-deep)] ml-0.5">{{ s.count }}</b>
              </span>
            </div>
            <p v-else class="text-[12.5px] text-[var(--gh-ink-soft)]">まだ読み取れていません。</p>
          </section>
        </div>

        <!-- ほかに泊まられた宿（宿坊など） -->
        <section v-if="shukuboStats.length">
          <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
            ほかに泊まられた宿
            <HelpTip label="この一覧について">
              お客様がご自身で手配された、この宿以外の宿泊先（高野山の宿坊など）です。<b>この宿の感想と混ざらないように</b>分けて持っています。どの宿坊と組み合わせて泊まられているかが分かると、前後の一泊をどう案内するかの材料になります。
            </HelpTip>
          </h2>
          <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">この宿とあわせて泊まられている宿です。満足度の「宿坊・ほかの宿」タブに、その感想が入っています。</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="s in shukuboStats" :key="s.name" class="gh-chip">
              {{ s.name }} <b class="text-[var(--gh-forest-deep)] ml-0.5">{{ s.count }}</b>
            </span>
          </div>
        </section>

        <!-- 宿発の体験 -->
        <section v-if="innExpStats.length">
          <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
            宿が提供した体験
            <HelpTip label="この一覧について">
              宿が用意した体験のうち、お客様が実際に参加されたものです。ここが増えるほど「目的地型」の滞在が増えます。
            </HelpTip>
          </h2>
          <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">エリアで提供できるものを広げていくときの起点になります。</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="e in innExpStats" :key="e.name" class="gh-chip !text-[var(--gh-persimmon)] !border-[color-mix(in_srgb,var(--gh-persimmon)_45%,transparent)]">
              {{ e.name }} <b class="ml-0.5">{{ e.count }}</b>
            </span>
          </div>
        </section>

        <!-- ゲスト個別 -->
        <section>
          <h2 class="gh-display text-[16px] font-bold mb-3 flex items-center gap-2">
            お客様ごと
            <HelpTip label="この一覧について">
              集計の元になった1組ずつの読み取り結果です。名前をタップすると、その会話・日記に戻れます。
            </HelpTip>
          </h2>
          <ul class="space-y-2">
            <li v-for="p in profiles" :key="p.sessionId" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-3">
              <div class="flex items-center gap-2 flex-wrap mb-1.5">
                <span class="gh-chip !py-0.5 !px-2 !text-[11px]">{{ p.houseName }}</span>
                <NuxtLink :to="`/guesthouse/session/${p.sessionId}`" class="font-bold text-[14px] hover:underline underline-offset-2">
                  {{ p.guestName || '名前未設定のお客様' }}
                </NuxtLink>
                <span class="gh-chip !py-0.5 !px-2 !text-[10.5px]">{{ STAY_TYPE_LABEL[p.stayType] }}</span>
                <span v-if="p.originCountry" class="text-[11.5px] text-[var(--gh-ink-soft)]">{{ p.originCountry }}</span>
                <span v-if="p.nights" class="text-[11.5px] text-[var(--gh-ink-faint)]">{{ p.nights }}泊</span>
                <span v-if="positionOf(p)" class="gh-chip !py-0.5 !px-2 !text-[10.5px] !text-[var(--gh-forest-deep)]">
                  {{ positionOf(p) }}・{{ ROUTE_PHASE_LABEL[routePhase(p.routeIndex, p.route.length)] }}
                </span>
              </div>
              <!-- 旅程の順番が読み取れていれば全体の道のりを、無ければ従来どおり前後だけを出す -->
              <p v-if="p.route.length" class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <template v-for="(stop, i) in p.route" :key="i">
                  <span v-if="i" class="text-[var(--gh-ink-faint)]">›</span>
                  <span :class="stop === ROUTE_SELF ? 'font-bold text-[var(--gh-ink)]' : ''">{{ routeStopLabel(stop, p.houseName) }}</span>
                </template>
              </p>
              <p v-else class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed">
                {{ p.prevStop || '？' }} → <b class="text-[var(--gh-ink)]">{{ p.houseName }}</b> → {{ p.nextStop || '？' }}
              </p>
              <p v-if="p.areaSpots.length || p.shukuboStays.length" class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed mt-0.5">
                <template v-if="p.areaSpots.length">立ち寄り：{{ p.areaSpots.join('・') }}</template>
                <br v-if="p.areaSpots.length && p.shukuboStays.length" />
                <template v-if="p.shukuboStays.length">ほかに泊まられた宿：{{ p.shukuboStays.join('・') }}</template>
              </p>
            </li>
          </ul>
        </section>
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
import { routePhase, routePositionLabel, routeStopLabel, ROUTE_PHASE_LABEL, ROUTE_SELF } from '~/utils/guesthouse-route'
import type { AspectSubject, GuestProfile, Insights, InsightsRefreshResult, StayType } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: '顧客分析 | ゲストハウス案内' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const STAY_TYPE_LABEL: Record<StayType, string> = {
  base: '拠点型',
  destination: '目的地型',
  transit: '通過型',
  unknown: '不明',
}
const STAY_TYPE_COLOR: Record<StayType, string> = {
  base: 'var(--gh-forest)',
  destination: 'var(--gh-persimmon)',
  transit: 'var(--gh-forest-soft)',
  unknown: 'var(--gh-ink-faint)',
}

// 感想の主語のラベル。サーバ側の語彙（guesthouse-insights.ts の ASPECT_SUBJECTS）と対で、
// 増やすときは両方を直す（サーバ utils はクライアントに持ち込めないので STAY_TYPE_LABEL と同じく持ち直している）。
const ASPECT_SUBJECT_LABEL: Record<AspectSubject, string> = {
  inn: 'この宿',
  shukubo: '宿坊・ほかの宿',
  other: 'エリア・その他',
}

const data = ref<Insights | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notAdmin = ref(false)
const openAspect = ref('')
// 満足度をどの主語で見るか。既定は「この宿」＝宿そのものの評価だけを見る状態。
const aspectSubject = ref<AspectSubject>('inn')

const profiles = computed<GuestProfile[]>(() => data.value?.profiles ?? [])

/** 滞在の型ごとの組数。0件の型も枠として出す（「まだ目的地型がいない」ことに意味があるため）。 */
const stayTypeCounts = computed(() =>
  (Object.keys(STAY_TYPE_LABEL) as StayType[]).map((key) => ({
    key,
    label: STAY_TYPE_LABEL[key],
    color: STAY_TYPE_COLOR[key],
    count: profiles.value.filter((p) => p.stayType === key).length,
  }))
)

/** 主語（この宿／宿坊・ほかの宿／エリア）ごとの言及数。タブに件数を出して、分けたことが見えるようにする。 */
const subjectTabs = computed(() =>
  (Object.keys(ASPECT_SUBJECT_LABEL) as AspectSubject[]).map((key) => ({
    key,
    label: ASPECT_SUBJECT_LABEL[key],
    count: profiles.value.reduce((n, p) => n + p.aspects.filter((a) => a.subject === key).length, 0),
  }))
)

function selectSubject(key: AspectSubject) {
  aspectSubject.value = key
  openAspect.value = '' // 主語を変えたら開いていた行は閉じる（別の主語の引用が出たままにならないように）
}

/** 満足度の側面ごとの件数と、根拠になった引用。選んだ主語のぶんだけを、言及の多い順に。 */
const aspectStats = computed(() => {
  const map = new Map<string, { aspect: string; positive: number; negative: number; mentions: { sessionId: string; guestName: string; sentiment: string; quote: string }[] }>()
  for (const p of profiles.value) {
    for (const a of p.aspects) {
      if (a.subject !== aspectSubject.value) continue
      const cur = map.get(a.aspect) ?? { aspect: a.aspect, positive: 0, negative: 0, mentions: [] }
      if (a.sentiment === 'negative') cur.negative++
      else cur.positive++
      cur.mentions.push({ sessionId: p.sessionId, guestName: p.guestName, sentiment: a.sentiment, quote: a.quote })
      map.set(a.aspect, cur)
    }
  }
  return [...map.values()].sort((x, y) => y.positive + y.negative - (x.positive + x.negative))
})

const maxAspect = computed(() => Math.max(1, ...aspectStats.value.map((a) => a.positive + a.negative)))

/** 文字列配列の項目を数えて多い順に並べる（関心の対象・立ち寄り先・宿の体験で共用）。 */
function countBy(pick: (p: GuestProfile) => string[]) {
  const map = new Map<string, number>()
  for (const p of profiles.value) {
    for (const v of pick(p)) map.set(v, (map.get(v) ?? 0) + 1)
  }
  return [...map].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

const topicStats = computed(() => countBy((p) => p.topics))
const shukuboStats = computed(() => countBy((p) => p.shukuboStays))
const spotStats = computed(() => countBy((p) => p.areaSpots))
const innExpStats = computed(() => countBy((p) => p.innExperiences))

/** お客様カードの「全10地点中8番目」。順番が読み取れていなければ空文字（バッジごと出さない）。 */
function positionOf(p: GuestProfile): string {
  return routePositionLabel(p.routeIndex, p.route.length)
}

function pct(n: number): number {
  return profiles.value.length ? (n / profiles.value.length) * 100 : 0
}

function toggleAspect(aspect: string) {
  openAspect.value = openAspect.value === aspect ? '' : aspect
}

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

async function refresh() {
  busy.value = true
  error.value = ''
  try {
    data.value = await $fetch<InsightsRefreshResult>('/api/guesthouse/insights/refresh', { method: 'POST' })
  } catch (e: any) {
    error.value = e?.data?.message || '分析に失敗しました。時間をおいて試してください。'
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
