<script setup lang="ts">
interface Session {
  session_id: string
  session_type: string
  session_name: string
  session_date: string
  close_date: string | null
  year: number
  term: number | null
}

interface Bill {
  bill_id: string
  bill_number: string
  bill_title: string
  proposer: string | null
  result: string | null
  result_method: string | null
}

interface Speaker {
  speaker_name: string
  speaker_role: string | null
  speaker_party: string | null
  speaker_faction: string | null
  utterance_count: number
}

interface CategorySummary {
  name: string
  summary: string
  bills: string[]
  decisions: string[]
}

interface Keyword {
  word: string
  context: string
  explanation: string
}

interface SummaryResult {
  overview: string
  flow: string
  categories: CategorySummary[]
  keywords: Keyword[]
}

interface KeywordDetail {
  what_discussed: string
  general_explanation: string
  related_topics: string[]
}

interface BillDetail {
  summary: string
  points: string[]
  background: string
  outcome: string
}

const CATEGORY_COLORS: Record<string, string> = {
  '予算・財政': 'green',
  '条例・規則': 'blue',
  '福祉・医療・子育て': 'pink',
  '教育・文化': 'purple',
  '建設・インフラ': 'orange',
  '観光・産業・農業': 'teal',
  '人事・委員会': 'grey',
  '指定管理者': 'brown',
  '一般質問': 'indigo',
  '報告・手続き': 'blue-grey',
}

const RESULT_COLORS: Record<string, string> = {
  '原案可決': 'success',
  '可決': 'success',
  '同意': 'success',
  '承認': 'success',
  '認定': 'success',
  '否決': 'error',
  '継続審査': 'warning',
  '選挙': 'info',
}

// --- state ---
const sessionFilter = ref<'定例会' | '臨時会'>('定例会')
const selectedSessionId = ref<string | null>(null)
const summaryLoading = ref(false)
const keywordLoading = ref(false)
const keywordDialog = ref(false)
const selectedKeyword = ref<Keyword | null>(null)
const keywordDetail = ref<KeywordDetail | null>(null)
const selectedBill = ref<Bill | null>(null)
const billDetailLoading = ref(false)
const billDetail = ref<BillDetail | null>(null)

// --- fetch sessions ---
const { data: sessions, pending: sessionsPending } = await useFetch<Session[]>('/api/miyako/sessions')

const filteredSessions = computed(() =>
  (sessions.value ?? []).filter((s) => s.session_type === sessionFilter.value)
)

const selectedSession = computed(() =>
  (sessions.value ?? []).find((s) => s.session_id === selectedSessionId.value) ?? null
)

// --- fetch session data ---
const sessionData = ref<{ session: Session; bills: Bill[]; speakers: Speaker[] } | null>(null)
const sessionDataLoading = ref(false)

async function loadSession(id: string) {
  selectedSessionId.value = id
  summaryResult.value = null
  selectedBill.value = null
  billDetail.value = null
  sessionDataLoading.value = true
  try {
    sessionData.value = await $fetch(`/api/miyako/${id}/data`)
  } finally {
    sessionDataLoading.value = false
  }
}

async function selectBill(bill: Bill) {
  if (selectedBill.value?.bill_id === bill.bill_id) return
  selectedBill.value = bill
  billDetail.value = null
  billDetailLoading.value = true
  try {
    billDetail.value = await $fetch(`/api/miyako/${selectedSessionId.value}/bill`, {
      method: 'POST',
      body: { billId: bill.bill_id },
    })
  } finally {
    billDetailLoading.value = false
  }
}

// --- AI summary ---
const summaryResult = ref<SummaryResult | null>(null)

async function generateSummary() {
  if (!selectedSessionId.value) return
  summaryLoading.value = true
  try {
    summaryResult.value = await $fetch(`/api/miyako/${selectedSessionId.value}/summary`, {
      method: 'POST',
    })
  } finally {
    summaryLoading.value = false
  }
}

// --- keyword detail ---
async function openKeyword(kw: Keyword) {
  selectedKeyword.value = kw
  keywordDetail.value = null
  keywordDialog.value = true
  keywordLoading.value = true
  try {
    keywordDetail.value = await $fetch('/api/miyako/keyword', {
      method: 'POST',
      body: {
        keyword: kw.word,
        sessionId: selectedSessionId.value,
        context: kw.context,
      },
    })
  } finally {
    keywordLoading.value = false
  }
}

function resultColor(result: string | null): string {
  if (!result) return 'default'
  for (const [key, color] of Object.entries(RESULT_COLORS)) {
    if (result.includes(key)) return color
  }
  return 'default'
}

function formatDate(date: string) {
  return date.replace(/-/g, '/')
}
</script>

<template>
  <v-container class="miyako-container" max-width="1100">
    <!-- ヘッダー -->
    <div class="miyako-header">
      <h1 class="miyako-title">宮古島市議会 議事録ビューア</h1>
      <p class="miyako-subtitle">議事録を選択してAIで要約・分析</p>
    </div>

    <!-- 会期選択 -->
    <v-card class="mb-4" elevation="1">
      <v-card-text>
        <div class="d-flex align-center gap-4 flex-wrap">
          <v-btn-toggle v-model="sessionFilter" mandatory color="primary" variant="outlined" density="compact">
            <v-btn value="定例会">定例会</v-btn>
            <v-btn value="臨時会">臨時会</v-btn>
          </v-btn-toggle>

          <v-select
            v-model="selectedSessionId"
            :items="filteredSessions"
            item-title="session_name"
            item-value="session_id"
            label="会期を選択"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 340px"
            :loading="sessionsPending"
            @update:model-value="loadSession"
          >
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #append>
                  <span class="text-caption text-medium-emphasis">{{ formatDate(item.raw.session_date) }}</span>
                </template>
              </v-list-item>
            </template>
          </v-select>
        </div>
      </v-card-text>
    </v-card>

    <!-- ローディング -->
    <div v-if="sessionDataLoading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else-if="sessionData">
      <!-- 会期概要 -->
      <v-card class="mb-4" elevation="1">
        <v-card-title class="text-h6">
          {{ selectedSession?.session_name }}
        </v-card-title>
        <v-card-text>
          <div class="d-flex gap-4 flex-wrap text-body-2">
            <span>開会日: <strong>{{ formatDate(sessionData.session.session_date) }}</strong></span>
            <span v-if="sessionData.session.close_date">閉会日: <strong>{{ formatDate(sessionData.session.close_date) }}</strong></span>
            <span>第{{ sessionData.session.term }}期</span>
            <span>議案: <strong>{{ sessionData.bills.length }}</strong>件</span>
          </div>
        </v-card-text>
      </v-card>

      <v-row>
        <!-- 議案一覧 -->
        <v-col cols="12" md="5">
          <v-card elevation="1">
            <v-card-title class="text-subtitle-1">議案一覧</v-card-title>
            <v-list density="compact" lines="two" nav>
              <v-list-item
                v-for="bill in sessionData.bills"
                :key="bill.bill_id"
                :active="selectedBill?.bill_id === bill.bill_id"
                active-color="primary"
                class="bill-item"
                @click="selectBill(bill)"
              >
                <v-list-item-title class="text-body-2">{{ bill.bill_title }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">{{ bill.bill_number }}</v-list-item-subtitle>
                <template #append>
                  <v-chip
                    v-if="bill.result"
                    :color="resultColor(bill.result)"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ bill.result }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- 議案詳細 -->
        <v-col cols="12" md="7">
          <v-card elevation="1" height="100%">
            <!-- 未選択 -->
            <div v-if="!selectedBill" class="d-flex align-center justify-center pa-8 text-medium-emphasis" style="min-height: 160px">
              <div class="text-center">
                <v-icon size="32" class="mb-2">mdi-file-document-outline</v-icon>
                <p class="text-body-2">議案を選択すると詳細が表示されます</p>
              </div>
            </div>

            <template v-else>
              <v-card-title class="text-subtitle-1 pb-0">{{ selectedBill.bill_title }}</v-card-title>
              <v-card-subtitle class="text-caption pt-1 pb-2">
                {{ selectedBill.bill_number }}
                <span v-if="selectedBill.proposer">・提案者: {{ selectedBill.proposer }}</span>
              </v-card-subtitle>

              <v-divider />

              <!-- ローディング -->
              <div v-if="billDetailLoading" class="d-flex justify-center py-8">
                <v-progress-circular indeterminate color="primary" size="28" />
              </div>

              <v-card-text v-else-if="billDetail">
                <!-- 結果バッジ -->
                <div class="d-flex gap-2 mb-3">
                  <v-chip
                    v-if="selectedBill.result"
                    :color="resultColor(selectedBill.result)"
                    size="small"
                    variant="tonal"
                  >
                    {{ selectedBill.result }}
                  </v-chip>
                  <v-chip
                    v-if="selectedBill.result_method"
                    size="small"
                    variant="outlined"
                    color="grey"
                  >
                    {{ selectedBill.result_method }}
                  </v-chip>
                </div>

                <!-- 概要 -->
                <p class="text-caption font-weight-bold text-medium-emphasis mb-1">概要</p>
                <p class="text-body-2 mb-3">{{ billDetail.summary }}</p>

                <!-- 背景・目的 -->
                <p class="text-caption font-weight-bold text-medium-emphasis mb-1">背景・目的</p>
                <p class="text-body-2 mb-3">{{ billDetail.background }}</p>

                <!-- 議論のポイント -->
                <p class="text-caption font-weight-bold text-medium-emphasis mb-1">議論のポイント</p>
                <ul class="bill-points text-body-2 mb-3">
                  <li v-for="pt in billDetail.points" :key="pt">{{ pt }}</li>
                </ul>

                <!-- 審議結果 -->
                <p class="text-caption font-weight-bold text-medium-emphasis mb-1">審議結果</p>
                <p class="text-body-2">{{ billDetail.outcome }}</p>
              </v-card-text>
            </template>
          </v-card>
        </v-col>
      </v-row>

      <!-- AI要約ボタン -->
      <div class="d-flex justify-center my-6">
        <v-btn
          color="primary"
          size="large"
          :loading="summaryLoading"
          :disabled="summaryLoading"
          prepend-icon="mdi-brain"
          @click="generateSummary"
        >
          AIで議事録を分析する
        </v-btn>
      </div>

      <!-- AI要約結果 -->
      <template v-if="summaryResult">
        <!-- 全体概要 -->
        <v-card class="mb-4" elevation="1" color="primary" variant="tonal">
          <v-card-title class="text-subtitle-1">全体概要</v-card-title>
          <v-card-text>{{ summaryResult.overview }}</v-card-text>
        </v-card>

        <!-- 議論の流れ -->
        <v-card class="mb-4" elevation="1">
          <v-card-title class="text-subtitle-1">議論の流れ</v-card-title>
          <v-card-text>
            <div class="flow-text" style="white-space: pre-line">{{ summaryResult.flow }}</div>
          </v-card-text>
        </v-card>

        <!-- カテゴリ別まとめ -->
        <h2 class="text-subtitle-1 font-weight-bold mb-3">カテゴリ別まとめ</h2>
        <v-row class="mb-4">
          <v-col
            v-for="cat in summaryResult.categories"
            :key="cat.name"
            cols="12"
            md="6"
          >
            <v-card elevation="1" height="100%">
              <v-card-title>
                <v-chip
                  :color="CATEGORY_COLORS[cat.name] ?? 'grey'"
                  size="small"
                  variant="tonal"
                  class="mr-2"
                >
                  {{ cat.name }}
                </v-chip>
              </v-card-title>
              <v-card-text>
                <p class="text-body-2 mb-2">{{ cat.summary }}</p>
                <div v-if="cat.decisions.length" class="mt-2">
                  <p class="text-caption font-weight-bold text-medium-emphasis mb-1">決定事項</p>
                  <ul class="decision-list text-body-2">
                    <li v-for="d in cat.decisions" :key="d">{{ d }}</li>
                  </ul>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- キーワード -->
        <v-card elevation="1" class="mb-6">
          <v-card-title class="text-subtitle-1">重要キーワード（クリックで詳細）</v-card-title>
          <v-card-text>
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="kw in summaryResult.keywords"
                :key="kw.word"
                color="indigo"
                variant="tonal"
                class="keyword-chip"
                clickable
                @click="openKeyword(kw)"
              >
                {{ kw.word }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </template>
    </template>

    <!-- 未選択状態 -->
    <div v-else-if="!sessionDataLoading" class="empty-state text-center py-12 text-medium-emphasis">
      会期を選択してください
    </div>

    <!-- キーワード詳細ダイアログ -->
    <v-dialog v-model="keywordDialog" max-width="560">
      <v-card>
        <v-card-title class="text-h6 pa-4">
          <v-icon class="mr-2" color="indigo">mdi-tag-outline</v-icon>
          {{ selectedKeyword?.word }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <div v-if="keywordLoading" class="d-flex justify-center py-6">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <template v-else-if="keywordDetail">
            <p class="text-subtitle-2 font-weight-bold mb-1 text-indigo">この会議での内容</p>
            <p class="text-body-2 mb-4">{{ keywordDetail.what_discussed }}</p>

            <p class="text-subtitle-2 font-weight-bold mb-1">一般的な説明</p>
            <p class="text-body-2 mb-4">{{ keywordDetail.general_explanation }}</p>

            <p class="text-subtitle-2 font-weight-bold mb-1 text-medium-emphasis">関連トピック</p>
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="topic in keywordDetail.related_topics"
                :key="topic"
                size="small"
                variant="outlined"
              >
                {{ topic }}
              </v-chip>
            </div>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="keywordDialog = false">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.miyako-container {
  padding-top: 24px;
  padding-bottom: 48px;
}

.miyako-header {
  text-align: center;
  margin-bottom: 24px;
}

.miyako-title {
  font-size: clamp(20px, 4vw, 28px);
  font-weight: 700;
  margin: 0 0 4px;
}

.miyako-subtitle {
  color: rgba(0, 0, 0, 0.54);
  margin: 0;
}

.bill-item {
  cursor: pointer;
}

.bill-points {
  margin: 0;
  padding-left: 16px;
}

.bill-points li {
  margin-bottom: 4px;
}

.keyword-chip {
  cursor: pointer;
  transition: transform 0.1s;
}

.keyword-chip:hover {
  transform: scale(1.05);
}

.decision-list {
  margin: 0;
  padding-left: 16px;
}

.decision-list li {
  margin-bottom: 2px;
}

.empty-state {
  font-size: 16px;
}
</style>
