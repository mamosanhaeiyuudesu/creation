<template>
  <div class="sk-layout">
    <slot />
  </div>
</template>

<script setup lang="ts">
</script>

<style>
@import '~/assets/css/sakubun.css';

.sk-layout,
.sk-layout ~ * {
  all: initial;
}

.sk-layout {
  font-family: 'Noto Serif JP', 'Georgia', serif;
  background-color: #faf9f6;
  color: #1e1208;
  min-height: 100vh;
}
</style>
