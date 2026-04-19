<template>
  <div class="flex" :class="role === 'user' ? 'justify-end' : 'justify-start'">
    <div
      class="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
      :class="role === 'user'
        ? 'bg-gradient-to-br from-rose-500/80 to-indigo-500/80 text-white rounded-br-sm'
        : 'bg-white/[0.06] border border-white/[0.08] text-slate-100 rounded-bl-sm'"
    >
      <span v-if="content">{{ content }}</span>
      <span v-else class="inline-flex items-center gap-1 text-slate-400">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style="animation-delay: 0ms" />
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style="animation-delay: 150ms" />
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style="animation-delay: 300ms" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  role: 'user' | 'assistant'
  content: string
}>()
</script>
