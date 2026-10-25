<template>
  <div>
    <label class="pl-label" :for="forId">{{ label }}</label>
    <p v-if="help" class="pf-help">{{ help }}</p>
    <div class="mt-1.5"><slot /></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  /** 説明文。クリックしなくても常に出す */
  help?: string
  forId?: string
}>()
</script>

<style scoped>
.pf-help {
  font-size: 12px;
  line-height: 1.65;
  color: var(--pl-ink-faint);
  margin-top: 0.1rem;
}
</style>
