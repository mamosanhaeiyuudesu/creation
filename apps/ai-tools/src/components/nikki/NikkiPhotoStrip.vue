<template>
  <div v-if="photos.length" class="grid grid-cols-3 gap-1.5">
    <button
      v-for="(id, i) in photos"
      :key="id"
      class="block aspect-square overflow-hidden rounded-lg border border-[var(--nk-line)] bg-[var(--nk-indigo-soft)] p-0"
      :class="size === 'sm' ? 'max-w-[72px]' : ''"
      :aria-label="`写真${i + 1}を拡大`"
      @click="openId = id"
    >
      <img :src="src(id)" alt="" loading="lazy" class="w-full h-full object-cover" />
    </button>
  </div>

  <!-- 拡大表示。ここから消せる -->
  <Teleport to="body">
    <div
      v-if="openId"
      class="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
      @click.self="openId = ''"
    >
      <img :src="src(openId)" alt="" class="max-w-full max-h-[80vh] object-contain rounded-lg" />
      <div class="flex items-center gap-2">
        <button class="nk-btn-ghost !bg-white" @click="openId = ''">閉じる</button>
        <button class="nk-btn-ghost !bg-white" :disabled="busy" @click="onRemove">この写真を消す</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  photos: string[]
  busy?: boolean
  size?: 'sm' | 'md'
}>()

const emit = defineEmits<{ remove: [id: string] }>()

const openId = ref('')
const src = (id: string) => `/api/nikki/photos/${id}`

const onRemove = () => {
  if (!confirm('この写真を消します。よろしいですか？')) return
  emit('remove', openId.value)
  openId.value = ''
}
</script>
