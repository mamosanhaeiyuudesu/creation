<template>
  <div class="relative" ref="containerRef">
    <button
      class="flex items-center p-1.5 rounded-xl border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.10] hover:border-white/[0.20] transition-all duration-150 cursor-pointer"
      @click="open = !open"
    >
      <span
        class="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
        :style="{ background: `linear-gradient(135deg, ${accentFrom ?? '#38bdf8'}, ${accentTo ?? '#6366f1'})` }"
      >{{ initial }}</span>
    </button>

    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 w-44 bg-[#1a2436] border border-white/[0.10] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50 origin-top-right"
      >
        <div class="px-3 py-2.5 border-b border-white/[0.06]">
          <p class="m-0 text-[11px] text-slate-500 truncate">{{ username }}</p>
        </div>
        <div class="py-1">
          <button
            v-for="item in items"
            :key="item.label"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-400 hover:bg-white/[0.06] hover:text-slate-50 transition-colors text-left cursor-pointer bg-transparent border-none font-[inherit]"
            @click="handleItem(item)"
          >
            <span class="text-sm w-4 text-center flex-shrink-0">{{ item.icon }}</span>
            {{ item.label }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface MenuItem {
  icon: string
  label: string
  action: () => void
}

const props = defineProps<{
  username: string
  items: MenuItem[]
  accentFrom?: string
  accentTo?: string
}>()

const open = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const initial = computed(() => props.username.charAt(0).toUpperCase())

const handleItem = (item: MenuItem) => {
  item.action()
  open.value = false
}

const handleOutsideClick = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))
</script>
