<template>
  <div class="min-h-screen flex items-start justify-center px-4 pt-6 pb-4 bg-slate-950 text-slate-50">
    <main class="w-[min(1100px,100%)] grid gap-5">
      <header class="text-center">
        <h1 class="m-0 text-[clamp(24px,5vw,36px)] font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">
          Homepages
        </h1>
        <p class="mt-1 mb-0 text-slate-400 text-sm">ホームページ一覧（ローカル開発用）</p>
      </header>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <a
          v-for="page in pages"
          :key="page.url"
          :href="page.url"
          class="flex flex-col items-center text-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-5 no-underline text-inherit transition-all duration-200 hover:border-sky-400/40 hover:bg-white/[0.07] hover:-translate-y-0.5"
        >
          <div class="text-4xl">{{ page.icon }}</div>
          <h2 class="m-0 text-base text-slate-50">{{ page.name }}</h2>
          <p class="m-0 text-xs text-slate-400">{{ page.desc }}</p>
          <span class="text-[11px] text-sky-400/80 font-mono">:{{ page.url.split(':').pop() }}</span>
        </a>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>`
    }
  ]
})

// 上の5つ（先頭行）を優先表示。説明は20文字程度
const pages = [
  { url: 'http://localhost:3002', icon: '🛠️', name: 'prototyper', desc: 'ヒアリング×高速プロトタイプの相談窓口' },
  { url: 'http://localhost:3011', icon: '📊', name: 'data-vis', desc: 'データ可視化の受託制作' },
  { url: 'http://localhost:3003', icon: '🧠', name: 'shugorin', desc: '親子問題専門のカウンセリング' },
  { url: 'http://localhost:3004', icon: '🌊', name: 'kaito', desc: 'セラピスト月ノ瀬 直のページ' },
  { url: 'http://localhost:3007', icon: '🌸', name: '晴レルヤ鍼灸院', desc: '内臓鍼灸・ソフトカイロ矯正' },
  { url: 'http://localhost:3012', icon: '📖', name: '島のパパ', desc: 'インタビューで自伝本をつくる' },
  { url: 'http://localhost:3005', icon: '🤝', name: 'AI Consultant', desc: 'AIと人間の協調を考える' },
  { url: 'http://localhost:3006', icon: '✍️', name: 'sakubun', desc: '本当の思いを綴る「心の作文」' },
  { url: 'http://localhost:3008', icon: '🧬', name: 'genogram', desc: 'ジェノグラム作成ツール' },
]
</script>
