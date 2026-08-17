<!--
  けいこ記録アプリのイラスト。小2・小4の子が見て楽しいように、剣道の道具と子どもを
  手描き風のSVGで用意している（外部画像を持たずに済むよう、すべてインラインで描く）。
  name で描き分ける:
    men 面 / kote 小手 / do 胴 / shinai 竹刀 / flag 紅白旗 / ashiato 足あと
    kid 面をつけた子 / swing 素振りする子 / cheer よろこぶ子
-->
<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" class="keiko-art">
    <!-- 面 -->
    <g v-if="name === 'men'">
      <path d="M32 6C20 6 12 14 12 27c0 10 3 18 6 23 2 3 7 5 14 5s12-2 14-5c3-5 6-13 6-23C52 14 44 6 32 6Z" fill="#232c4d" />
      <path d="M32 6C20 6 12 14 12 27h40C52 14 44 6 32 6Z" fill="#2c3760" />
      <rect x="19" y="15" width="26" height="25" rx="11" fill="#fbf8f0" />
      <circle cx="27" cy="25" r="2.7" fill="#23283a" />
      <circle cx="37" cy="25" r="2.7" fill="#23283a" />
      <circle cx="27.9" cy="24.1" r=".9" fill="#fff" />
      <circle cx="37.9" cy="24.1" r=".9" fill="#fff" />
      <circle cx="22.8" cy="30" r="2.3" fill="#f2a9a3" opacity=".85" />
      <circle cx="41.2" cy="30" r="2.3" fill="#f2a9a3" opacity=".85" />
      <path d="M29 31.5c1.7 2 4.3 2 6 0" stroke="#23283a" stroke-width="1.8" stroke-linecap="round" />
      <g stroke="#d8b03a" stroke-width="1.9" stroke-linecap="round" opacity=".95">
        <path d="M20 19.5h24" />
        <path d="M19.5 26.5h25" />
        <path d="M20 33.5h24" />
      </g>
    </g>

    <!-- 竹刀 -->
    <g v-else-if="name === 'shinai'" transform="rotate(-38 32 32)">
      <rect x="29.5" y="5" width="5" height="34" rx="2.5" fill="#e3bd76" />
      <path d="M32 5.5v33" stroke="#c69c4e" stroke-width=".9" opacity=".7" />
      <rect x="29" y="6" width="6" height="3" rx="1.5" fill="#f3e3c3" />
      <ellipse cx="32" cy="39.5" rx="8.5" ry="3" fill="#d8b03a" />
      <rect x="29.5" y="40" width="5" height="18" rx="2.5" fill="#5a3d26" />
      <g stroke="#8a6540" stroke-width=".8" opacity=".8">
        <path d="M29.5 45h5" />
        <path d="M29.5 50h5" />
        <path d="M29.5 55h5" />
      </g>
    </g>

    <!-- 小手 -->
    <g v-else-if="name === 'kote'" transform="rotate(-8 32 32)">
      <path d="M20.5 30h23c1.6 0 2.6 1 2.5 2.6l-1.2 19c-.1 1.8-1.3 2.8-3 2.8H22.2c-1.7 0-2.9-1-3-2.8l-1.2-19c-.1-1.6.9-2.6 2.5-2.6Z" fill="#2c3760" />
      <g stroke="#d8b03a" stroke-width="1.9" stroke-linecap="round" opacity=".95">
        <path d="M19.6 38h24.8" />
        <path d="M20.2 46h23.6" />
      </g>
      <path d="M17.6 15.5c-5 2.4-6.6 8.6-3.6 12.4 2 2.5 5.2 2.4 7.4.2Z" fill="#3a477a" />
      <path d="M32 8c8.6 0 13.8 5.4 13.8 13.2V28c0 2-1.3 3.2-3.4 3.2H21.6c-2.1 0-3.4-1.2-3.4-3.2v-6.8C18.2 13.4 23.4 8 32 8Z" fill="#3a477a" />
      <path d="M18.6 25.5h26.6" stroke="#2c3760" stroke-width="1.4" opacity=".35" />
      <path d="M26.5 12.5c3.6-1.7 7.4-1.7 11 0" stroke="#55639e" stroke-width="1.9" stroke-linecap="round" />
    </g>

    <!-- 胴 -->
    <g v-else-if="name === 'do'">
      <path d="M13 20c0-2 1-3 3-3h32c2 0 3 1 3 3l-3 17c-1 8-7 13-16 13s-15-5-16-13Z" fill="#9a5730" />
      <path d="M13 20c0-2 1-3 3-3h32c2 0 3 1 3 3l-.7 4H13.7Z" fill="#7d3f1f" />
      <g stroke="#e0c56a" stroke-width="1.6" stroke-linecap="round" opacity=".9">
        <path d="M24 27v17" />
        <path d="M32 27v19" />
        <path d="M40 27v17" />
      </g>
      <circle cx="18.5" cy="20.5" r="2.2" fill="#e0c56a" />
      <circle cx="45.5" cy="20.5" r="2.2" fill="#e0c56a" />
    </g>

    <!-- 面をつけた子 -->
    <g v-else-if="name === 'kid'">
      <path d="M22 40c-4 2-7 6-8 11" stroke="#2c3760" stroke-width="5.5" stroke-linecap="round" />
      <path d="M42 40c4 2 7 6 8 11" stroke="#2c3760" stroke-width="5.5" stroke-linecap="round" />
      <path d="M23.5 50h17l3 10H20.5Z" fill="#2c3760" />
      <path d="M23 38h18l-1 8.5c-.4 2.6-3.4 4.5-8 4.5s-7.6-1.9-8-4.5Z" fill="#9a5730" />
      <g stroke="#e0c56a" stroke-width="1.2" stroke-linecap="round">
        <path d="M28 40v9" />
        <path d="M32 40v10" />
        <path d="M36 40v9" />
      </g>
      <path d="M32 4c-9 0-14 6-14 15 0 7 2 12 4 15 1.5 2 5 3 10 3s8.5-1 10-3c2-3 4-8 4-15 0-9-5-15-14-15Z" fill="#232c4d" />
      <path d="M32 4c-9 0-14 6-14 15h28c0-9-5-15-14-15Z" fill="#2c3760" />
      <rect x="23" y="11" width="18" height="18" rx="8" fill="#fbf8f0" />
      <circle cx="28.4" cy="18.5" r="2.1" fill="#23283a" />
      <circle cx="35.6" cy="18.5" r="2.1" fill="#23283a" />
      <circle cx="29.1" cy="17.8" r=".7" fill="#fff" />
      <circle cx="36.3" cy="17.8" r=".7" fill="#fff" />
      <path d="M30 23.2c1.3 1.5 2.7 1.5 4 0" stroke="#23283a" stroke-width="1.5" stroke-linecap="round" />
      <g stroke="#d8b03a" stroke-width="1.6" stroke-linecap="round">
        <path d="M23.5 14.5h17" />
        <path d="M23 21h18" />
        <path d="M23.5 27h17" />
      </g>
    </g>

    <!-- 素振りする子 -->
    <g v-else-if="name === 'swing'">
      <path d="M13 24C16 8 34 2 52 9" stroke="#e7cf7c" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 4.5" />
      <g transform="rotate(30 42 34)">
        <rect x="40" y="4" width="4.4" height="28" rx="2.2" fill="#e3bd76" />
        <rect x="39.7" y="4.5" width="5" height="2.6" rx="1.3" fill="#f3e3c3" />
        <ellipse cx="42.2" cy="32.8" rx="6" ry="2.3" fill="#d8b03a" />
        <rect x="40" y="33.3" width="4.4" height="12" rx="2.2" fill="#5a3d26" />
      </g>
      <path d="M18 41c-4 2-6 6-7 10" stroke="#2c3760" stroke-width="5.5" stroke-linecap="round" />
      <path d="M33 40c3.5 0 5.5-1.5 6.5-4" stroke="#2c3760" stroke-width="5.5" stroke-linecap="round" />
      <path d="M18 50h16l3 10H15Z" fill="#2c3760" />
      <path d="M17.5 38h17l-1 8.5c-.4 2.6-3.2 4.5-7.5 4.5s-7.1-1.9-7.5-4.5Z" fill="#9a5730" />
      <g stroke="#e0c56a" stroke-width="1.2" stroke-linecap="round">
        <path d="M22 40v9" />
        <path d="M26 40v10" />
        <path d="M30 40v9" />
      </g>
      <path d="M26 4c-9 0-14 6-14 15 0 7 2 12 4 15 1.5 2 5 3 10 3s8.5-1 10-3c2-3 4-8 4-15 0-9-5-15-14-15Z" fill="#232c4d" />
      <path d="M26 4c-9 0-14 6-14 15h28c0-9-5-15-14-15Z" fill="#2c3760" />
      <rect x="17" y="11" width="18" height="18" rx="8" fill="#fbf8f0" />
      <circle cx="22.4" cy="18.5" r="2.1" fill="#23283a" />
      <circle cx="29.6" cy="18.5" r="2.1" fill="#23283a" />
      <circle cx="23.1" cy="17.8" r=".7" fill="#fff" />
      <circle cx="30.3" cy="17.8" r=".7" fill="#fff" />
      <path d="M24 23.4c1.3 1.4 2.7 1.4 4 0" stroke="#23283a" stroke-width="1.5" stroke-linecap="round" />
      <g stroke="#d8b03a" stroke-width="1.6" stroke-linecap="round">
        <path d="M17.5 14.5h17" />
        <path d="M17 21h18" />
        <path d="M17.5 27h17" />
      </g>
    </g>

    <!-- よろこぶ子 -->
    <g v-else-if="name === 'cheer'">
      <path d="M23 40c-4-2-6-6-6-11" stroke="#fbf8f0" stroke-width="5.5" stroke-linecap="round" />
      <path d="M41 40c4-2 6-6 6-11" stroke="#fbf8f0" stroke-width="5.5" stroke-linecap="round" />
      <circle cx="16" cy="27" r="3.4" fill="#ffd9b8" />
      <circle cx="48" cy="27" r="3.4" fill="#ffd9b8" />
      <path d="M23 50h18l3 10H20Z" fill="#2c3760" />
      <path d="M23 37h18v9c0 3-3.5 5-9 5s-9-2-9-5Z" fill="#fbf8f0" />
      <path d="M28 37l4 5 4-5" stroke="#d8d2c2" stroke-width="1.5" stroke-linejoin="round" />
      <circle cx="32" cy="21" r="14" fill="#ffd9b8" />
      <path d="M18.5 17.5c3-8 9-11.5 13.5-11.5s10.5 3.5 13.5 11.5Z" fill="#2b2f45" />
      <rect x="17" y="15.5" width="30" height="5" rx="2.5" fill="#e0524b" />
      <path d="M45.5 18h5l-1.5 5" fill="#e0524b" />
      <circle cx="27" cy="23" r="2.2" fill="#23283a" />
      <circle cx="37" cy="23" r="2.2" fill="#23283a" />
      <circle cx="27.8" cy="22.2" r=".8" fill="#fff" />
      <circle cx="37.8" cy="22.2" r=".8" fill="#fff" />
      <circle cx="22.5" cy="27" r="2.4" fill="#f2a9a3" opacity=".9" />
      <circle cx="41.5" cy="27" r="2.4" fill="#f2a9a3" opacity=".9" />
      <path d="M28.5 28c2 2.6 5 2.6 7 0" stroke="#23283a" stroke-width="1.8" stroke-linecap="round" />
    </g>

    <!-- 紅白旗 -->
    <g v-else-if="name === 'flag'">
      <g transform="rotate(-18 32 44)">
        <rect x="17" y="14" width="2.8" height="40" rx="1.4" fill="#6b4a2b" />
        <path d="M19.8 16h16l-4 6.5 4 6.5h-16Z" fill="#e0524b" />
      </g>
      <g transform="rotate(18 32 44)">
        <rect x="44.2" y="14" width="2.8" height="40" rx="1.4" fill="#6b4a2b" />
        <path d="M44.2 16h-16l4 6.5-4 6.5h16Z" fill="#fff" stroke="#c8c2b1" stroke-width="1.4" />
      </g>
    </g>

    <!-- 足あと -->
    <g v-else-if="name === 'ashiato'" fill="#2c3760" opacity=".8">
      <g transform="rotate(-14 22 26)">
        <path d="M22 18c3.6 0 5.8 2.4 5.8 5.6 0 2.4-.9 3.6-.9 5.6s.9 2.8.9 4.6c0 2.6-2.3 4.2-5.8 4.2s-5.8-1.6-5.8-4.2c0-1.8.9-2.6.9-4.6s-.9-3.2-.9-5.6c0-3.2 2.2-5.6 5.8-5.6Z" />
        <circle cx="16.8" cy="13.6" r="1.9" />
        <circle cx="20.6" cy="11.6" r="1.7" />
        <circle cx="24" cy="11.8" r="1.5" />
        <circle cx="26.8" cy="13.6" r="1.3" />
      </g>
      <g transform="rotate(12 41 42)">
        <path d="M41 34c3.6 0 5.8 2.4 5.8 5.6 0 2.4-.9 3.6-.9 5.6s.9 2.8.9 4.6c0 2.6-2.3 4.2-5.8 4.2s-5.8-1.6-5.8-4.2c0-1.8.9-2.6.9-4.6s-.9-3.2-.9-5.6c0-3.2 2.2-5.6 5.8-5.6Z" />
        <circle cx="46.2" cy="29.6" r="1.9" />
        <circle cx="42.4" cy="27.6" r="1.7" />
        <circle cx="39" cy="27.8" r="1.5" />
        <circle cx="36.2" cy="29.6" r="1.3" />
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    name: 'men' | 'kote' | 'do' | 'shinai' | 'flag' | 'ashiato' | 'kid' | 'swing' | 'cheer'
    size?: number | string
  }>(),
  { size: 40 }
)
</script>

<style scoped>
.keiko-art {
  display: block;
  flex-shrink: 0;
}
</style>
