<template>
  <div class="relative w-full rounded-2xl overflow-hidden border border-[var(--ip-line)] bg-[#0a0f14]" :style="{ height }">
    <ClientOnly>
      <model-viewer
        :src="src"
        :alt="alt"
        camera-controls
        touch-action="pan-y"
        :auto-rotate="autoRotate"
        auto-rotate-delay="0"
        rotation-per-second="18deg"
        interaction-prompt="none"
        shadow-intensity="1"
        exposure="1.05"
        environment-image="neutral"
        tone-mapping="neutral"
        style="width:100%;height:100%;background:#0a0f14;--poster-color:transparent"
      />
      <template #fallback>
        <div class="absolute inset-0 grid place-items-center text-[var(--ip-ink-faint)] text-[13px]">
          3Dビューを読み込み中…
        </div>
      </template>
    </ClientOnly>

    <!-- 「これで作れる」と誤解されないよう、ビューには常に「イメージ図」を表示（仕様§7）-->
    <div class="absolute top-2.5 left-2.5 pointer-events-none select-none">
      <span class="text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full bg-black/55 backdrop-blur text-[var(--ip-accent-soft)] border border-[var(--ip-line)]">
        イメージ図（寸法は目安）
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ src: string; alt?: string; height?: string; autoRotate?: boolean }>(),
  { alt: '生成された3Dイメージ', height: '460px', autoRotate: true }
)
</script>
