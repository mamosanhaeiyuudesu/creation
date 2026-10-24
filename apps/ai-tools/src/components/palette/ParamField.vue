<template>
  <div>
    <div class="flex items-center gap-1.5 mb-1">
      <label class="pl-label" :for="forId">{{ label }}</label>
      <button
        type="button"
        class="pf-help"
        :class="{ 'pf-help--on': open }"
        :aria-expanded="open"
        :aria-label="`${label}の説明`"
        @click="open = !open"
      >?</button>
    </div>
    <p v-if="open" class="pf-text">{{ help }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  label: string
  help: string
  forId?: string
}>()

const open = ref(false)
</script>

<style scoped>
.pf-help {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  color: var(--pl-teal);
  border: 1.5px solid var(--pl-teal);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pf-help--on { background: var(--pl-teal); color: #fff; }
.pf-text {
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--pl-ink-soft);
  background: var(--pl-paper-2);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  margin-bottom: 0.5rem;
}
</style>
