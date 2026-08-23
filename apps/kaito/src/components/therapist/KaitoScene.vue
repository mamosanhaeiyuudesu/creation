<template>
  <!--
    セラピーのスタイルに添えるイラスト。
    写真の代わりに、海のモチーフに合わせたフラットな手描きSVGを置いている。
    枠が横長になる画面幅でも中央の人物が切れないよう、大事な要素は
    中央の正方形（おおよそ x40〜280 / y90〜285）に収めてある。
  -->
  <svg
    class="style-scene"
    viewBox="0 0 320 320"
    preserveAspectRatio="xMidYMid slice"
    role="img"
    :aria-label="label"
  >
    <defs>
      <linearGradient :id="`sky-${name}`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#dff2f9" />
        <stop offset="1" stop-color="#f2fafb" />
      </linearGradient>
    </defs>

    <!-- ===== 背景（2枚共通） ===== -->
    <rect width="320" height="320" :fill="`url(#sky-${name})`" />

    <!-- 太陽 -->
    <circle cx="266" cy="48" r="30" fill="#ffdca8" opacity=".28" />
    <circle cx="266" cy="48" r="21" fill="#ffd08f" />

    <!-- 雲 -->
    <g fill="#ffffff" opacity=".92">
      <ellipse cx="62" cy="44" rx="28" ry="14" />
      <ellipse cx="82" cy="38" rx="18" ry="12" />
      <ellipse cx="170" cy="30" rx="20" ry="10" />
    </g>

    <!-- 海 -->
    <rect y="96" width="320" height="72" fill="#8ad8da" />
    <rect y="96" width="320" height="18" fill="#57c5c7" />
    <g fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".75">
      <path d="M20 130c7 0 7 6 14 6s7-6 14-6" />
      <path d="M252 148c7 0 7 6 14 6s7-6 14-6" />
      <path d="M138 122c7 0 7 6 14 6s7-6 14-6" />
    </g>

    <!-- 砂浜 -->
    <path d="M0 168c46-9 96-11 160-11s114 2 160 11v163H0Z" fill="#f6e7d1" />
    <path d="M0 168c46-9 96-11 160-11s114 2 160 11v10c-46-8-96-10-160-10s-114 2-160 10Z" fill="#fdf4e6" />

    <!-- ===== ① 気軽にお話ししましょう ===== -->
    <g v-if="name === 'talk'">
      <!-- 砂浜のヒトデと貝 -->
      <path
        d="M58 240c.9 0 1.5.5 1.8 1.3l2.3 5 5.6.6c1.6.2 2.2 2.2 1 3.2l-4.2 3.7 1.2 5.5c.3 1.5-1.3 2.7-2.7 1.9L58 258.4l-5 2.8c-1.4.8-3-.4-2.7-1.9l1.2-5.5-4.2-3.7c-1.2-1-.6-3 1-3.2l5.6-.6 2.3-5c.3-.8 1-1.3 1.8-1.3Z"
        fill="#f0b6a4"
      />
      <path d="M272 258l-8-11a10 10 0 0 1 16 0Z" fill="#f7cdd6" />

      <!-- 吹き出し -->
      <g>
        <rect x="130" y="138" width="60" height="38" rx="17" fill="#ffffff" />
        <path d="M150 174l-4 13 13-9Z" fill="#ffffff" />
        <path
          d="M160 149c2.4-4 9-2.8 9 1.9 0 4.6-9 9.6-9 9.6s-9-5-9-9.6c0-4.7 6.6-5.9 9-1.9Z"
          fill="#f7a8b4"
        />
      </g>

      <!-- 左のひと -->
      <g>
        <path d="M92 280C92 246 103 222 118 222S144 246 144 280Z" fill="#ffffff" />
        <path d="M118 222c9 0 17 8 21 21H97c4-13 12-21 21-21Z" fill="#ffe1ea" />
        <path
          d="M143 250c8 4 13 11 14 19"
          fill="none"
          stroke="#f6dcc5"
          stroke-width="10"
          stroke-linecap="round"
        />
        <circle cx="118" cy="198" r="26" fill="#f8e2cd" />
        <path
          d="M92 198a26 26 0 0 1 52 0c-3-9-10-13-17-10s-15 2-21-2c-6-3-11 4-14 12Z"
          fill="#5b4239"
        />
        <rect x="90" y="192" width="9" height="30" rx="4.5" fill="#5b4239" />
        <rect x="137" y="192" width="9" height="30" rx="4.5" fill="#5b4239" />
        <ellipse cx="109" cy="202" rx="2.7" ry="3.5" fill="#33403f" />
        <ellipse cx="127" cy="202" rx="2.7" ry="3.5" fill="#33403f" />
        <circle cx="102" cy="209" r="4.4" fill="#f7b3b8" opacity=".85" />
        <circle cx="134" cy="209" r="4.4" fill="#f7b3b8" opacity=".85" />
        <path
          d="M114 209q4 4.5 8 0"
          fill="none"
          stroke="#33403f"
          stroke-width="2.1"
          stroke-linecap="round"
        />
      </g>

      <!-- 右のひと -->
      <g>
        <path d="M181 280C181 248 191 226 206 226S231 248 231 280Z" fill="#a9dfe2" />
        <path
          d="M182 254c-8 4-13 11-14 19"
          fill="none"
          stroke="#f6dcc5"
          stroke-width="10"
          stroke-linecap="round"
        />
        <circle cx="206" cy="202" r="25" fill="#f8e2cd" />
        <circle cx="206" cy="172" r="9" fill="#41393a" />
        <path
          d="M181 202a25 25 0 0 1 50 0c-3-9-10-13-17-10s-14 2-20-2c-6-3-10 4-13 12Z"
          fill="#41393a"
        />
        <ellipse cx="197" cy="206" rx="2.6" ry="3.4" fill="#33403f" />
        <ellipse cx="215" cy="206" rx="2.6" ry="3.4" fill="#33403f" />
        <circle cx="190" cy="213" r="4.2" fill="#f7b3b8" opacity=".85" />
        <circle cx="222" cy="213" r="4.2" fill="#f7b3b8" opacity=".85" />
        <path
          d="M202 213q4 4.5 8 0"
          fill="none"
          stroke="#33403f"
          stroke-width="2.1"
          stroke-linecap="round"
        />
      </g>
    </g>

    <!-- ===== ② 可能性のない人なんて、いない ===== -->
    <g v-else>
      <!-- 見上げている光 -->
      <circle cx="232" cy="128" r="30" fill="#ffd98f" opacity=".26" />
      <circle cx="232" cy="128" r="19" fill="#ffd98f" opacity=".4" />
      <path
        d="M232 110l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5-11.2-5.9-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8Z"
        fill="#ffca6e"
      />
      <g fill="#ffd98f">
        <path d="M188 96l2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.4 2.8 1-6-4.3-4.2 6-.9Z" />
        <path d="M268 176l2 4.2 4.6.7-3.3 3.2.8 4.6-4.1-2.2-4.1 2.2.8-4.6-3.4-3.2 4.7-.7Z" />
        <path d="M204 158l1.7 3.4 3.8.6-2.7 2.6.6 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.6 3.8-.6Z" />
      </g>

      <!-- まんなかのひと -->
      <g>
        <path d="M126 280C126 246 137 222 152 222S178 246 178 280Z" fill="#ffffff" />
        <path d="M152 222c9 0 17 8 21 21h-42c4-13 12-21 21-21Z" fill="#d7f0f1" />
        <!-- ひらいた両腕 -->
        <path
          d="M130 240c-8-10-11-21-6-30"
          fill="none"
          stroke="#f6dcc5"
          stroke-width="10"
          stroke-linecap="round"
        />
        <path
          d="M174 240c9-9 14-19 11-29"
          fill="none"
          stroke="#f6dcc5"
          stroke-width="10"
          stroke-linecap="round"
        />
        <circle cx="123" cy="207" r="6" fill="#f8e2cd" />
        <circle cx="185" cy="208" r="6" fill="#f8e2cd" />
        <!-- 顔 -->
        <circle cx="152" cy="196" r="27" fill="#f8e2cd" />
        <path
          d="M125 196a27 27 0 0 1 54 0c-3-9-10-13-18-10s-15 2-22-2c-6-4-11 4-14 12Z"
          fill="#6b4a3c"
        />
        <rect x="123" y="190" width="9" height="34" rx="4.5" fill="#6b4a3c" />
        <rect x="172" y="190" width="9" height="34" rx="4.5" fill="#6b4a3c" />
        <!-- うれしそうな目 -->
        <g fill="none" stroke="#33403f" stroke-width="2.6" stroke-linecap="round">
          <path d="M139 202q4.5-5.5 9 0" />
          <path d="M156 202q4.5-5.5 9 0" />
        </g>
        <circle cx="135" cy="208" r="4.6" fill="#f7b3b8" opacity=".85" />
        <circle cx="169" cy="208" r="4.6" fill="#f7b3b8" opacity=".85" />
        <path
          d="M147 208a5.5 5.5 0 0 0 10 0Z"
          fill="#e07f89"
        />
      </g>

      <!-- 砂浜の貝 -->
      <path d="M64 256l-9-12a11 11 0 0 1 18 0Z" fill="#bfe6e8" />
    </g>
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{ name: 'talk' | 'shine' }>()

const label = computed(() =>
  props.name === 'talk'
    ? '海辺で二人が並んで話しているイラスト'
    : '海辺で両手をひろげ、光を見上げているイラスト',
)
</script>
