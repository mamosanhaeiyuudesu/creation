<template>
  <div class="kk-shell" :class="{ 'kk-shell--wide': wide, 'kk-shell--side': isLoggedIn }">
    <div class="kk-shell-body">
      <!-- PC の左メニュー（ログイン後のみ）。上から「ロゴ｜管理画面へ」「議事録の一覧」「新しく作る」「設定｜ご意見」。
           スマホでは左メニュー自体は出さず、ロゴ等は上の kk-mobile-head、議事録の一覧はホームに任せる -->
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
        <!-- 背景と右の罫線は左メニュー全体（画面の下まで伸びる）に付け、中身はスクロールしても見える位置に固定する。
             議事録の一覧だけが中でスクロールする -->
        <div class="kk-side-inner">
          <div class="kk-side-head">
            <NuxtLink to="/" class="kk-logo">
              <span class="kk-logo-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 15h6M9 7h3" /></svg>
              </span>
              {{ serviceName }}
            </NuxtLink>
            <!-- 管理画面との行き来（管理者だけ）。いる画面に合わせて「管理画面へ」「通常画面へ」を入れ替える -->
            <NuxtLink v-if="isAdmin" :to="adminSwitch.to" class="kk-side-admin">{{ adminSwitch.label }}</NuxtLink>
          </div>

          <div class="kk-side-list">
            <SideRecordList />
          </div>

          <!-- ドライブにつながっていないと、PDFをドライブに残せない。気づかれないと困るので「新しく作る」の上に出す -->
          <div v-if="!driveConnected" class="kk-side-drive">
            <span>Googleドライブとつながっていません</span>
            <button type="button" :disabled="driveBusy" @click="connectDrive">{{ driveBusy ? '開いています…' : 'つなぐ' }}</button>
          </div>
          <p v-if="driveError" class="kk-side-reason kk-side-reason--error">{{ driveError }}</p>

          <!-- 作る入口はPCではここだけ（ホームには置かない）。押すと、その場で文章を入れるシートが開く。
               議事録が1件もないときは、気づいてもらえるよう光らせる -->
          <button
            type="button"
            class="kk-side-new"
            :class="{ 'is-first': recordsLoaded && !records.length }"
            :disabled="pendingApproval || usageExhausted"
            @click="textSheetOpen = true"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            新しく作る
          </button>
          <p v-if="pendingApproval" class="kk-side-reason">ただいま利用の準備中です。準備ができしだい作れるようになります。</p>
          <p v-else-if="usageExhausted" class="kk-side-reason">今月のAI利用量を使い切りました。来月1日から、また作れます。</p>

          <!-- 一番下: 設定（押すと上にポップアップで開く）と、右端にご意見 -->
          <div class="kk-side-foot">
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
            <FeedbackButton service="キキガキ" />
          </div>

          <!-- 設定の中身。閉じていても読み込みは動かす（管理者か・今月の利用量・お休み中かをここで /api/me から入れて、
               ほかの画面も見ているため）ので、v-if ではなく v-show で隠す。
               PCは左下の「設定」から上に開くポップアップ、スマホは右上の「設定」から画面の上に出るシート。
               利用規約などのリンクも、この中の一番下に置く（ログイン後は画面の下に並べない）。
               kk-set-backdrop は外側を押して閉じる用 -->
          <div v-if="settingsOpen" class="kk-set-backdrop" aria-hidden="true" @click="settingsOpen = false" />
          <div v-show="settingsOpen" id="kk-side-settings" class="kk-set-sheet" role="dialog" aria-label="設定">
            <div class="kk-set-sheet-head">
              <span>設定</span>
              <button type="button" class="kk-set-sheet-close" aria-label="設定を閉じる" @click="settingsOpen = false">✕</button>
            </div>
            <SettingsPanel />
            <nav class="kk-set-legal">
              <NuxtLink to="/guide">使い方</NuxtLink>
              <NuxtLink to="/terms">利用規約</NuxtLink>
              <NuxtLink to="/privacy">プライバシーポリシー</NuxtLink>
              <NuxtLink to="/legal">特定商取引法に基づく表記</NuxtLink>
            </nav>
          </div>
        </div>
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
          <div class="kk-fb-head"><FeedbackButton service="キキガキ" /></div>
          <!-- スマホでは左メニューが出ないので、管理画面との行き来はこの帯のボタンで行う（管理者だけ） -->
          <NuxtLink v-if="isAdmin" :to="adminSwitch.to" class="kk-head-admin">{{ adminSwitch.label }}</NuxtLink>
          <!-- 設定（スマホは右上。PCは左メニューの左下の「設定」） -->
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
            // 左メニューがあるPC幅では、本文を残りの幅の真ん中ではなく左メニュー側に寄せる（間が空きすぎないように）。
            // 使い方のページ（definePageMeta({ center: true })）だけは、残りの幅のまん中に置く
            isLoggedIn && route.meta.center !== true ? 'lg:mx-0' : '',
          ]"
        >
          <slot />
        </main>
      </div>
    </div>

    <!-- 文章から議事録を作るシート。左メニューの「新しく作る」（PC）とホームのボタン（スマホ）から開く -->
    <MinutesTextSheet v-if="isLoggedIn" v-model="textSheetOpen" />

    <!-- 利用規約などは、ログイン前だけ画面の下に並べる（ログイン後は設定の中） -->
    <footer v-if="!isLoggedIn" class="kk-foot">
      <nav class="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <NuxtLink to="/terms" class="kk-note underline">利用規約</NuxtLink>
        <NuxtLink to="/privacy" class="kk-note underline">プライバシーポリシー</NuxtLink>
        <NuxtLink to="/legal" class="kk-note underline">特定商取引法に基づく表記</NuxtLink>
      </nav>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'

const serviceName = SERVICE.name
const { isLoggedIn } = useAuth()
// 管理者かどうかは SettingsPanel が /api/me から入れる（表示だけ。守りはサーバー側）
const isAdmin = useState<boolean>('kk-is-admin', () => false)
const route = useRoute()
// 設定の中身を開いているか（SettingsPanel も、お知らせを出すときに開くため同じ値を見る）
const settingsOpen = useState<boolean>('kk-settings-open', () => false)
// 設定の中のリンク（利用規約など）で別の画面へ移ったら閉じる
watch(() => route.path, () => {
  settingsOpen.value = false
})

/** 管理画面との切り替え（管理者だけに出す） */
const adminSwitch = computed(() =>
  route.path.startsWith('/admin') ? { to: '/', label: '通常画面へ' } : { to: '/admin', label: '管理画面へ' }
)

// 「新しく作る」のシート。承認待ち・今月の利用量を使い切った人は押せない（押してもAIを呼ばない）
const textSheetOpen = useState<boolean>('kk-text-sheet-open', () => false)
const pendingApproval = useState<boolean>('kk-pending-approval', () => false)
const usageExhausted = useState<boolean>('kk-usage-exhausted', () => false)
const { records, loaded: recordsLoaded } = useRecordList()

// キキガキを開いて最初の画面か（ホームは、開いた直後だけ最新の議事録へ移る。ロゴで戻ってきたときは移らない）
const landed = useState<boolean>('kk-landed', () => false)
watch(() => route.fullPath, () => {
  landed.value = true
})

// ── ドライブ（左メニューの「つなぐ」） ──
const { connected: driveConnected, refresh: refreshDrive, connect: connectDriveNow } = useDrive()
const driveBusy = ref(false)
const driveError = ref('')
async function connectDrive() {
  driveError.value = ''
  driveBusy.value = true
  try {
    await connectDriveNow()
  } catch (e) {
    driveError.value = e instanceof Error ? e.message : 'Googleドライブとつなげませんでした。もう一度お試しください。'
  }
  driveBusy.value = false
}
onMounted(refreshDrive)
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
.kk-side .kk-side-head,
.kk-side .kk-side-new,
.kk-side .kk-side-list,
.kk-side .kk-side-drive,
.kk-side .kk-side-reason,
.kk-side .kk-side-foot {
  display: none;
}
/* 設定の一番下の利用規約など */
.kk-set-legal {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.9rem;
  margin-top: 0.75rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--kk-line);
}
.kk-set-legal a {
  font-size: 11.5px;
  color: var(--kk-ink-faint);
  text-decoration: none;
}
.kk-set-legal a:hover {
  color: var(--kk-ink-soft);
  text-decoration: underline;
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
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.9rem 0.7rem 0.6rem;
  }
  .kk-shell--wide .kk-side-inner {
    max-height: 100%;
  }
  .kk-side .kk-side-head,
  .kk-side .kk-side-foot {
    display: flex;
  }
  .kk-side .kk-side-new,
  .kk-side .kk-side-drive {
    display: flex;
  }
  .kk-side .kk-side-reason {
    display: block;
  }
  /* 議事録の一覧は残りの高さを使い、中だけスクロールする */
  .kk-side .kk-side-list {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  /* 設定は左下の「設定」の上に開くポップアップ */
  .kk-side .kk-set-sheet {
    top: auto;
    left: 10px;
    right: auto;
    bottom: 54px;
    width: 360px;
    max-height: calc(100dvh - 72px);
    border: 1px solid var(--kk-line-strong);
    border-radius: 12px;
  }
  .kk-shell--side .kk-mobile-head {
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

.kk-side-head {
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0 0.2rem 0 0.5rem;
}
.kk-side-admin {
  flex: none;
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 0.55rem;
  border: 1px solid var(--kk-line-strong);
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--kk-ink-soft);
  text-decoration: none;
  white-space: nowrap;
}
.kk-side-admin:hover {
  border-color: var(--kk-accent);
  color: var(--kk-accent-strong);
}
.kk-side-new {
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: var(--kk-cta);
  color: #fff;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
}
.kk-side-new:hover:not(:disabled) {
  background: var(--kk-cta-strong);
}
.kk-side-new:disabled {
  opacity: 0.45;
  cursor: default;
}
/* 議事録が1件もないとき: ここから始めることに気づいてもらう */
.kk-side-new.is-first:not(:disabled) {
  animation: kk-side-new-glow 1.8s ease-in-out infinite;
}
@keyframes kk-side-new-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(240, 140, 30, 0.45); }
  50% { box-shadow: 0 0 0 6px rgba(240, 140, 30, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .kk-side-new.is-first:not(:disabled) {
    animation: none;
  }
}
.kk-side-reason {
  margin: -0.25rem 0 0;
  padding: 0 0.2rem;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--kk-ink-soft);
}
.kk-side-reason--error {
  color: var(--kk-danger);
}
.kk-side-drive {
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.4rem 0.5rem 0.4rem 0.6rem;
  border: 1px solid #f5c58c;
  border-radius: 8px;
  background: var(--kk-cta-soft);
  color: #6b3f06;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.5;
}
.kk-side-drive button {
  flex: none;
  height: 24px;
  padding: 0 0.6rem;
  border: 0;
  border-radius: 999px;
  background: var(--kk-cta);
  color: #fff;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}
.kk-side-drive button:disabled {
  opacity: 0.6;
  cursor: default;
}
.kk-side-new svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
}
.kk-side-foot {
  align-items: center;
  gap: 0.3rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--kk-line);
}
.kk-side-foot .kk-side-link {
  flex: 1;
  width: auto;
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
</style>
