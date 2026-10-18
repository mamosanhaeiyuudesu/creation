<template>
  <div class="kk-shell" :class="{ 'kk-shell--wide': wide, 'kk-shell--side': isLoggedIn }">
    <!-- モニター期間のお知らせ。常時表示。文言と時期は src/config/service.ts で変える -->
    <p v-if="monitorMode" class="kk-topband">{{ monitorText }}</p>

    <div class="kk-shell-body">
      <!-- PC の左サイドバー（ログイン後のみ）。スマホではロゴ等を上の kk-mobile-head に任せ、設定だけページの下に出す -->
      <aside
        v-if="isLoggedIn"
        class="kk-side"
        :class="{ 'is-resizing': resizing }"
        :style="{ '--kk-side-w': `${sideWidth}px` }"
      >
        <!-- 右端をドラッグして幅を変える（PCのみ）。ダブルクリックで元の幅に戻す -->
        <div
          class="kk-side-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="左メニューの幅を変える"
          :aria-valuenow="sideWidth"
          :aria-valuemin="SIDE_MIN"
          :aria-valuemax="SIDE_MAX"
          tabindex="0"
          title="ドラッグで幅を変更（ダブルクリックで元に戻す）"
          @pointerdown="startResize"
          @dblclick="setSideWidth(SIDE_DEFAULT)"
          @keydown.left.prevent="setSideWidth(sideWidth - 16)"
          @keydown.right.prevent="setSideWidth(sideWidth + 16)"
        />
        <NuxtLink to="/" class="kk-logo">
          <span class="kk-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 15h6M9 7h3" /></svg>
          </span>
          {{ serviceName }}
        </NuxtLink>

        <nav class="kk-side-nav">
          <NuxtLink to="/" class="kk-side-link" :class="{ 'is-active': route.path === '/' }">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" /></svg>
            ホーム
          </NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin" class="kk-side-link" :class="{ 'is-active': route.path.startsWith('/admin') }">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
            管理画面
          </NuxtLink>
        </nav>

        <!-- 設定は開くボタンを置かず、ここに常に出す（スマホではページの下に回る） -->
        <SettingsPanel class="kk-side-settings" />

        <nav class="kk-side-legal">
          <NuxtLink to="/terms">利用規約</NuxtLink>
          <NuxtLink to="/privacy">プライバシーポリシー</NuxtLink>
          <NuxtLink to="/legal">特定商取引法に基づく表記</NuxtLink>
        </nav>
      </aside>

      <div class="kk-shell-main">
        <header class="kk-mobile-head">
          <NuxtLink to="/" class="kk-logo">
            <span class="kk-logo-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 15h6M9 7h3" /></svg>
            </span>
            {{ serviceName }}
            <span class="kk-note font-normal hidden sm:inline">会議の文章から議事録を</span>
          </NuxtLink>
          <!-- スマホでは左メニューが出ないので、管理画面への入口はこの帯の右端に置く（管理者だけ） -->
          <NuxtLink v-if="isAdmin" to="/admin" class="kk-head-admin" :class="{ 'is-active': route.path.startsWith('/admin') }">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
            管理画面
          </NuxtLink>
        </header>

        <main
          class="kk-main flex-1 w-full mx-auto px-3 sm:px-5 pt-3"
          :class="wide ? 'kk-wide-main max-w-[1440px] pb-3' : isLoggedIn ? 'max-w-[1100px] pb-10' : 'max-w-[560px] pb-10'"
        >
          <slot />
        </main>

      </div>
    </div>

    <footer class="kk-foot">
      <nav class="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <NuxtLink to="/terms" class="kk-note underline">利用規約</NuxtLink>
        <NuxtLink to="/privacy" class="kk-note underline">プライバシーポリシー</NuxtLink>
        <NuxtLink to="/legal" class="kk-note underline">特定商取引法に基づく表記</NuxtLink>
      </nav>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { SERVICE, monitorNotice } from '~/config/service'
import { parseMonitorMode } from '~/utils/entitlement'

const config = useRuntimeConfig().public
// 環境変数は文字列で来るので "false" を取りこぼさないようにする
// （NUXT_PUBLIC_MONITOR_MODE=false で有料モードに切り替わる）
const monitorMode = computed(() => parseMonitorMode(config.monitorMode))
const monitorText = monitorNotice()
const serviceName = SERVICE.name
const { isLoggedIn } = useAuth()
// 管理者かどうかは SettingsPanel が /api/me から入れる（表示だけ。守りはサーバー側）
const isAdmin = useState<boolean>('kk-is-admin', () => false)
const route = useRoute()
// ── 左メニューの幅 ──
// 幅はこのブラウザだけの好みなので localStorage に置く（使えない環境では毎回既定の幅になるだけ）
const SIDE_DEFAULT = 248
const SIDE_MIN = 200
const SIDE_MAX = 440
const SIDE_KEY = 'kk-side-width'
const sideWidth = ref(SIDE_DEFAULT)
const resizing = ref(false)

function setSideWidth(w: number) {
  sideWidth.value = Math.min(SIDE_MAX, Math.max(SIDE_MIN, Math.round(w)))
  try {
    localStorage.setItem(SIDE_KEY, String(sideWidth.value))
  } catch {
    // プライベートモードなどで保存できなくても、その場の幅は変わる
  }
}

function startResize(e: PointerEvent) {
  const handle = e.currentTarget as HTMLElement
  const aside = handle.parentElement
  if (!aside) return
  e.preventDefault()
  const left = aside.getBoundingClientRect().left
  resizing.value = true
  handle.setPointerCapture(e.pointerId)
  const onMove = (ev: PointerEvent) => setSideWidth(ev.clientX - left)
  const onUp = () => {
    resizing.value = false
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onUp)
    handle.removeEventListener('pointercancel', onUp)
  }
  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onUp)
  handle.addEventListener('pointercancel', onUp)
}

onMounted(() => {
  try {
    const saved = Number(localStorage.getItem(SIDE_KEY))
    if (saved) sideWidth.value = Math.min(SIDE_MAX, Math.max(SIDE_MIN, saved))
  } catch {
    // 読めなければ既定の幅のまま
  }
})

// ページが definePageMeta({ wide: true }) したときは、横幅を広げ、広い画面では高さを画面に収める
const wide = computed(() => route.meta.wide === true)
</script>

<style scoped>
.kk-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
.kk-topband {
  margin: 0;
  padding: 0.35rem 1rem;
  text-align: center;
  font-size: 12.5px;
  line-height: 1.6;
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  border-bottom: 1px solid #c5dbf5;
}
/* スマホは縦積み（本文 → 設定）、PCは横並び（左メニュー｜本文） */
.kk-shell-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.kk-shell-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.kk-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 17px;
  font-weight: 700;
  color: var(--kk-accent);
  text-decoration: none;
  letter-spacing: 0.04em;
  min-width: 0;
  white-space: nowrap;
}
.kk-logo-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--kk-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.kk-logo-mark svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: #fff;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ── サイドバー。スマホでは設定の欄だけを本文の下に出す ── */
.kk-side {
  order: 2;
  padding: 0.75rem 0.75rem 1rem;
  border-top: 1px solid var(--kk-line);
}
.kk-side .kk-logo,
.kk-side .kk-side-nav,
.kk-side .kk-side-legal {
  display: none;
}
.kk-mobile-head {
  padding: 0.6rem 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: var(--kk-panel);
  border-bottom: 1px solid var(--kk-line);
}
.kk-head-admin {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 30px;
  padding: 0 0.65rem;
  border: 1px solid var(--kk-line-strong);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--kk-ink-soft);
  text-decoration: none;
}
.kk-head-admin.is-active {
  border-color: var(--kk-accent);
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
}
.kk-head-admin svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-foot {
  border-top: 1px solid var(--kk-line);
  padding: 0.8rem 1rem;
}

@media (min-width: 1024px) {
  .kk-shell-body {
    flex-direction: row;
  }
  .kk-shell--side .kk-side {
    order: 0;
    width: var(--kk-side-w, 248px);
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 0.9rem 0.7rem 0.8rem;
    background: var(--kk-panel);
    border-top: 0;
    border-right: 1px solid var(--kk-line);
    /* 設定が入って縦に長くなったので、本文と別にスクロールさせる */
    position: sticky;
    top: 0;
    align-self: flex-start;
    max-height: 100dvh;
    overflow-y: auto;
  }
  .kk-shell--wide .kk-side {
    align-self: stretch;
    max-height: none;
  }
  .kk-side .kk-logo {
    display: inline-flex;
    padding: 0 0.5rem;
  }
  .kk-side .kk-side-nav,
  .kk-side .kk-side-legal {
    display: flex;
  }
  .kk-side .kk-side-settings {
    padding-top: 0.75rem;
    border-top: 1px solid var(--kk-line);
  }
  .kk-shell--side .kk-mobile-head,
  .kk-shell--side .kk-foot {
    display: none;
  }
  .kk-shell--side .kk-main {
    padding-top: 1rem;
  }
  /* 確認画面は高さを画面に収め、列の中だけ動かす */
  .kk-shell--wide {
    height: 100dvh;
  }
  .kk-shell--wide .kk-wide-main {
    min-height: 0;
    overflow: hidden;
  }
}

/* 幅を変えるつまみ。スマホでは左メニュー自体が無いので出さない */
.kk-side-resizer {
  display: none;
}
@media (min-width: 1024px) {
  .kk-side-resizer {
    display: block;
    position: absolute;
    top: 0;
    right: 0; /* 左メニューは縦スクロールするので、はみ出すと横スクロールバーが出る。内側に置く */
    bottom: 0;
    width: 6px;
    cursor: col-resize;
    z-index: 5;
    touch-action: none;
  }
  .kk-side-resizer::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 2px;
    background: transparent;
    transition: background-color 0.15s;
  }
  .kk-side-resizer:hover::after,
  .kk-side-resizer:focus-visible::after,
  .kk-side.is-resizing .kk-side-resizer::after {
    background: var(--kk-accent);
  }
  .kk-side.is-resizing {
    user-select: none;
  }
}

.kk-side-nav {
  flex-direction: column;
  gap: 2px;
}
.kk-side-link {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--kk-ink);
  text-decoration: none;
  text-align: left;
  cursor: pointer;
}
.kk-side-link svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-side-link:hover {
  background: var(--kk-bg);
}
.kk-side-link.is-active {
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  font-weight: 700;
}
.kk-side-legal {
  margin-top: auto;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0 0.6rem;
}
.kk-side-legal a {
  font-size: 11px;
  color: var(--kk-ink-faint);
  text-decoration: none;
}
.kk-side-legal a:hover {
  color: var(--kk-ink-soft);
  text-decoration: underline;
}
</style>
