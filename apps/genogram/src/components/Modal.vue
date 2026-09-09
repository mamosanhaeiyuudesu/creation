<template>
  <div class="genogram-modal-backdrop" @click.self="emit('close')">
    <div class="genogram-modal" role="dialog" aria-modal="true">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ width?: string }>(), { width: '420px' })
const emit = defineEmits<{ close: [] }>()
</script>

<style scoped>
.genogram-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.genogram-modal {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  width: min(v-bind(width), 100%);
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}
</style>
