<template>
  <div class="therapist-layout">
    <slot />
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
</script>

<style>
/* Vuetify のグローバルスタイルをリセット */
.therapist-layout,
.therapist-layout ~ * {
  all: initial;
}


.v-application:has(.therapist-layout) {
  background: transparent !important;
}
</style>
