<template>
  <div class="nk-root min-h-screen w-full">
    <div class="nk-bg" aria-hidden="true" />
    <div class="relative z-[1]">

      <!-- PC ナビ -->
      <header class="nk-nav hidden lg:block border-b border-[var(--nk-line)]">
        <nav class="flex max-w-[960px] mx-auto px-6">
          <NuxtLink
            v-for="tool in tools"
            :key="tool.path"
            :to="tool.path"
            :class="[
              'flex items-center gap-2 px-5 py-4 no-underline text-sm font-medium border-b-2 transition-all duration-200',
              isActive(tool.path)
                ? 'text-[var(--nk-indigo)] border-[var(--nk-indigo)]'
                : 'text-[var(--nk-ink-soft)] border-transparent hover:text-[var(--nk-ink)] hover:border-[var(--nk-line)]'
            ]"
          >
            <span class="text-[17px]" style="font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif">{{ tool.icon }}</span>
            <span>{{ tool.name }}</span>
          </NuxtLink>
        </nav>
      </header>

      <!-- スマホ ナビ（横スクロール） -->
      <header class="lg:hidden border-b border-[var(--nk-line)] bg-[var(--nk-paper)]">
        <nav class="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NuxtLink
            v-for="tool in tools"
            :key="tool.path"
            :to="tool.path"
            :class="[
              'flex items-center gap-1.5 px-4 py-3.5 no-underline text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-200 shrink-0',
              isActive(tool.path)
                ? 'text-[var(--nk-indigo)] border-[var(--nk-indigo)]'
                : 'text-[var(--nk-ink-soft)] border-transparent'
            ]"
          >
            <span class="text-base" style="font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif">{{ tool.icon }}</span>
            <span>{{ tool.name }}</span>
          </NuxtLink>
        </nav>
      </header>

      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const tools = [
  { path: '/', name: 'ホーム', icon: '🏠' },
  { path: '/nikki', name: '日記', icon: '📔' },
  { path: '/kouba', name: 'タスクくん', icon: '⏱️' },
  { path: '/games', name: 'ゲーム', icon: '🎮' },
]

const isActive = (path: string): boolean =>
  path === '/' ? route.path === '/' : route.path.startsWith(path)

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    // 日付や見出しは明朝（読み返す紙の手触り）、本文はゴシックで読みやすく。
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
    },
  ],
})
</script>

<style>
/*
 * 色は :root に置く（.nk-root ではない）。
 * モーダルは <Teleport to="body"> で .nk-root の外へ出るので、.nk-root に変数を置くと
 * 継承されず background が無色＝ポップアップが透けて見える、という不具合になる。
 */
:root {
  /* 生成りの紙＋藍のインク。読み返すことが主目的なので明るい側に振る */
  --nk-paper: #f7f5ef;
  --nk-paper-deep: #efece3;
  --nk-card: #ffffff;
  --nk-ink: #22252c;
  --nk-ink-soft: #7b7f89;
  --nk-line: #e5e1d7;

  --nk-indigo: #364a8a;
  --nk-indigo-soft: #dfe3f2;
  --nk-gold: #b8853a;
  --nk-gold-soft: #f2e4cb;
  --nk-today: #c2453f;
}

.nk-root {
  position: relative;
  color: var(--nk-ink);
  background: var(--nk-paper);
  font-family: 'Zen Kaku Gothic New', -apple-system, 'Hiragino Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.nk-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  /* 罫線の入った日記帳をうっすら敷く */
  background-image:
    repeating-linear-gradient(180deg, rgba(54, 74, 138, 0.045) 0 1px, transparent 1px 28px),
    radial-gradient(80% 50% at 50% -10%, rgba(54, 74, 138, 0.06) 0%, transparent 60%),
    linear-gradient(180deg, var(--nk-paper) 0%, var(--nk-paper-deep) 100%);
}

.nk-serif {
  font-family: 'Shippori Mincho', 'Hiragino Mincho ProN', serif;
  font-weight: 600;
}

.nk-card {
  background: var(--nk-card);
  border: 1px solid var(--nk-line);
  border-radius: 14px;
}

.nk-btn {
  height: 2.4rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13.5px;
  color: #fff;
  background: var(--nk-indigo);
  transition: opacity 0.15s, transform 0.1s;
}
.nk-btn:hover { opacity: 0.9; }
.nk-btn:active { transform: scale(0.97); }
.nk-btn:disabled { opacity: 0.35; }

.nk-btn-ghost {
  height: 2.4rem;
  padding: 0 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13px;
  color: var(--nk-ink-soft);
  border: 1px solid var(--nk-line);
  background: var(--nk-card);
  transition: border-color 0.15s, color 0.15s;
}
.nk-btn-ghost:hover { border-color: var(--nk-indigo); color: var(--nk-ink); }
.nk-btn-ghost:disabled { opacity: 0.4; }
.nk-btn-ghost:disabled:hover { border-color: var(--nk-line); color: var(--nk-ink-soft); }

.nk-input {
  background: var(--nk-card);
  border: 1px solid var(--nk-line);
  border-radius: 10px;
  padding: 0.55rem 0.8rem;
  font-size: 14px;
  color: var(--nk-ink);
  width: 100%;
}
.nk-input:focus { outline: none; border-color: var(--nk-indigo); }

/* インパクトの強さ。読み返したときの目印なので、色の差はしっかり付ける */
.nk-impact-5 { background: var(--nk-gold); color: #fff; }
.nk-impact-4 { background: var(--nk-gold-soft); color: #7a5518; }
.nk-impact-3 { background: var(--nk-indigo-soft); color: var(--nk-indigo); }

/*
 * モーダル（Teleport 先）の面。変数が解決できない状況でも必ず色が乗るよう実色も書く。
 * 透けたポップアップは文字が読めないので、ここは変数だけに頼らない。
 */
.nk-sheet {
  background: #f7f5ef;
  background: var(--nk-paper, #f7f5ef);
  border: 1px solid var(--nk-line, #e5e1d7);
  color: var(--nk-ink, #22252c);
}
.nk-sheet-bar {
  background: #f7f5ef;
  background: var(--nk-paper, #f7f5ef);
  border-bottom: 1px solid var(--nk-line, #e5e1d7);
}
/* モーダルの中のカードも、変数が無くても白く出るようにする */
.nk-sheet .nk-card {
  background: #ffffff;
  border-color: var(--nk-line, #e5e1d7);
}

/* 横スクロールのタイムライン。スクロールバーは細く、指で流せるように */
.nk-scroll-x {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}
.nk-scroll-x::-webkit-scrollbar { height: 8px; }
.nk-scroll-x::-webkit-scrollbar-thumb { background: rgba(54, 74, 138, 0.25); border-radius: 999px; }
</style>
