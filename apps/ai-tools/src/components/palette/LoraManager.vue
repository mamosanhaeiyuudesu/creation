<template>
  <div class="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4" @click.self="$emit('close')">
    <div class="w-full sm:max-w-[560px] max-h-[92vh] overflow-y-auto bg-[var(--pl-card)] rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl">
      <div class="flex items-center justify-between mb-3">
        <h2 class="pl-display text-[22px]">LoRA を管理</h2>
        <button class="pl-btn-ghost" @click="$emit('close')">閉じる</button>
      </div>

      <!-- 保存済み -->
      <ul v-if="loras.length" class="space-y-2 mb-4">
        <li v-for="l in loras" :key="l.id" class="rounded-xl border border-[var(--pl-line)] p-3 bg-white">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-black text-[14.5px] truncate">{{ l.name }}</p>
              <p class="text-[11.5px] text-[var(--pl-ink-soft)] break-all line-clamp-2">{{ l.url }}</p>
              <p class="text-[12px] mt-1 text-[var(--pl-ink-soft)]">
                強さ {{ l.scale }}<span v-if="l.triggerWord"> ／ トリガー: <b class="text-[var(--pl-ink)]">{{ l.triggerWord }}</b></span>
              </p>
              <p v-if="l.memo" class="text-[12px] mt-0.5 text-[var(--pl-ink-soft)]">{{ l.memo }}</p>
            </div>
            <div class="flex gap-1.5 shrink-0">
              <button class="pl-btn-ghost" @click="edit(l)">編集</button>
              <button class="pl-btn-ghost" @click="remove(l)">削除</button>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="text-[13px] text-[var(--pl-ink-soft)] mb-4">まだ LoRA が保存されていません。下のフォームから追加できます。</p>

      <!-- フォーム -->
      <form class="space-y-3 border-t border-[var(--pl-line)] pt-4" @submit.prevent="save">
        <h3 class="font-black text-[14px]">{{ editingId ? 'LoRA を編集' : 'LoRA を追加' }}</h3>
        <div>
          <label class="pl-label mb-1" for="lm-name">名前</label>
          <input id="lm-name" v-model="form.name" class="pl-input" placeholder="例: 水彩タッチ v2" maxlength="60" />
        </div>
        <div>
          <label class="pl-label mb-1" for="lm-url">重みファイルの URL</label>
          <input id="lm-url" v-model="form.url" class="pl-input" placeholder="https://…/xxx.safetensors" inputmode="url" />
          <p class="text-[11.5px] text-[var(--pl-ink-soft)] mt-1">fal.ai が取りに行ける公開 URL（Hugging Face の resolve URL や fal で学習した結果の URL など）。</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="pl-label mb-1" for="lm-scale">既定の強さ（0〜4）</label>
            <input id="lm-scale" v-model.number="form.scale" type="number" min="0" max="4" step="0.05" class="pl-input" />
          </div>
          <div>
            <label class="pl-label mb-1" for="lm-trigger">トリガーワード</label>
            <input id="lm-trigger" v-model="form.triggerWord" class="pl-input" placeholder="あれば" maxlength="200" />
          </div>
        </div>
        <div>
          <label class="pl-label mb-1" for="lm-memo">メモ</label>
          <input id="lm-memo" v-model="form.memo" class="pl-input" placeholder="どんな絵が出るか など" maxlength="500" />
        </div>
        <p v-if="error" class="text-[13px] text-[var(--pl-vermilion-deep)]">{{ error }}</p>
        <div class="flex gap-2">
          <button class="pl-btn" type="submit" :disabled="busy">{{ editingId ? '更新する' : '保存する' }}</button>
          <button v-if="editingId" class="pl-btn-ghost !h-[2.6rem]" type="button" @click="reset">編集をやめる</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { PaletteLora } from '~/types/palette'

defineProps<{ loras: PaletteLora[] }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'changed'): void }>()

const blank = () => ({ name: '', url: '', scale: 1, triggerWord: '', memo: '' })
const form = reactive(blank())
const editingId = ref('')
const busy = ref(false)
const error = ref('')

function reset() {
  Object.assign(form, blank())
  editingId.value = ''
  error.value = ''
}

function edit(l: PaletteLora) {
  editingId.value = l.id
  Object.assign(form, { name: l.name, url: l.url, scale: l.scale, triggerWord: l.triggerWord, memo: l.memo })
  error.value = ''
}

async function save() {
  error.value = ''
  busy.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/palette/loras/${editingId.value}`, { method: 'PUT', body: { ...form } })
    } else {
      await $fetch('/api/palette/loras', { method: 'POST', body: { ...form } })
    }
    reset()
    emit('changed')
  } catch (e: any) {
    error.value = e?.data?.message || e?.data?.statusMessage || '保存に失敗しました'
  } finally {
    busy.value = false
  }
}

async function remove(l: PaletteLora) {
  if (!confirm(`「${l.name}」を削除しますか？`)) return
  try {
    await $fetch(`/api/palette/loras/${l.id}`, { method: 'DELETE' })
    if (editingId.value === l.id) reset()
    emit('changed')
  } catch (e: any) {
    error.value = e?.data?.message || '削除に失敗しました'
  }
}
</script>
