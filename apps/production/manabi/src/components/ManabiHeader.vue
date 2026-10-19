<template>
  <!-- 解く画面・みんなの問題で共通のヘッダー。左は文字つきの「トップへ」、中央と右は画面ごとに差し込む -->
  <header class="shrink-0 flex items-center gap-2 px-3 sm:px-5 h-14">
    <NuxtLink to="/" class="mb-back" aria-label="マナビーのトップへ戻る">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      <span>トップへ</span>
    </NuxtLink>
    <div class="flex-1 min-w-0 flex items-center">
      <slot />
    </div>
    <slot name="right" />
  </header>
</template>
