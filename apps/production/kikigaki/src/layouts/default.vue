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
        <!-- 背景と右の罫線は左メニュー全体（画面の下まで伸びる）に付け、中身はスクロールしても見える位置に固定する -->
        <div class="kk-side-inner">
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
            <!-- 設定。押すと、下に設定の中身（タグ・今月のAI利用量・お支払い・ドライブなど）が開く -->
            <button
              type="button"
              class="kk-side-link"
              :class="{ 'is-active': settingsOpen }"
              :aria-expanded="settingsOpen"
              aria-controls="kk-side-settings"
              @click="settingsOpen = !settingsOpen"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path :d="GEAR_PATH" /></svg>
              設定
            </button>
          </nav>

          <!-- 設定の中身。閉じていても読み込みは動かす（管理者か・今月の利用量・お休み中かをここで /api/me から入れて、
               ほかの画面も見ているため）ので、v-if ではなく v-show で隠す。
               スマホでは、右上の「設定」ボタンから開く、画面の上から出るシートになる
               （ヘッダーの高さやお知らせの帯に左右されないよう、画面の最上部に固定する。kk-set-backdrop は外側のタップで閉じる用） -->
          <div v-if="settingsOpen" class="kk-set-backdrop" aria-hidden="true" @click="settingsOpen = false" />
          <div v-show="settingsOpen" id="kk-side-settings" class="kk-set-sheet">
            <div class="kk-set-sheet-head">
              <span>設定</span>
              <button type="button" class="kk-set-sheet-close" aria-label="設定を閉じる" @click="settingsOpen = false">✕</button>
            </div>
            <SettingsPanel class="kk-side-settings" />
          </div>

          <nav class="kk-side-legal">
            <NuxtLink to="/terms">利用規約</NuxtLink>
            <NuxtLink to="/privacy">プライバシーポリシー</NuxtLink>
            <NuxtLink to="/legal">特定商取引法に基づく表記</NuxtLink>
          </nav>
        </div>
      </aside>

      <!-- 左メニュー表示中（PC・ログイン後）は上の帯が無いので、画面右上に固定で置く -->
      <div v-if="isLoggedIn" class="kk-fb-fixed"><FeedbackButton service="キキガキ" /></div>

      <div class="kk-shell-main">
        <header class="kk-mobile-head">
          <NuxtLink to="/" class="kk-logo">
            <span class="kk-logo-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 15h6M9 7h3" /></svg>
            </span>
            {{ serviceName }}
            <span class="kk-note font-normal hidden sm:inline">会議の文章から議事録を</span>
          </NuxtLink>
          <div class="kk-fb-head"><FeedbackButton service="キキガキ" /></div>
          <!-- スマホでは左メニューが出ないので、管理画面との行き来はこの帯の右端のボタンで行う（管理者だけ）。
               管理画面にいるときは「議事録」（一覧へ戻る）、それ以外では「管理画面」に入れ替える -->
          <template v-if="isAdmin">
            <NuxtLink v-if="route.path.startsWith('/admin')" to="/" class="kk-head-admin">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 15h6" /></svg>
              議事録
            </NuxtLink>
            <NuxtLink v-else to="/admin" class="kk-head-admin">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
              管理画面
            </NuxtLink>
          </template>
          <!-- 設定（スマホは右上。PCは左メニューの「設定」） -->
          <button
            v-if="isLoggedIn"
            type="button"
            class="kk-head-admin"
            :class="{ 'is-on': settingsOpen }"
            :aria-expanded="settingsOpen"
            aria-controls="kk-side-settings"
            @click="settingsOpen = !settingsOpen"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path :d="GEAR_PATH" /></svg>
            設定
          </button>
        </header>

        <main
          class="kk-main flex-1 w-full mx-auto px-3 sm:px-5 pt-3"
          :class="[
            wide ? 'kk-wide-main max-w-[1440px] pb-3' : isLoggedIn ? 'max-w-[1100px] pb-10' : 'max-w-[560px] pb-10',
            // 左メニューがあるPC幅では、本文を残りの幅の真ん中ではなく左メニュー側に寄せる（間が空きすぎないように）
            isLoggedIn ? 'lg:mx-0' : '',
          ]"
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
// 設定の中身を開いているか（SettingsPanel も、お知らせを出すときに開くため同じ値を見る）
const settingsOpen = useState<boolean>('kk-settings-open', () => false)
/** 歯車アイコンの輪郭（左メニューと、スマホの右上のボタンで同じ絵を使う） */
const GEAR_PATH =
  'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'
// ── 左メニューの幅 ──
// つまみで変えた幅は覚えない（読み込み直すと、いつも既定の幅に戻る）
// 2026-10-25 に既定を半分（248→124）にしたあと、狭すぎたので1.4倍（174）、5px足して179、さらに1.5倍して268にした
const SIDE_DEFAULT = 268
const SIDE_MIN = 100
const SIDE_MAX = 440
const sideWidth = ref(SIDE_DEFAULT)
const resizing = ref(false)

function setSideWidth(w: number) {
  sideWidth.value = Math.min(SIDE_MAX, Math.max(SIDE_MIN, Math.round(w)))
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

/* ── サイドバー。スマホでは左メニュー自体は出さず、設定の欄だけを右上のボタンから開くパネルにする ── */
.kk-side {
  order: 2;
  padding: 0;
  border: 0;
}
.kk-side .kk-set-sheet {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 41;
  max-height: 85dvh;
  overflow-y: auto;
  padding: 0.55rem 0.8rem 0.9rem;
  background: var(--kk-panel);
  border-bottom: 1px solid var(--kk-line-strong);
  border-radius: 0 0 14px 14px;
  box-shadow: 0 10px 28px rgba(35, 39, 47, 0.2);
}
.kk-set-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.45rem;
  font-size: 14px;
  font-weight: 700;
}
.kk-set-sheet-close {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-family: inherit;
  font-size: 15px;
  color: var(--kk-ink-soft);
  cursor: pointer;
}
/* パネルの外をタップしたら閉じる。PCでは左メニューに開くので使わない */
.kk-set-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
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
.kk-fb-head {
  margin-left: auto;
}
.kk-fb-fixed {
  display: none;
}
@media (min-width: 1024px) {
  .kk-fb-fixed {
    display: block;
    position: fixed;
    top: 12px;
    right: 16px;
    z-index: 30;
  }
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
  background: transparent;
  font-family: inherit;
  cursor: pointer;
}
.kk-head-admin.is-on {
  background: var(--kk-accent-soft);
  border-color: transparent;
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
  /* 左メニュー全体は本文と同じ高さまで伸ばす（背景・罫線が下まで続く） */
  .kk-shell--side .kk-side {
    order: 0;
    width: var(--kk-side-w, 268px);
    flex: none;
    position: relative;
    align-self: stretch;
    padding: 0;
    background: var(--kk-panel);
    border-top: 0;
    border-right: 1px solid var(--kk-line);
  }
  /* 中身は、本文をスクロールしても画面の上に付いてくる。設定が入って縦に長いときは、中だけスクロールさせる */
  .kk-side-inner {
    position: sticky;
    top: 0;
    /* 左メニューと同じ高さにして、利用規約などを一番下に置く（margin-top: auto）。
       本文が長いときは max-height で画面の高さに抑える（min-height にすると max-height に勝ってしまう） */
    height: 100%;
    max-height: 100dvh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 0.9rem 0.7rem 0.8rem;
  }
  .kk-shell--wide .kk-side-inner {
    max-height: 100%;
  }
  .kk-side .kk-logo {
    display: inline-flex;
    padding: 0 0.5rem;
  }
  .kk-side .kk-side-nav,
  .kk-side .kk-side-legal {
    display: flex;
  }
  .kk-side .kk-set-sheet {
    position: static;
    max-height: none;
    overflow-y: visible;
    padding: 0;
    background: transparent;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
  .kk-set-sheet-head {
    display: none;
  }
  .kk-side .kk-side-settings {
    padding-top: 0.75rem;
    border-top: 1px solid var(--kk-line);
  }
  .kk-set-backdrop {
    display: none;
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
