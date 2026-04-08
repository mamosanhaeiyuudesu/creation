<template>
  <div class="min-h-screen flex items-start justify-center px-4 pt-6 pb-4">
    <main class="w-[min(520px,100%)] grid gap-5">
      <header class="text-center">
        <h1 class="m-0 text-[clamp(24px,5vw,36px)] font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">
          Homepages
        </h1>
        <p class="mt-1 mb-0 text-slate-400 text-sm">ホームページ一覧</p>
      </header>

      <div class="grid gap-2">
        <NuxtLink
          v-for="page in pages"
          :key="page.path"
          :to="page.path"
          class="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 no-underline text-inherit transition-all duration-200 hover:border-sky-400/40 hover:bg-white/[0.07] hover:-translate-y-0.5"
        >
          <div class="text-2xl flex-shrink-0">{{ page.icon }}</div>
          <div>
            <h2 class="m-0 mb-0.5 text-base text-slate-50">{{ page.name }}</h2>
            <p class="m-0 text-xs text-slate-400">{{ page.desc }}</p>
          </div>
        </NuxtLink>
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

const pages = [
  { path: '/homepages/mamorin', icon: '🌿', name: 'mamorin', desc: 'カウンセリング & 感情フォーカス・セラピー' },
  { path: '/homepages/kaito', icon: '🌊', name: 'kaito', desc: 'セラピスト向けマーケティング（kaito）' },
  { path: '/homepages/prototyper', icon: '🛠️', name: 'Prototyper', desc: 'データ可視化・プロトタイプ開発の相談窓口' },
  { path: '/homepages/ai-consultant', icon: '🤝', name: 'AI Consultant', desc: 'AIと人間の協調を、一緒に考える。' },
]
</script>
