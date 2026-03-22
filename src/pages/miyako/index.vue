<script setup lang="ts">
definePageMeta({ ssr: false })

interface WordScore {
  word: string
  score: number
}

type FeaturesData = Record<string, WordScore[]>

const STOPWORDS = new Set([
  '言う', 'つく', '此れ', '其れ', '其の', '此の', '成る', '有る', '居る', '致す',
  '掛かる', '受ける', '関する', '行う', '行なう', '元年', '因る', '出る', '入る',
  '見る', '置く', '来る', '対する', '付く', '取る', '当たる', '係る', '伴う',
  '図る', '向ける', '与える', '設ける', '基づく', '求める', '休憩', '質疑',
  '議決', '議案', '請け負い', '一貫', '子供', '道路',
])

const CATEGORY_WORDS: Record<string, Set<string>> = {
  '暮らし・福祉': new Set([
    '介護', '住宅', '住居', '世帯', '老人', '子育て', '保育', '障害', '保護', '保障',
    '雇用', '賃金', '家賃', '就労', '助成', '定住', '入居', '民泊', '家族', '家庭',
    '引っ越し', '休業', '不妊', '育成', '療養', '難病', '慰謝', '賠償', '弁償',
    '世代', '人権', '尊厳', '民宿', '扶養', '勤務', '労働', '労務', '生命',
    '社協', '義捐', '見舞金', '移住', '傍聴', '給与', '給付', '給料', '年金',
    '生活', '就農', '空き家', '民間', '人口', '人材', '受給', '福祉',
  ]),
  '医療・健康': new Set([
    '病院', '医師', '患者', '診療', '接種', '感染', '療養', '難病', '衛生', '外科',
    '内科', '視力', '肝炎', '腎臓', '病気', '痛み', '認知', '不妊', 'ｐｃｒ',
    '疾患', '抗原', '白血球', '皮膚', '健診', '防疫', '障害', '虐待',
    '予防', '感覚', '疎通', '産後', '口蹄', '感染症',
  ]),
  '子ども・教育': new Set([
    '子育て', '学力', '学校', '学童', '生徒', '教室', '保育', '学級', '校長',
    '学区', '学園', '児童', '休校', '小児', '授業', '卒業', '学術', '教科', '教職員',
    '入学', '中学', '大学', '高校', '校区', '校舎', '図書', '園児', '休園',
    '学年', '学力', '文教', '奨励', '講座', '研修', '人材', '生徒',
  ]),
  'まちづくり・インフラ': new Set([
    '建築', '施工', '工期', '水道', '排水', '電気', '建設', '下水', '港湾',
    '空港', '電柱', '交通', '駐車', '大橋', '架橋', '浚渫', '埋め立て',
    '工務', '工区', '工法', '工場', '改修', '改築', '改良', '外構', '建て替え',
    '景観', '都市', '用排水', '取水', '水源', '水質', '水域', '水門',
    '農道', '市道', '路線', '幹線', '跡地', '再建', '整備',
    '電力', '電源', '燃料', '灯油', '水量', '浄水', '浄化', '汚泥',
    'ｌｅｄ', 'ｌｃｄ', 'ｉｃｔ', 'ｉｔ', 'ｄｘ',
    '構造', '構想', '構築', '造成', '埠頭', '丘陵', '基盤', '基礎',
    '底盤', '地盤', '土工', '残土', '破砕', '転圧', '型枠', '設備',
    '断水', '排水', '用地', '敷設', '入札', '工期', '施工', '工事',
    '立方', '数量', '約款', '置き場', '延長', '建物', '土砂', '丸太',
  ]),
  '農業・水産業': new Set([
    '農家', '漁業', '漁港', '養殖', '畜産', '農道', '牧場', '農薬', '甘蔗', '牡蠣',
    '製糖', '農業', '農地', '農振', '農村', '農漁業', '農都', '農山村', '漁協',
    '生産', '生乳', '肥料', '肥育', '栽培', '耕土', '圃場',
    '山羊', '藻類', '珊瑚', '糖価', '糖度', '和牛',
    '蕎麦', 'ｇａｐ', 'ｈａｃｃｐ', '食肉', '精肉', '食料', '食材', '飼料',
    '耳標', '漁港', '漁業', '漁協', '水産', '海産',
  ]),
  '観光・産業': new Set([
    '観光', '宿泊', '民泊', '商工', '市場', '産業', '物価', '製造', '飲食',
    '物産', '物流', '輸送', '物品', '景観', '周遊', '旅客', '旅費',
    '航空', '航路', 'ｊｔａ', '法人', '営業', '店舗', '購買', '購入',
    '売り払い', '売却', '売買', '工芸', '楽園', '記念',
    '運動', '大会', '競技', '球団', '球場', '野球', '祭り', '祭場',
    '祝賀', '祝辞', '演奏', '朗読', '映画', '音楽', '音声', '音響',
    '表彰', '受章', '叙勲', '民宿', '受け入れ',
  ]),
  '環境・防災': new Set([
    '台風', '津波', '避難', '災害', '防災', '排出', '汚染', '廃棄', '炭素', '珊瑚',
    '噴火', '噴出', '地震', '洪水', '冠水', '大雨', '雨量', '雨水', '暴風',
    '断層', '断水', '雨漏り', '防火', '消火', '消防', '警報', '警戒',
    '防犯', '防止', '防除', '脱炭', '太陽', '風力', '蓄電', '発電', '充電',
    '省エネ', '酸化', '汚泥', '汚濁', '瓦礫', '飛散', '軽石',
    '漂着', '漂流', '海岸', '山間', '崖下', '陥没', '土砂', '破損',
    '損害', '被災', '被害', '流用', '廃止', '廃校', '除草',
  ]),
  '財政・税金': new Set([
    '税金', '赤字', '予算', '補助', '歳出', '収入', '財務', '補償', '減税', '黒字',
    '財団', '税制', '税額', '課税', '増税', '納税', '納入', '納品',
    '補填', '補充', '補強', '補欠', '補佐',
    '収支', '収納', '収穫', '収集', '債務', '債権', '償却', '有償', '無償',
    '金融', '金利', '銀行', '公債', '公庫', '起債', '返済', '返還',
    '追認', '還付', '還元', '繰り越し', '繰り入れ', '繰り上げ',
    '剰余', '予備', '積立', '資産', '資格', '資材', '充当', '充用',
    '加算', '概算', '計算', '精算', '清算', '賦課', '賃借',
    '分担', '割合', '組み替え', '減額', '増額', '減価', '減免',
    '減給', '滞納', '不納', '分納', '前払い', '買収',
    '損益', '損傷', '見積もり', '随契', '随意', '発注', '委託',
    '入札', '落札', '競争', '選定', 'ｐｆｉ', '補修', '補助金',
  ]),
  '行政・議会運営': new Set([
    '市議', '市政', '議場', '選任', '投票', '議席', '条例', '決議', '陳情',
    '請願', '答申', '動議', '勧告', '告発', '告知', '通告', '訓示', '訓告',
    '辞職', '辞任', '辞退', '解任', '解散', '解明', '解消',
    '市制', '市営', '市有', '市税', '市道', '首長', '部長',
    '課長', '部会', '部局', '役員', '役割', '役職',
    '認定', '認可', '承諾', '合意', '決裁', '流会',
    '閉庁', '閉鎖', '開示', '開発', '開票', '開通', '開所', '開札',
    '人事', '人件', '人材', '人勧', '任命', '任期', '任務', '任用',
    '再任', '昇任', '退職', '退任', '免除', '選考', '選択',
    '施政', '施策', '行財政', '政権', '政府', '政党',
    '公募', '公職', '公務', '公報', '公益', '公社', '公立', '公約',
    '会派', '会場', '会長', '広域',
    '起案', '起用', '記入', '記名', '謄本', '誤字', '付帯', '付則',
    '専決', '専任', '専門', '所管', '所定', '所在',
    '審理', '裁判', '裁定', '裁決', '裁量', '判決', '起訴', '被告',
    '声明', '謝罪', '嘆願', '陳情', '陳述', '陳謝',
    '研修', '出張', '随契', '随意', '指令', '指示', '策定',
    '規格', '規模', '規程', '規約', '方式', '方向', '形成', '統一', '統合',
    '連合', '連携', '連帯', '連絡', '連結', '連盟', '職務', '職種',
    '互選', '選挙', '当選', '落選', '得票', '否決', '賛否', '表決',
  ]),
  '安全保障・基地問題': new Set([
    '基地', '軍事', '弾薬', '自衛', '駐屯', '艦隊', '射撃', '火薬', '実弾',
    '軍人', '軍属', '艦船', '兵力', '兵士', '戦争', '戦略', '戦没', '軍艦',
    '爆撃', '殺傷', '火傷', '防衛', '有事', '海兵', '海軍',
    '空軍', '陸上', '米軍', '米国', '米兵', '在沖', '在日', '日米',
    'ｅｅｚ', '領海', '領土', '領有', '拉致', '遺骨', '遺体',
    '遺跡', '追悼', '遺棄', '陣地', '誤発', '賠償',
  ]),
}

const TOP_KEYWORDS = 100
const MAX_DISPLAY = 30
const CELL_WIDTH = 28

const loading = ref(true)
const rawData = ref<FeaturesData>({})
const sessionTypeFilter = ref<'すべて' | '定例会' | '臨時会'>('すべて')
const selectedSession = ref<string | null>(null)
const sessionCount = MAX_DISPLAY
const windowEnd = ref(0)

interface AiTopic {
  title: string
  conclusion: string
  flow: string[]
}

const selectedWord = ref<string | null>(null)
const aiTopics = ref<AiTopic[]>([])
const aiLoading = ref(false)
const maxChars = ref(1000)
const MAX_CHARS_OPTIONS = [500, 1000, 2000]
const selectedCategory = ref<string>('すべて')
const CATEGORY_OPTIONS = ['すべて', ...Object.keys(CATEGORY_WORDS)]

const WC_COLORS = [
  '#1A237E', '#283593', '#303F9F', '#3949AB',
  '#3F51B5', '#5C6BC0', '#7986CB', '#0D47A1',
  '#1565C0', '#1976D2', '#1E88E5',
]

const wordcloudWords = computed(() => {
  if (!selectedSession.value) return []
  const words = (rawData.value[selectedSession.value] ?? [])
    .filter(w => !STOPWORDS.has(w.word))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
  if (!words.length) return []
  const maxScore = words[0].score
  const minScore = words[words.length - 1].score
  const range = maxScore - minScore || 1
  return words.map((w, i) => {
    const t = (w.score - minScore) / range
    const size = Math.round(11 + Math.pow(t, 0.55) * 26)  // 11px〜37px（平方根に近いカーブ）
    return { name: w.word, score: w.score, size, color: WC_COLORS[i % WC_COLORS.length] }
  })
})

// ── ワードクラウド螺旋レイアウト ─────────────────
const wcContainerRef = ref<HTMLElement>()
const wcPositions = ref<Record<string, { x: number; y: number }>>({})
const wcReady = ref(false)

// selectedSession が変わったらリセット（pre: DOM更新前）
watch(selectedSession, () => {
  wcReady.value = false
  wcPositions.value = {}
})

// 単語リストが変わった後（post: DOM更新後）に配置計算
watch(wordcloudWords, (words) => {
  if (!words.length) return
  layoutWordcloud()
}, { flush: 'post' })

function layoutWordcloud() {
  const container = wcContainerRef.value
  if (!container) return
  const cw = container.offsetWidth
  const ch = container.offsetHeight
  if (!cw || !ch) return

  const cx = cw / 2
  const cy = ch / 2
  const spans = Array.from(container.querySelectorAll<HTMLElement>('.wc-word'))
  const words = wordcloudWords.value
  if (!spans.length || spans.length !== words.length) return

  const newPos: Record<string, { x: number; y: number }> = {}
  const boxes: { x: number; y: number; hw: number; hh: number }[] = []

  for (let i = 0; i < spans.length; i++) {
    const el = spans[i]
    const hw = el.offsetWidth / 2 + 1
    const hh = el.offsetHeight / 2 + 1
    const name = words[i].name

    if (i === 0) {
      newPos[name] = { x: cx, y: cy }
      boxes.push({ x: cx, y: cy, hw, hh })
      continue
    }

    let px = cx, py = cy
    for (let step = 0; step < 2000; step++) {
      const theta = step * 0.12
      const r = 1.5 * theta
      const x = cx + r * Math.cos(theta)
      const y = cy + r * Math.sin(theta) * 0.65
      if (x - hw < 2 || x + hw > cw - 2) continue
      if (y - hh < 2 || y + hh > ch - 2) continue
      if (!boxes.some(b =>
        Math.abs(x - b.x) < hw + b.hw &&
        Math.abs(y - b.y) < hh + b.hh
      )) {
        px = x; py = y
        break
      }
    }
    newPos[name] = { x: px, y: py }
    boxes.push({ x: px, y: py, hw, hh })
  }

  // 配置済み単語の実際の占有矩形を測定してコンテナいっぱいに拡大
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
  for (let i = 0; i < spans.length; i++) {
    const p = newPos[words[i].name]
    const hw = spans[i].offsetWidth / 2
    const hh = spans[i].offsetHeight / 2
    left   = Math.min(left,   p.x - hw)
    right  = Math.max(right,  p.x + hw)
    top    = Math.min(top,    p.y - hh)
    bottom = Math.max(bottom, p.y + hh)
  }
  const contentCx = (left + right) / 2
  const contentCy = (top + bottom) / 2
  const scaleX = (cw - 8) / (right - left)
  const scaleY = (ch - 8) / (bottom - top)
  const scale  = Math.min(scaleX, scaleY, 2.0)  // 最大2倍まで拡大

  if (scale > 1.05) {
    for (const name in newPos) {
      newPos[name] = {
        x: cx + (newPos[name].x - contentCx) * scale,
        y: cy + (newPos[name].y - contentCy) * scale,
      }
    }
  }

  wcPositions.value = newPos
  wcReady.value = true
}

const heatmapRef = ref<HTMLElement>()
let heatmapChart: any = null
let EC: any = null

onMounted(async () => {
  EC = await import('echarts')

  rawData.value = await $fetch<FeaturesData>('/data/miyako-features.json')
  loading.value = false
  await nextTick()
  renderHeatmap()
})

onUnmounted(() => {
  heatmapChart?.dispose()
})

function parseDate(key: string): Date {
  const m = key.match(/(\d{4}-\d{2}-\d{2})/)
  return m ? new Date(m[1]) : new Date(0)
}

function shortLabel(key: string): string {
  const m = key.match(/(令和|平成)(元|\d+)年\s+第(\d+)回\s+(定例会|臨時会)/)
  if (!m) return key
  const era = m[1] === '令和' ? '令' : '平'
  const year = m[2] === '元' ? '1' : m[2]
  const type = m[4] === '定例会' ? '定' : '臨'
  return `${era}${year}-${m[3]}${type}`
}

const filteredSessions = computed(() =>
  Object.keys(rawData.value)
    .filter(k => sessionTypeFilter.value === 'すべて' || k.includes(sessionTypeFilter.value))
    .sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime())
)

const windowEndMax = computed(() => filteredSessions.value.length)
const windowEndMin = computed(() => Math.min(sessionCount, filteredSessions.value.length))

const displayedSessions = computed(() => {
  const sessions = filteredSessions.value
  if (!sessions.length) return []
  const end = Math.min(windowEnd.value, sessions.length)
  const start = Math.max(0, end - sessionCount)
  return sessions.slice(start, end)
})

const topKeywords = computed(() => {
  const maxScore = new Map<string, number>()
  for (const key of displayedSessions.value) {
    for (const { word, score } of (rawData.value[key] ?? [])) {
      if (!STOPWORDS.has(word) && (maxScore.get(word) ?? 0) < score) {
        maxScore.set(word, score)
      }
    }
  }
  let entries = [...maxScore.entries()].sort((a, b) => b[1] - a[1])
  if (selectedCategory.value !== 'すべて') {
    const catWords = CATEGORY_WORDS[selectedCategory.value]
    entries = entries.filter(([w]) => catWords?.has(w))
  }
  return entries.slice(0, TOP_KEYWORDS).map(([w]) => w)
})

const rangeLabel = computed(() => {
  const s = displayedSessions.value
  if (!s.length) return ''
  return `${shortLabel(s[0])} 〜 ${shortLabel(s[s.length - 1])}`
})

watch(filteredSessions, (sessions) => {
  windowEnd.value = sessions.length
}, { immediate: true })



function renderHeatmap() {
  if (!heatmapRef.value || !EC) return
  const sessions = displayedSessions.value
  const keywords = topKeywords.value
  const rowHeight = 22
  const chartHeight = keywords.length * rowHeight + 54
  const chartWidth = sessions.length * CELL_WIDTH + 37

  // null を -1 で表現して outOfRange カラーに割り当てる
  const data: [number, number, number][] = []
  for (let si = 0; si < sessions.length; si++) {
    const wordMap = new Map(
      (rawData.value[sessions[si]] ?? []).map(w => [w.word, w.score])
    )
    for (let ki = 0; ki < keywords.length; ki++) {
      const s = wordMap.get(keywords[ki])
      data.push([si, ki, s !== undefined ? s : -1])
    }
  }

  heatmapChart?.dispose()
  heatmapRef.value.style.width = chartWidth + 'px'
  heatmapRef.value.style.height = chartHeight + 'px'
  heatmapChart = EC.init(heatmapRef.value, null, { renderer: 'canvas' })

  heatmapChart.setOption({
    animation: false,
    grid: { top: 40, right: 7, bottom: 4, left: 50 },
    xAxis: {
      type: 'category',
      data: sessions.map(shortLabel),
      position: 'top',
      axisLabel: { rotate: 60, fontSize: 9, align: 'left', margin: 35 },
      splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: keywords,
      inverse: true,
      axisLabel: { fontSize: 11 },
      splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    visualMap: {
      show: false,
      min: 0,
      max: 0.45,
      inRange: { color: ['#EEF0FF', '#7986CB', '#1A237E'] },
      outOfRange: { color: '#EEEEEE' },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.value[2] < 0) return ''
        const label = sessions[params.value[0]].replace(/〜[\d-]+$/, '〜')
        return `<b>${label}</b><br/>${keywords[params.value[1]]}: <b>${params.value[2].toFixed(3)}</b>`
      },
    },
    series: [{
      type: 'heatmap',
      data,
      cursor: 'pointer',
      itemStyle: { borderWidth: 0.5, borderColor: '#FAFAFA' },
      emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)' } },
    }],
  })

  heatmapChart.on('click', (params: any) => {
    if (params.value[2] < 0) return
    selectedSession.value = sessions[params.value[0]]
  })
}

async function fetchSummary(word: string) {
  if (!selectedSession.value) return
  selectedWord.value = word
  aiTopics.value = []

  const cacheKey = `miyako_summary:${selectedSession.value}:${word}:${maxChars.value}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      aiTopics.value = JSON.parse(cached)
      return
    } catch {
      localStorage.removeItem(cacheKey)
    }
  }

  aiLoading.value = true
  try {
    const data = await $fetch<{ topics: AiTopic[] }>('/api/miyako/search', {
      method: 'POST',
      body: { session: selectedSession.value, word, maxChars: maxChars.value },
    })
    aiTopics.value = data.topics
    localStorage.setItem(cacheKey, JSON.stringify(data.topics))
  } catch {
    aiTopics.value = [{ title: 'エラー', conclusion: '取得に失敗しました。', flow: [] }]
  } finally {
    aiLoading.value = false
  }
}

async function resetAndRender() {
  selectedSession.value = null
  selectedWord.value = null
  aiTopics.value = []
  await nextTick()
  renderHeatmap()
}

watch(sessionTypeFilter, async () => {
  await nextTick()
  resetAndRender()
})

watch(windowEnd, resetAndRender)
watch(selectedCategory, resetAndRender)
</script>

<template>
  <div class="min-h-screen bg-[#f0f2f8]">
    <!-- Page header + Controls -->
    <header class="bg-gradient-to-br from-[#121d3e] to-[#2a3f7a] px-6 py-3.5">
      <div class="max-w-[1400px] mx-auto flex items-center gap-4">
        <!-- Title + tabs -->
        <div class="flex items-center gap-4 flex-shrink-0">
          <h1 class="m-0 text-[clamp(15px,2vw,19px)] font-bold text-white tracking-[0.03em] whitespace-nowrap">
            宮古島市議会
          </h1>
          <div class="flex rounded overflow-hidden border border-white/20">
            <span class="px-3 py-1 text-[12px] font-semibold bg-[#a5b4fc] text-[#121d3e] whitespace-nowrap">議事録分析</span>
            <NuxtLink to="/miyako/tfidf" class="px-3 py-1 text-[12px] font-medium bg-white/10 text-white/70 hover:bg-white/20 whitespace-nowrap transition-colors">話者分析</NuxtLink>
          </div>
        </div>

        <!-- Controls (right-aligned) -->
        <div class="flex items-center flex-wrap gap-y-1.5 gap-x-4 ml-auto">
          <div class="flex items-center gap-1.5">
            <span class="text-[10.5px] font-semibold text-white/50 whitespace-nowrap uppercase tracking-[0.04em]">会期</span>
            <select
              v-model="sessionTypeFilter"
              class="ctrl-select"
            >
              <option v-for="opt in ['すべて', '定例会', '臨時会']" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-[10.5px] font-semibold text-white/50 whitespace-nowrap uppercase tracking-[0.04em]">期間</span>
            <input
              v-model.number="windowEnd"
              type="range"
              :min="windowEndMin"
              :max="windowEndMax"
              :step="1"
              class="ctrl-slider"
            />
            <span class="text-[10.5px] text-white/50 whitespace-nowrap min-w-[110px]">{{ rangeLabel }}</span>
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-[10.5px] font-semibold text-white/50 whitespace-nowrap uppercase tracking-[0.04em]">カテゴリ</span>
            <select
              v-model="selectedCategory"
              class="ctrl-select"
            >
              <option v-for="opt in CATEGORY_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-[10.5px] font-semibold text-white/50 whitespace-nowrap uppercase tracking-[0.04em]">要約文字数</span>
            <select
              v-model.number="maxChars"
              class="ctrl-select"
            >
              <option v-for="n in MAX_CHARS_OPTIONS" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-[72px] px-6">
      <span class="w-11 h-11 rounded-full border-[3px] border-[#1A237E]/30 border-t-[#1A237E] animate-spin block" />
    </div>

    <!-- Main content -->
    <div v-else class="max-w-[1400px] mx-auto px-6 pt-[11px] pb-8 flex flex-col md:flex-row gap-3 items-start">

      <!-- Heatmap panel -->
      <div class="flex-1 min-w-0 bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden">
        <div class="flex items-center gap-1 px-3.5 py-2.5 border-b border-[#dde2ef] bg-[#fafbff]">
          <span class="text-[11.5px] font-bold text-[#1c2d5a] tracking-[0.03em]">■ キーワード分布</span>
          <span class="text-[11px] text-[#6878a8] ml-2">{{ rangeLabel }}</span>
          <span class="text-[10.5px] text-[#6878a8] ml-auto opacity-70">列をクリックでワードクラウドを表示</span>
        </div>
        <div class="overflow-auto max-h-[600px] p-1.5">
          <div ref="heatmapRef" class="inline-block" />
        </div>
      </div>

      <!-- Side panel -->
      <div class="w-full md:w-[420px] md:h-[638px] flex-shrink-0 flex flex-col gap-3">
        <!-- Wordcloud card -->
        <div class="flex-shrink-0 bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden">
          <template v-if="selectedSession">
            <!-- Session header -->
            <div class="flex items-center gap-1 px-3.5 py-2.5 bg-[#eef1fb] border-b border-[#dde2ef]">
              <span class="opacity-70">📅</span>
              <span class="text-xs font-semibold text-[#1c2d5a] tracking-[0.02em]">{{ selectedSession?.replace(/〜[\d-]+$/, '〜') }}</span>
            </div>

            <!-- Wordcloud -->
            <div class="p-0">
              <div ref="wcContainerRef" class="wordcloud-container">
                <span
                  v-for="item in wordcloudWords"
                  :key="item.name"
                  class="wc-word"
                  :style="{
                    fontSize: item.size + 'px',
                    color: item.color,
                    left: (wcPositions[item.name]?.x ?? 0) + 'px',
                    top: (wcPositions[item.name]?.y ?? 0) + 'px',
                    opacity: wcReady ? 1 : 0,
                  }"
                  :title="`特徴度: ${item.score.toFixed(3)}`"
                  @click="fetchSummary(item.name)"
                >{{ item.name }}</span>
              </div>
            </div>
          </template>

          <!-- Empty state -->
          <div v-else class="flex flex-col items-center justify-center min-h-[280px] gap-3 p-8 text-center text-[#6878a8] text-xs leading-relaxed">
            <span class="text-4xl opacity-25">👆</span>
            <p class="m-0">左のヒートマップの列をクリックすると<br>ワードクラウドが表示されます</p>
          </div>
        </div>

        <!-- AI card -->
        <div class="flex-1 min-h-0 bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden flex flex-col">
          <div v-if="!selectedWord" class="flex items-center px-3.5 py-3 text-xs text-[#6878a8]">
            👆 単語をクリックするとAI解説が表示されます
          </div>
          <template v-else>
            <div class="flex items-center flex-shrink-0 bg-[#1c2d5a] text-white text-[13.5px] font-semibold px-3.5 py-2.5 tracking-[0.02em]">
              🤖 「{{ selectedWord }}」の議論
            </div>
            <div class="overflow-y-auto flex-1 min-h-0">
              <div v-if="aiLoading" class="flex items-center justify-center min-h-[80px]">
                <span class="w-[22px] h-[22px] rounded-full border-2 border-[#1A237E]/30 border-t-[#1A237E] animate-spin block" />
              </div>
              <div v-else class="ai-body">
                <div v-for="(topic, ti) in aiTopics" :key="ti" :class="ti > 0 ? 'mt-4 pt-4 border-t border-[#dde2ef]' : ''">
                  <div class="topic-title">{{ topic.title }}</div>
                  <div class="conclusion">{{ topic.conclusion }}</div>
                  <div v-if="topic.flow.length" class="flow-list">
                    <template v-for="(step, si) in topic.flow" :key="si">
                      <div class="flow-step">{{ step }}</div>
                      <div v-if="si < topic.flow.length - 1" class="flow-arrow">↓</div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ctrl-slider {
  min-width: 110px;
  max-width: 170px;
  accent-color: #a5b4fc;
}

.ctrl-select {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: rgba(255,255,255,0.85);
  font-size: 11.5px;
  font-weight: 500;
  padding: 2px 6px;
  cursor: pointer;
  outline: none;
}

.ctrl-select:focus {
  border-color: rgba(255,255,255,0.4);
}

.ctrl-select option {
  background: #1c2d5a;
  color: white;
}

.wordcloud-container {
  position: relative;
  width: 100%;
  height: 220px;
  overflow: hidden;
}

.wc-word {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition: opacity 0.25s;
}

.wc-word:hover {
  opacity: 0.55 !important;
}

.ai-body {
  font-size: 13px;
  color: #1c2d5a;
  padding: 12px 14px;
  line-height: 1.75;
}

.topic-title {
  font-size: 13.5px;
  font-weight: 700;
  margin-bottom: 5px;
  color: #1c2d5a;
  border-left: 3px solid #3d5fc4;
  padding-left: 8px;
}

.conclusion {
  font-size: 12.5px;
  color: #3a4a72;
  background: #f0f3fb;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 10px;
  line-height: 1.7;
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.flow-step {
  font-size: 12.5px;
  color: #1c2d5a;
  background: #fff;
  border: 1px solid #dde2ef;
  border-radius: 6px;
  padding: 6px 10px;
  line-height: 1.65;
}

.flow-arrow {
  text-align: center;
  color: #3d5fc4;
  font-size: 15px;
  line-height: 1.4;
  opacity: 0.6;
  margin: 1px 0;
}
</style>
