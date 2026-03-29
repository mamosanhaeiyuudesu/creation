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


.v-application:has(.therapist-layout) {
  background: transparent !important;
}
</style>
