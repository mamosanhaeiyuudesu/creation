<template>
  <Modal width="640px" @close="emit('close')">
    <h3 class="genogram-modal-title">JSON</h3>

    <textarea v-model="text" class="genogram-textarea" spellcheck="false" placeholder='{"people": [...], "unions": [...], "relations": [...]}' />

    <ul v-if="errors.length > 0" class="genogram-errors">
      <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
    </ul>

    <div class="genogram-modal-actions genogram-modal-actions-between">
      <button type="button" class="genogram-clear-btn" @click="emit('clear')">クリア</button>
      <button type="button" class="genogram-modal-cancel" @click="emit('close')">閉じる</button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '~/components/Modal.vue'

const text = defineModel<string>({ required: true })
defineProps<{ errors: string[] }>()
const emit = defineEmits<{ clear: []; close: [] }>()
</script>
