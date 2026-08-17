<template>
  <div class="min-h-full px-4 sm:px-8 py-10 sm:py-14">
    <div class="max-w-[1100px] mx-auto">
      <header class="mb-10 sm:mb-14">
        <h1 class="m-0 text-[clamp(28px,6vw,44px)] font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">
          AI Tools
        </h1>
        <p class="mt-2 mb-0 text-slate-400 text-sm sm:text-base">
          これまでに作ったツールの一覧です。全 {{ toolCount }} 種。
        </p>
      </header>

      <section v-for="section in sections" :key="section.title" class="mb-12 sm:mb-16 last:mb-0">
        <div class="flex items-baseline gap-3 mb-4 pb-3 border-b border-white/[0.08]">
          <h2 :class="['m-0 text-lg sm:text-xl font-bold', accents[section.accent].heading]">
            {{ section.title }}
          </h2>
          <p class="m-0 text-xs sm:text-sm text-slate-500">{{ section.lead }}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <NuxtLink
            v-for="tool in section.tools"
            :key="tool.path"
            :to="tool.path"
            :class="[
              'group no-underline rounded-2xl border p-5 flex gap-4 transition-all duration-200 hover:-translate-y-0.5',
              section.accent === 'slate'
                ? 'bg-white/[0.02] border-white/[0.05] opacity-70 hover:opacity-100'
                : 'bg-white/[0.04] border-white/[0.08]',
              accents[section.accent].card,
            ]"
          >
            <div class="text-3xl leading-none flex-shrink-0 emoji">{{ tool.icon }}</div>
            <div class="min-w-0">
              <h3 :class="['m-0 text-base font-bold text-slate-100 transition-colors', accents[section.accent].name]">
                {{ tool.name }}
              </h3>
              <p class="m-0 mt-1 text-[13px] leading-relaxed text-slate-400">{{ tool.desc }}</p>
              <div v-if="tool.tags?.length" class="flex flex-wrap gap-1.5 mt-2.5">
                <span
                  v-for="tag in tool.tags"
                  :key="tag"
                  :class="['text-[11px] px-2 py-0.5 rounded-full border', accents[section.accent].tag]"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Accent = 'sky' | 'amber' | 'emerald' | 'slate'

type Tool = {
  path: string
  icon: string
  name: string
  desc: string
  tags?: string[]
}

type Section = {
  title: string
  lead: string
  accent: Accent
  tools: Tool[]
}

// Tailwind は動的に組み立てた文字列を検出できないので、クラスは完全な形で持つ
const accents: Record<Accent, { heading: string; card: string; name: string; tag: string }> = {
  sky: {
    heading: 'text-sky-300',
    card: 'hover:bg-white/[0.07] hover:border-sky-400/40 hover:shadow-[0_0_24px_rgba(56,189,248,0.12)]',
    name: 'group-hover:text-sky-300',
    tag: 'text-sky-300/80 bg-sky-400/[0.08] border-sky-400/20',
  },
  amber: {
    heading: 'text-amber-300',
    card: 'hover:bg-white/[0.07] hover:border-amber-400/40 hover:shadow-[0_0_24px_rgba(251,191,36,0.12)]',
    name: 'group-hover:text-amber-300',
    tag: 'text-amber-300/80 bg-amber-400/[0.08] border-amber-400/20',
  },
  emerald: {
    heading: 'text-emerald-300',
    card: 'hover:bg-white/[0.07] hover:border-emerald-400/40 hover:shadow-[0_0_24px_rgba(52,211,153,0.12)]',
    name: 'group-hover:text-emerald-300',
    tag: 'text-emerald-300/80 bg-emerald-400/[0.08] border-emerald-400/20',
  },
  slate: {
    heading: 'text-slate-400',
    card: 'hover:bg-white/[0.05] hover:border-white/20',
    name: 'group-hover:text-slate-200',
    tag: 'text-slate-500 bg-white/[0.03] border-white/10',
  },
}

const sections: Section[] = [
  {
    title: '日々の道具',
    lead: '自分たちで毎日使うもの',
    accent: 'sky',
    tools: [
      { path: '/whisper', icon: '🎙️', name: 'whisper', desc: '録音や音声ファイルから文字起こし・要約・校正。Whisper / Gemini を切替可能。', tags: ['要ログイン'] },
      { path: '/hagemashi', icon: '💪', name: 'はげまし', desc: 'いまの状況を話すと、AIがはげましの言葉を書いて読み上げる。', tags: ['要ログイン', '読み上げ'] },
      { path: '/task', icon: '📋', name: 'タスクくん', desc: 'Trello の DOING / TODO / DONE を1画面に。週の使い方をAIが振り返る。', tags: ['要ログイン', 'Trello連携'] },
      { path: '/fitbit', icon: '⌚️', name: 'Fitbit', desc: '睡眠・歩数・心拍・HRV をまとめたヘルスダッシュボードと相談チャット。', tags: ['要ログイン', 'Google連携'] },
      { path: '/office', icon: '🏢', name: '勤怠', desc: '出勤・退勤の打刻と日付ごとの記録。', tags: ['要ログイン'] },
      { path: '/games', icon: '🎮', name: 'ゲーム', desc: 'パネルでポン・賢くなるパズル。息抜き用のレトロゲーム集。' },
    ],
  },
  {
    title: '誰かのために作ったアプリ',
    lead: '相談を受けて、その人の仕事や暮らしに合わせて作ったもの',
    accent: 'amber',
    tools: [
      { path: '/kaki', icon: '🌳', name: '柿の木 里親', desc: '自分の柿の木の成長写真・観察日記・応援コメントを見る。農家用の管理画面つき。', tags: ['要ログイン'] },
      { path: '/momo', icon: '🍑', name: '桃 注文管理', desc: 'SNSの会話を貼るとAIが注文を構造化。選果集計と佐川e飛伝III用CSVまで。', tags: ['要ログイン'] },
      { path: '/guesthouse', icon: '🏡', name: 'ゲストハウス案内', desc: 'お客様チャットにAIが自ら回答し、緊急時だけホストへ取り次ぐ。日記から顧客分析も。', tags: ['要ログイン', '共有リンク'] },
      { path: '/ippon', icon: '✏️', name: 'Sketch2View', desc: '紙のスケッチを撮ると、AIが形を読み解いて3Dビューにする。共有リンクで見せられる。', tags: ['要ログイン', '共有リンク'] },
      { path: '/keiko', icon: '🥋', name: 'けいこ記録', desc: '剣道の稽古をメンバーごとに記録。週・月・年でポイントを集計する。', tags: ['要ログイン'] },
      { path: '/kiroku', icon: '📝', name: 'kiroku', desc: '感情メモ。開いたらすぐ書ける入力欄ひとつ。AIの分析も採点もしない。', tags: ['端末内に保存'] },
      { path: '/life', icon: '📖', name: '人生のインタビュー', desc: 'ライフステージごとのテーマをAIと対話で深掘り。答えは本人のスプレッドシートへ。', tags: ['要ログイン', 'Google連携'] },
      { path: '/life-analyzer', icon: '🌗', name: '人生の影と光', desc: '自分について書かれた文章から、影と光のコアを図にして読み返す。', tags: ['要ログイン'] },
    ],
  },
  {
    title: 'データを見る',
    lead: '集めたデータを読めるかたちにしたもの',
    accent: 'emerald',
    tools: [
      { path: '/miyako', icon: '🏝️', name: '宮古島市議会 議事録', desc: 'キーワード×会期のヒートマップとAI解説。キーワード検索・議員別・年別の推移も。' },
      { path: '/japanese-mlb-player', icon: '⚾', name: '日本人MLB選手', desc: '打者・投手のスタッツを FanGraphs / MLB Stats から取得して一覧。' },
      { path: '/farm-log', icon: '🌿', name: '農作業ログ', desc: 'スマホのセンサーで記録した農作業の動きを可視化。' },
    ],
  },
  {
    title: '休止中',
    lead: 'いまは手を入れていないもの',
    accent: 'slate',
    tools: [
      { path: '/snapreader', icon: '📸', name: 'SnapReader', desc: '画像をアップロードしてOCR・要約・AIチャット。' },
      { path: '/marriage', icon: '💑', name: 'marriage', desc: 'ふたりの日々をムードとコメントで記録するカレンダー。', tags: ['要ログイン'] },
      { path: '/setsuyaku', icon: '💰', name: '節約', desc: '節約の記録。', tags: ['要ログイン'] },
    ],
  },
]

const toolCount = computed(() => sections.reduce((sum, s) => sum + s.tools.length, 0))

useHead({
  title: 'AI Tools',
  meta: [{ name: 'description', content: 'これまでに作ったAIツールの一覧' }],
})
</script>

<style scoped>
.emoji {
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
}
</style>
