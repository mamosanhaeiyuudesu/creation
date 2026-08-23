<template>
  <!--
    海・沖縄モチーフの小さなアイコン。
    塗りは currentColor なので、置いた場所の color でそのまま色が決まる。
    装飾なので aria-hidden。意味は隣の見出しテキストが持つ。
  -->
  <svg
    class="kaito-icon"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    aria-hidden="true"
    focusable="false"
  >
    <!-- 波 -->
    <g
      v-if="name === 'wave'"
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      stroke-linecap="round"
    >
      <path d="M2.5 9.5c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2" />
      <path d="M2.5 15c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2" />
    </g>

    <!-- 貝殻 -->
    <g v-else-if="name === 'shell'">
      <path
        d="M12 21.2 3.5 9.6A10.6 10.6 0 0 1 12 5a10.6 10.6 0 0 1 8.5 4.6L12 21.2Z"
        fill="currentColor"
        opacity=".22"
      />
      <path
        d="M12 21.2 3.5 9.6A10.6 10.6 0 0 1 12 5a10.6 10.6 0 0 1 8.5 4.6L12 21.2Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
      <path
        d="M12 6.2v13M7.6 7.3 10.3 19M16.4 7.3 13.7 19"
        fill="none"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
        opacity=".65"
      />
    </g>

    <!-- ハイビスカス -->
    <g v-else-if="name === 'hibiscus'">
      <g fill="currentColor" opacity=".3">
        <circle cx="12" cy="6.9" r="3.7" />
        <circle cx="17.2" cy="10.7" r="3.7" />
        <circle cx="15.2" cy="16.9" r="3.7" />
        <circle cx="8.8" cy="16.9" r="3.7" />
        <circle cx="6.8" cy="10.7" r="3.7" />
      </g>
      <g fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="6.9" r="3.7" />
        <circle cx="17.2" cy="10.7" r="3.7" />
        <circle cx="15.2" cy="16.9" r="3.7" />
        <circle cx="8.8" cy="16.9" r="3.7" />
        <circle cx="6.8" cy="10.7" r="3.7" />
      </g>
      <circle cx="12" cy="12" r="2.4" fill="var(--color-accent, #e8c4a0)" />
    </g>

    <!-- ヒトデ -->
    <g v-else-if="name === 'starfish'">
      <path
        d="M12 3.3c.5 0 1 .3 1.2.8l1.9 4.2 4.6.5c1.2.1 1.6 1.6.7 2.3l-3.4 3 1 4.5c.2 1.1-1 2-2 1.4L12 17.6l-4 2.4c-1 .6-2.2-.3-2-1.4l1-4.5-3.4-3c-.9-.7-.5-2.2.7-2.3l4.6-.5 1.9-4.2c.2-.5.7-.8 1.2-.8Z"
        fill="currentColor"
        opacity=".26"
      />
      <path
        d="M12 3.3c.5 0 1 .3 1.2.8l1.9 4.2 4.6.5c1.2.1 1.6 1.6.7 2.3l-3.4 3 1 4.5c.2 1.1-1 2-2 1.4L12 17.6l-4 2.4c-1 .6-2.2-.3-2-1.4l1-4.5-3.4-3c-.9-.7-.5-2.2.7-2.3l4.6-.5 1.9-4.2c.2-.5.7-.8 1.2-.8Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
      <g fill="currentColor" opacity=".55">
        <circle cx="12" cy="10.4" r=".95" />
        <circle cx="10.3" cy="13.6" r=".8" />
        <circle cx="13.7" cy="13.6" r=".8" />
      </g>
    </g>

    <!-- 熱帯魚 -->
    <g v-else-if="name === 'fish'">
      <path
        d="M13.7 6.2c4 0 6.9 2.9 7.7 5.2.2.4.2.8 0 1.2-.8 2.3-3.7 5.2-7.7 5.2-3.3 0-5.9-1.8-7.3-4l-2.6 2.3c-.6.5-1.5.1-1.5-.7V8.6c0-.8.9-1.2 1.5-.7l2.6 2.3c1.4-2.2 4-4 7.3-4Z"
        fill="currentColor"
        opacity=".26"
      />
      <path
        d="M13.7 6.2c4 0 6.9 2.9 7.7 5.2.2.4.2.8 0 1.2-.8 2.3-3.7 5.2-7.7 5.2-3.3 0-5.9-1.8-7.3-4l-2.6 2.3c-.6.5-1.5.1-1.5-.7V8.6c0-.8.9-1.2 1.5-.7l2.6 2.3c1.4-2.2 4-4 7.3-4Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
      <circle cx="16.8" cy="10.9" r="1.05" fill="currentColor" />
    </g>

    <!-- 太陽 -->
    <g v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4.6" fill="currentColor" opacity=".26" />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="1.7" />
      <path
        d="M12 1.9v2.3M12 19.8v2.3M1.9 12h2.3M19.8 12h2.3M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    </g>

    <!-- ヤシの木 -->
    <g v-else-if="name === 'palm'">
      <path
        d="M11.4 9.6c.5 4-.2 8-1.9 11.9"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
      <path
        d="M11.6 8.6C9.9 6.4 6.9 5.9 4.4 7.6M11.6 8.6c2-2 5-2.2 7.3-.3M11.6 8.6C9.8 7.5 6.9 8.3 5.3 11M11.6 8.6c2.3-.6 4.9.6 6 3.1"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
      <circle cx="11.6" cy="8.4" r="1.5" fill="currentColor" opacity=".55" />
    </g>

    <!-- 浮き輪 -->
    <g v-else-if="name === 'ring'">
      <circle cx="12" cy="12" r="8.4" fill="currentColor" opacity=".22" />
      <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.7" />
      <circle cx="12" cy="12" r="3.3" fill="none" stroke="currentColor" stroke-width="1.7" />
      <path
        d="M12 3.6v4.9M12 15.3v5.1M3.6 12h4.9M15.3 12h5.1"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        opacity=".7"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
type IconName = 'wave' | 'shell' | 'hibiscus' | 'starfish' | 'fish' | 'sun' | 'palm' | 'ring'

defineProps<{ name: IconName }>()
</script>
