<template>
  <div class="min-h-full flex flex-col items-center py-12 px-4">
    <h1 class="m-0 text-3xl font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
      🎮 ゲーム
    </h1>
    <p class="text-slate-500 text-sm mb-10">レトロゲームコレクション</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
      <NuxtLink
        to="/games/panel-de-pon"
        class="group no-underline bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-3 transition-all duration-200 hover:bg-white/[0.08] hover:border-emerald-400/30 hover:shadow-[0_0_24px_rgba(52,211,153,0.12)]"
      >
        <div class="text-4xl">🎴</div>
        <div>
          <h2 class="m-0 text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
            パネルでポン
          </h2>
          <p class="m-0 mt-1 text-sm text-slate-500">
            SFC版パネルでポンをブラウザで！パネルを入れ替えて3つ以上並べて消そう。
          </p>
        </div>
        <div class="flex items-center gap-2 mt-auto">
          <span class="text-xs text-emerald-400/70 font-medium">パズル</span>
          <span class="text-slate-700">·</span>
          <span class="text-xs text-slate-500">1人用</span>
        </div>
      </NuxtLink>

      <NuxtLink
        to="/games/kenken"
        class="group no-underline bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-3 transition-all duration-200 hover:bg-white/[0.08] hover:border-emerald-400/30 hover:shadow-[0_0_24px_rgba(52,211,153,0.12)]"
      >
        <div class="text-4xl">🧠</div>
        <div>
          <h2 class="m-0 text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
            賢くなるパズル
          </h2>
          <p class="m-0 mt-1 text-sm text-slate-500">
            ケンケン（KenKen）。ナンプレ＋四則計算の最高峰パズル。暗算力と論理力を同時に鍛えよう。
          </p>
        </div>
        <div class="flex items-center gap-2 mt-auto">
          <span class="text-xs text-emerald-400/70 font-medium">計算パズル</span>
          <span class="text-slate-700">·</span>
          <span class="text-xs text-slate-500">1人用</span>
        </div>
      </NuxtLink>

      <!-- 将来のゲーム用プレースホルダー -->
      <div class="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6 flex flex-col gap-3 opacity-40">
        <div class="text-4xl">🎯</div>
        <div>
          <h2 class="m-0 text-lg font-bold text-slate-500">Coming Soon...</h2>
          <p class="m-0 mt-1 text-sm text-slate-600">次のゲームが待っています</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'ゲーム' })
</script>
