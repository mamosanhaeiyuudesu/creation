<script setup lang="ts">
definePageMeta({ ssr: false })

interface SpeakerMeta {
  id: string
  name: string
  role: string
  gender: string
  party: string
  faction: string
  terms: number[]
  utterance_count: number
  total_words: number
  in_member_json: boolean
}

interface WordEntry {
  speaker_id: string
  word: string
  tfidf: number
  rank: number
}

interface CategoryEntry {
  speaker_id: string
  category: string
  score: number
  top_words: string
}

const CATEGORIES = [
  '暮らし・福祉', '医療・健康', '子ども・教育', 'まちづくり・インフラ',
  '農業・水産業', '観光・産業', '環境・防災', '財政・税金',
  '行政・議会運営', '安全保障・基地問題',
]

const mode = ref<'word' | 'category'>('word')
const rankLimit = ref(20)
const filterGender = ref('すべて')
const filterGroup = ref('すべて')
const memberOnly = ref(true)

const speakersMeta = ref<SpeakerMeta[]>([])
const wordEntries = ref<WordEntry[]>([])
const categoryEntries = ref<CategoryEntry[]>([])
const loading = ref(true)

// --- CSV parser ---
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseRow(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
}

function parseRow(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQuote = !inQuote }
    else if (c === ',' && !inQuote) { result.push(cur); cur = '' }
    else { cur += c }
  }
  result.push(cur)
  return result
}

// --- filter options ---
const groupOptions = computed(() => {
  const counts = new Map<string, number>()
  for (const s of speakersMeta.value) {
    if (memberOnly.value && !s.in_member_json) continue
    if (s.faction && s.faction !== '-') counts.set(s.faction, (counts.get(s.faction) ?? 0) + 1)
    if (s.party && s.party !== '-') counts.set(s.party, (counts.get(s.party) ?? 0) + 1)
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  return [{ label: 'すべて', value: 'すべて' }, ...sorted.map(([k, n]) => ({ label: `${k}（${n}）`, value: k }))]
})

// --- filtered speakers ---
const filteredSpeakers = computed(() =>
  speakersMeta.value.filter(s => {
    if (memberOnly.value && !s.in_member_json) return false
    if (filterGender.value !== 'すべて' && s.gender !== filterGender.value) return false
    if (filterGroup.value !== 'すべて' && s.faction !== filterGroup.value && s.party !== filterGroup.value) return false
    return true
  })
)

const filteredIds = computed(() => new Set(filteredSpeakers.value.map(s => s.id)))

// wordMap[speakerId][rank] = {word, tfidf}
const wordMap = computed(() => {
  const map: Record<string, Record<number, { word: string; tfidf: number }>> = {}
  for (const e of wordEntries.value) {
    if (!filteredIds.value.has(e.speaker_id) || e.rank > rankLimit.value) continue
    if (!map[e.speaker_id]) map[e.speaker_id] = {}
    map[e.speaker_id][e.rank] = { word: e.word, tfidf: e.tfidf }
  }
  return map
})

const wordRange = computed(() => {
  let min = Infinity, max = -Infinity
  for (const ranks of Object.values(wordMap.value)) {
    for (const { tfidf } of Object.values(ranks)) {
      if (tfidf < min) min = tfidf
      if (tfidf > max) max = tfidf
    }
  }
  return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 1 : max }
})

// catMap[speakerId][category] = {score, top_words}
const catMap = computed(() => {
  const map: Record<string, Record<string, { score: number; top_words: string }>> = {}
  for (const e of categoryEntries.value) {
    if (!filteredIds.value.has(e.speaker_id)) continue
    if (!map[e.speaker_id]) map[e.speaker_id] = {}
    map[e.speaker_id][e.category] = { score: e.score, top_words: e.top_words }
  }
  return map
})

const catRange = computed(() => {
  let min = Infinity, max = -Infinity
  for (const cats of Object.values(catMap.value)) {
    for (const { score } of Object.values(cats)) {
      if (score < min) min = score
      if (score > max) max = score
    }
  }
  return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 1 : max }
})

// heatmap color: #EEF0FF (low) → #1A237E (high)
function heatColor(value: number, min: number, max: number) {
  const t = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)))
  const r = Math.round(0xEE + t * (0x1A - 0xEE))
  const g = Math.round(0xF0 + t * (0x23 - 0xF0))
  const b = Math.round(0xFF + t * (0x7E - 0xFF))
  return { bg: `rgb(${r},${g},${b})`, light: t < 0.45 }
}

onMounted(async () => {
  const [metaRaw, wordsRaw, catsRaw] = await Promise.all([
    $fetch<SpeakerMeta[]>('/data/speakers_meta.json'),
    $fetch('/data/tfidf_words.csv', { responseType: 'text' }) as Promise<string>,
    $fetch('/data/tfidf_categories.csv', { responseType: 'text' }) as Promise<string>,
  ])

  speakersMeta.value = metaRaw

  wordEntries.value = parseCsv(wordsRaw).map(r => ({
    speaker_id: r.speaker_id,
    word: r.word,
    tfidf: parseFloat(r.tfidf),
    rank: parseInt(r.rank),
  }))

  categoryEntries.value = parseCsv(catsRaw).map(r => ({
    speaker_id: r.speaker_id,
    category: r.category,
    score: parseFloat(r.score),
    top_words: r.top_words,
  }))

  loading.value = false
})
</script>

<template>
  <div class="min-h-screen bg-[#f0f2f8]">
    <!-- Header -->
    <header class="bg-gradient-to-br from-[#121d3e] to-[#2a3f7a] px-6 py-3.5">
      <div class="max-w-[1600px] mx-auto flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-4 flex-shrink-0">
          <h1 class="m-0 text-[clamp(15px,2vw,19px)] font-bold text-white tracking-[0.03em] whitespace-nowrap">
            宮古島市議会
          </h1>
          <div class="flex rounded overflow-hidden border border-white/20">
            <NuxtLink to="/miyako" class="px-3 py-1 text-[12px] font-medium bg-white/10 text-white/70 hover:bg-white/20 whitespace-nowrap transition-colors">議事録分析</NuxtLink>
            <span class="px-3 py-1 text-[12px] font-semibold bg-[#a5b4fc] text-[#121d3e] whitespace-nowrap">話者分析</span>
          </div>
        </div>

        <div class="flex items-center flex-wrap gap-y-1.5 gap-x-4 ml-auto">
          <!-- モード -->
          <div class="flex items-center gap-1.5">
            <span class="text-[10.5px] font-semibold text-white/50 uppercase tracking-[0.04em]">モード</span>
            <div class="flex rounded overflow-hidden border border-white/20">
              <button
                :class="['px-3 py-0.5 text-[11.5px] font-medium transition-colors', mode === 'word' ? 'bg-[#a5b4fc] text-[#121d3e]' : 'bg-white/10 text-white/70 hover:bg-white/20']"
                @click="mode = 'word'">単語</button>
              <button
                :class="['px-3 py-0.5 text-[11.5px] font-medium transition-colors', mode === 'category' ? 'bg-[#a5b4fc] text-[#121d3e]' : 'bg-white/10 text-white/70 hover:bg-white/20']"
                @click="mode = 'category'">カテゴリ</button>
            </div>
          </div>

          <!-- 単語モード: 表示行数 -->
          <div v-if="mode === 'word'" class="flex items-center gap-1.5">
            <span class="text-[10.5px] font-semibold text-white/50 uppercase tracking-[0.04em]">表示数</span>
            <select v-model.number="rankLimit" class="ctrl-select">
              <option v-for="n in [5, 10, 15, 20]" :key="n" :value="n">top {{ n }}</option>
            </select>
          </div>

          <!-- フィルタ -->
          <label class="flex items-center gap-1 text-[11px] text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="memberOnly" class="accent-[#a5b4fc]" />
            議員のみ
          </label>

          <div class="flex items-center gap-1.5">
            <span class="text-[10.5px] font-semibold text-white/50 uppercase tracking-[0.04em]">性別</span>
            <select v-model="filterGender" class="ctrl-select">
              <option v-for="g in ['すべて', '男', '女']" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-[10.5px] font-semibold text-white/50 uppercase tracking-[0.04em]">会派・政党</span>
            <select v-model="filterGroup" class="ctrl-select">
              <option v-for="opt in groupOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-[72px]">
      <span class="w-11 h-11 rounded-full border-[3px] border-[#1A237E]/30 border-t-[#1A237E] animate-spin block" />
    </div>

    <!-- Table -->
    <div v-else class="max-w-[1600px] mx-auto px-6 pt-3 pb-8">
      <div class="bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden">

        <!-- Card header -->
        <div class="flex items-center gap-2 px-4 py-2.5 border-b border-[#dde2ef] bg-[#fafbff]">
          <span class="text-[11.5px] font-bold text-[#1c2d5a] tracking-[0.03em]">
            ■ {{ mode === 'word' ? '特徴語ヒートマップ' : 'カテゴリ傾注度' }}
          </span>
          <span class="text-[11px] text-[#6878a8]">{{ filteredSpeakers.length }}人</span>
          <span v-if="mode === 'word'" class="text-[10.5px] text-[#6878a8] ml-auto opacity-70">各議員の特徴語を上から特徴度順に表示</span>
          <span v-else class="text-[10.5px] text-[#6878a8] ml-auto opacity-70">数値にカーソルで上位語を表示</span>
        </div>

        <div class="overflow-auto">
          <!-- 単語モード -->
          <table v-if="mode === 'word'" class="tbl">
            <thead>
              <tr>
                <th class="tbl-rank-head">#</th>
                <th v-for="s in filteredSpeakers" :key="s.id" class="tbl-col-head">
                  <div class="tbl-name">{{ s.name }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rank in rankLimit" :key="rank">
                <td class="tbl-rank-cell">{{ rank }}</td>
                <td
                  v-for="s in filteredSpeakers" :key="s.id"
                  class="tbl-cell"
                  :title="wordMap[s.id]?.[rank] ? `${wordMap[s.id][rank].word}　TF-IDF: ${wordMap[s.id][rank].tfidf.toFixed(4)}` : ''"
                  :style="wordMap[s.id]?.[rank]
                    ? { backgroundColor: heatColor(wordMap[s.id][rank].tfidf, wordRange.min, wordRange.max).bg }
                    : { backgroundColor: '#f8f9fe' }"
                >
                  <span
                    v-if="wordMap[s.id]?.[rank]"
                    :style="{ color: heatColor(wordMap[s.id][rank].tfidf, wordRange.min, wordRange.max).light ? '#1c2d5a' : '#fff' }"
                  >{{ wordMap[s.id][rank].word }}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- カテゴリモード -->
          <table v-else class="tbl">
            <thead>
              <tr>
                <th class="tbl-cat-head">カテゴリ</th>
                <th v-for="s in filteredSpeakers" :key="s.id" class="tbl-col-head">
                  <div class="tbl-name">{{ s.name }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cat in CATEGORIES" :key="cat">
                <td class="tbl-cat-cell">{{ cat }}</td>
                <td
                  v-for="s in filteredSpeakers" :key="s.id"
                  class="tbl-cell tbl-cell--cat"
                  :title="catMap[s.id]?.[cat] ? `上位語: ${catMap[s.id][cat].top_words}` : ''"
                  :style="catMap[s.id]?.[cat]
                    ? { backgroundColor: heatColor(catMap[s.id][cat].score, catRange.min, catRange.max).bg }
                    : { backgroundColor: '#f8f9fe' }"
                >
                  <span
                    v-if="catMap[s.id]?.[cat]"
                    class="text-[10px]"
                    :style="{ color: heatColor(catMap[s.id][cat].score, catRange.min, catRange.max).light ? '#6878a8' : '#fff' }"
                  >{{ catMap[s.id][cat].score.toFixed(2) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
.ctrl-select:focus { border-color: rgba(255,255,255,0.4); }
.ctrl-select option { background: #1c2d5a; color: white; }

.tbl {
  border-collapse: collapse;
  white-space: nowrap;
  font-size: 12px;
}

/* rank列ヘッダー */
.tbl-rank-head {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fafbff;
  border-right: 2px solid #dde2ef;
  border-bottom: 2px solid #dde2ef;
  padding: 6px 10px;
  text-align: center;
  font-size: 10px;
  color: #9aaac8;
  font-weight: 600;
  min-width: 28px;
}

/* カテゴリ列ヘッダー */
.tbl-cat-head {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fafbff;
  border-right: 2px solid #dde2ef;
  border-bottom: 2px solid #dde2ef;
  padding: 6px 14px;
  text-align: left;
  font-size: 10px;
  color: #9aaac8;
  font-weight: 600;
  min-width: 140px;
}

/* 議員列ヘッダー */
.tbl-col-head {
  border-bottom: 2px solid #dde2ef;
  border-right: 1px solid #eef0f8;
  padding: 5px 4px 4px;
  text-align: center;
  min-width: 66px;
  max-width: 74px;
  background: #fafbff;
  vertical-align: bottom;
}

.tbl-name {
  font-size: 11px;
  font-weight: 600;
  color: #1c2d5a;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 66px;
}
.tbl-role {
  font-size: 9px;
  color: #b0bcd4;
  margin-top: 1px;
}

/* rank番号セル */
.tbl-rank-cell {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fafbff;
  border-right: 2px solid #dde2ef;
  border-bottom: 1px solid #eef0f8;
  padding: 0 8px;
  text-align: center;
  font-size: 10px;
  color: #c8d0e0;
  font-weight: 600;
}

/* カテゴリ名セル */
.tbl-cat-cell {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fafbff;
  border-right: 2px solid #dde2ef;
  border-bottom: 1px solid #eef0f8;
  padding: 5px 14px;
  font-size: 11px;
  color: #3a4a72;
  font-weight: 500;
}

/* データセル */
.tbl-cell {
  border-right: 1px solid rgba(180,195,225,0.25);
  border-bottom: 1px solid rgba(180,195,225,0.25);
  padding: 0 3px;
  text-align: center;
  height: 26px;
  min-width: 66px;
  max-width: 74px;
  overflow: hidden;
}
.tbl-cell span {
  font-size: 11px;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 26px;
}

.tbl-cell--cat {
  height: 30px;
}
.tbl-cell--cat span { line-height: 30px; }
</style>
