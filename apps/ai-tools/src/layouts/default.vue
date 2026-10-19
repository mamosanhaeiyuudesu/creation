<template>
  <div class="flex flex-col h-screen">
    <div class="flex flex-1 relative min-w-0">
      <main class="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style>
/* 中身は各ページが持つ。ヘッダーを外したあとも style ブロックを残している */
</style>
