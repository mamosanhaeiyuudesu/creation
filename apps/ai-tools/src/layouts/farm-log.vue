<script setup lang="ts">
useHead({
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌿</text></svg>` },
  ],
})
</script>

<template>
  <div class="farm-log-app min-h-screen bg-gray-950 text-gray-100">
    <slot />
  </div>
</template>
