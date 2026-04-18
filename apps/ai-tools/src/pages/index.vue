<template>
  <div class="min-h-screen flex items-start justify-center px-4 pt-6 pb-4">
    <main class="w-[min(520px,100%)] grid gap-5">
      <header class="text-center">
        <h1 class="m-0 text-[clamp(24px,5vw,36px)] font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">
          AI Tools
        </h1>
        <p class="mt-1 mb-0 text-slate-400 text-sm">AIを使ったツール集</p>
      </header>

      <div class="grid gap-2">
        <NuxtLink
          v-for="tool in tools"
          :key="tool.path"
          :to="tool.path"
          class="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 no-underline text-inherit transition-all duration-200 hover:border-sky-400/40 hover:bg-white/[0.07] hover:-translate-y-0.5"
        >
          <div class="text-2xl flex-shrink-0">{{ tool.icon }}</div>
          <div>
            <h2 class="m-0 mb-0.5 text-base text-slate-50">{{ tool.name }}</h2>
            <p class="m-0 text-xs text-slate-400">{{ tool.desc }}</p>
          </div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const tools = [
  { path: '/snapreader', icon: '📸', name: 'SnapReader', desc: '画像を送って、数秒で要約' },
  { path: '/whisper', icon: '🎙️', name: 'Whisper', desc: '音声を文字に自動変換' },
  { path: '/hagemashi', icon: '💪', name: 'はげまし', desc: '話して、AIに励ましてもらおう' },
  { path: '/task', icon: '📋', name: 'タスクくん', desc: 'Trello の DOING / TODO / DONE をまとめて確認' },
]
</script>
