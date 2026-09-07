<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[300]" @click.self="close">
      <div class="w-full max-w-[440px] kk-card p-6">
        <h2 class="kk-display text-[18px] mb-1">Googleドライブの設定</h2>
        <p class="text-[11.5px] text-[var(--kk-ink-faint)] mb-4 leading-relaxed">
          連携すると、PDFでダウンロードするたびに指定したフォルダへ自分のGoogleドライブにも自動でコピーを保存できます
          （連携しなくてもPDFダウンロード自体は今まで通り使えます）。
        </p>

        <p v-if="errorMessage" class="text-[12.5px] mb-3" style="color: var(--kk-danger)">{{ errorMessage }}</p>

        <div v-if="loading" class="text-[12.5px] text-[var(--kk-ink-faint)] py-6 text-center">読み込み中…</div>

        <template v-else>
          <p v-if="connected && needsReconnect" class="text-[12px] text-[var(--kk-ink-soft)] mb-3 leading-relaxed">
            以前の連携は権限が古くなっています。お手数ですが再連携してください（フォルダの再設定は不要です）。
          </p>

          <a
            v-if="!connected || needsReconnect"
            href="/api/kikigaki/google/connect"
            class="kk-btn whitespace-nowrap inline-block"
          >{{ needsReconnect ? '再連携する' : '連携する' }}</a>

          <div v-else class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="driveFolderInput"
                class="kk-input flex-1 min-w-[200px]"
                placeholder="保存先フォルダの共有リンクまたはIDを貼り付け"
                :disabled="savingFolder"
              >
              <button class="kk-btn-ghost shrink-0" :disabled="savingFolder || !driveFolderInput.trim()" @click="saveDriveFolder">
                {{ savingFolder ? '保存中…' : 'フォルダを設定' }}
              </button>
            </div>
            <p v-if="driveFolderId" class="text-[11px] text-[var(--kk-ink-faint)]">
              現在の保存先: <a :href="driveFolderUrl" target="_blank" rel="noopener" class="underline underline-offset-2">フォルダを開く</a>
            </p>
            <p v-else class="text-[11px] text-[var(--kk-ink-faint)]">
              まだフォルダが設定されていません。設定するまでPDFはドライブに保存されません。
            </p>
            <button class="kk-btn-ghost whitespace-nowrap" @click="disconnectGoogle">連携を解除</button>
          </div>
        </template>

        <p class="mt-4 text-[11px] text-[var(--kk-ink-faint)]">
          <NuxtLink to="/privacy" class="underline underline-offset-2 hover:text-[var(--kk-ink-soft)]">プライバシーポリシー</NuxtLink>
        </p>

        <button class="kk-btn-ghost mt-4 w-full justify-center" @click="close">閉じる</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const loading = ref(true)
const connected = ref(false)
const needsReconnect = ref(false)
const driveFolderId = ref('')
const driveFolderInput = ref('')
const driveFolderUrl = computed(() =>
  driveFolderId.value ? `https://drive.google.com/drive/folders/${driveFolderId.value}` : ''
)
const savingFolder = ref(false)
const errorMessage = ref('')

function apiMessage(e: any, fallback: string): string {
  return e?.data?.message || e?.data?.statusMessage || e?.message || fallback
}

async function loadStatus() {
  loading.value = true
  errorMessage.value = ''
  try {
    const status = await $fetch<{
      connected: boolean
      needsReconnect?: boolean
      driveFolderId?: string
      driveFolderInput?: string
    }>('/api/kikigaki/google/status')
    connected.value = status.connected
    needsReconnect.value = !!status.needsReconnect
    driveFolderId.value = status.driveFolderId ?? ''
    driveFolderInput.value = status.driveFolderInput ?? ''
  } catch {
    connected.value = false
  }
  loading.value = false
}

async function saveDriveFolder() {
  const input = driveFolderInput.value.trim()
  if (!input) return
  savingFolder.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ folderId: string; folderInput: string }>('/api/kikigaki/google/folder', {
      method: 'POST',
      body: { folderInput: input },
    })
    driveFolderId.value = res.folderId
    driveFolderInput.value = res.folderInput
  } catch (e: any) {
    errorMessage.value = apiMessage(e, 'フォルダの設定に失敗しました（リンクの形式を確認してください）')
  }
  savingFolder.value = false
}

async function disconnectGoogle() {
  if (!confirm('Googleドライブとの連携を解除しますか？（保存済みのPDFは削除されません）')) return
  await $fetch('/api/kikigaki/google/disconnect', { method: 'POST' })
  connected.value = false
  needsReconnect.value = false
  driveFolderId.value = ''
  driveFolderInput.value = ''
}

function close() {
  emit('update:show', false)
}

watch(
  () => props.show,
  (v) => {
    if (v) loadStatus()
  }
)
</script>
