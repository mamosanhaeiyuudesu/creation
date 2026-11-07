<script setup lang="ts">
useHead({
  link: [
    { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: '/icon-farm-log.svg' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-farm-log.png' },
  ],
})
</script>

<template>
  <div class="farm-log-app min-h-screen bg-gray-950 text-gray-100">
    <slot />
  </div>
</template>
