<template>
  <Modal width="480px" @close="emit('close')">
    <h3 class="genogram-modal-title">家族構成をAIに伝える</h3>

    <textarea
      v-model="text"
      class="genogram-ai-textarea"
      rows="6"
      :disabled="loading"
      placeholder="例: 父の太郎(1950年生まれ、農業、糖尿病持ち)と母の恵子は1978年に結婚していて仲が悪い。娘の花子は母とべったり。"
      @keydown.meta.enter="emit('submit')"
      @keydown.ctrl.enter="emit('submit')"
    />

    <div class="genogram-modal-actions genogram-modal-actions-between">
      <span class="genogram-ai-hint">Cmd/Ctrl+Enterでも送信できます</span>
      <div class="genogram-modal-actions">
        <button type="button" class="genogram-modal-cancel" @click="emit('close')">閉じる</button>
        <button type="button" class="genogram-modal-save" :disabled="loading || !text.trim()" @click="emit('submit')">
          {{ loading ? '解釈中…' : '送信' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="genogram-ai-error">{{ error }}</p>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '~/components/Modal.vue'

const text = defineModel<string>({ required: true })
defineProps<{ loading: boolean; error: string }>()
const emit = defineEmits<{ submit: []; close: [] }>()
</script>
