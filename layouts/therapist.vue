<template>
  <div class="therapist-layout">
    <slot />
  </div>
</template>

<style>
/* Vuetify のグローバルスタイルをリセット */
.therapist-layout,
.therapist-layout ~ * {
  all: initial;
}

body:has(.therapist-layout) {
  background: initial !important;
  color: initial !important;
  font-family: initial !important;
}

.v-application:has(.therapist-layout) {
  background: transparent !important;
}
</style>
