<template>
  <div class="min-h-[100dvh] flex flex-col">
    <header class="shrink-0 flex items-center justify-between px-4 sm:px-6 h-14">
      <span class="mb-display text-[15px] font-bold text-[var(--mb-accent-deep)]">まなび</span>
      <!-- これまでに正解した問題の累計（この端末の分） -->
      <span class="text-[12.5px] text-[var(--mb-ink-soft)]" aria-label="正解した問題の累計">
        正解 <b class="text-[16px] tabular-nums text-[var(--mb-accent-deep)]">{{ totalCorrect }}</b> 問
      </span>
    </header>

    <main class="flex-1 w-full max-w-[600px] mx-auto px-4 sm:px-6 pb-10 flex flex-col">
      <!-- 作っている間は入力欄ごと置き換える（二重に送らせない・待っていることを伝える） -->
      <div v-if="generating" class="flex-1 flex flex-col items-center justify-center text-center mb-rise">
        <div class="mb-dots mb-6" aria-hidden="true"><span /><span /><span /></div>
        <p class="mb-display text-[19px] font-bold">{{ theme }}</p>
        <p class="mt-3 text-[14px] text-[var(--mb-ink-soft)]">{{ phaseText }}</p>
        <p class="mt-8 text-[12px] text-[var(--mb-ink-faint)]">{{ count }}問だと{{ waitHint }}ほどかかります</p>
      </div>

      <template v-else>
        <div class="flex-1 flex flex-col justify-center pt-[8vh] pb-8">
          <h1 class="mb-display text-center text-[24px] sm:text-[28px] font-bold leading-snug">
            何を学びますか？
          </h1>
          <p class="mt-3 text-center text-[13.5px] text-[var(--mb-ink-soft)]">
            テーマを書くと、AIが選択式の問題をつくります
          </p>

          <div class="mt-8 mb-bar">
            <input
              ref="inputEl"
              v-model="theme"
              type="text"
              enterkeyhint="go"
              :maxlength="THEME_MAX"
              placeholder="例：肥料の基礎知識、小学4年生の漢字"
              aria-label="学びたいテーマ"
              autocomplete="off"
              @keydown.enter="onEnter"
            />
            <button class="mb-send" :disabled="!canSubmit" aria-label="問題をつくる" @click="submit">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          <div class="mt-4 flex items-center justify-center gap-2" role="radiogroup" aria-label="問題数">
            <button
              v-for="n in MANABI_COUNTS"
              :key="n"
              class="mb-chip"
              :class="{ 'mb-chip--on': count === n }"
              role="radio"
              :aria-checked="count === n"
              @click="count = n"
            >
              {{ n }}問
            </button>
          </div>

          <label class="mt-4 flex items-start justify-center gap-2 text-[13px] text-[var(--mb-ink-soft)] cursor-pointer select-none">
            <input v-model="isPublic" type="checkbox" class="mt-[3px] accent-[var(--mb-accent)]" />
            <span>
              「みんなの問題」に公開する
              <span class="block text-[11.5px] text-[var(--mb-ink-faint)]">外すと、リンクを知っている人だけが開けます</span>
            </span>
          </label>

          <div class="mt-4 mb-bar">
            <input
              v-model="creatorName"
              type="text"
              :maxlength="MANABI_CREATOR_NAME_MAX"
              placeholder="あなたの名前（問題名の横に表示・省略できます）"
              aria-label="作成者の名前"
              autocomplete="nickname"
              @keydown.enter.prevent
            />
          </div>

          <p v-if="error" class="mt-5 text-center text-[13.5px] text-[var(--mb-bad)]">{{ error }}</p>

          <!-- これまでにやった問題。押すとその問題にもう一度挑戦できる -->
          <section v-if="recent.length" class="mt-8">
            <h2 class="text-[12px] text-[var(--mb-ink-faint)] mb-2 px-1">これまでの問題</h2>
            <ul class="mb-card divide-y divide-[var(--mb-line)] overflow-hidden">
              <li v-for="r in recent" :key="r.id">
                <NuxtLink
                  :to="`/${r.id}`"
                  class="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(128,128,128,0.05)] transition-colors"
                >
                  <span class="flex-1 min-w-0 flex items-baseline gap-2">
                    <span class="truncate text-[14.5px]">{{ r.title }}</span>
                    <span v-if="r.creatorName" class="shrink-0 max-w-[40%] truncate text-[11.5px] text-[var(--mb-ink-faint)]">{{ r.creatorName }}</span>
                  </span>
                  <!-- 解き終えたら正答率、途中なら「答えた数/全問」 -->
                  <span
                    class="shrink-0 w-14 text-right text-[13px] tabular-nums"
                    :class="r.lastScore === null ? 'text-[var(--mb-ink-faint)]' : 'font-bold text-[var(--mb-accent-deep)]'"
                  >
                    {{ r.lastScore === null ? `${r.answered}/${r.count}` : `${r.lastScore}%` }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </section>
        </div>

        <div class="pb-6 text-center">
          <NuxtLink to="/explore" class="mb-link">みんなの問題を見る</NuxtLink>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * manabi — テーマを書くだけで選択式の問題セットができる、学び直しのドリル。
 *
 * 手を入れるときの判断基準（意図して「無い」もの）:
 * - カテゴリ・難易度の選択UIは置かない。レベルや範囲はテーマの言葉からAIが読み取る
 * - 回答形式は選択式だけ（穴埋め・記述はスキマ時間のテンポを落とす）
 * - トップは入力欄ひとつ。問題数だけは選べるが、それ以上の設定は足さない
 * - ログインは求めない（共有されたURLをLINEから開いた人が、そのまま解けるように）
 */
import { MANABI_COUNTS, MANABI_CREATOR_NAME_MAX, type ManabiCount } from '~/types/manabi'
import { useManabiRecent } from '~/composables/useManabiRecent'
import { ownerToken, rememberOwned, saveName, savedName, useManabiTotalCorrect } from '~/composables/useManabiMe'

definePageMeta({ layout: 'manabi' })
useHead({
  title: 'まなび',
  meta: [
    { name: 'description', content: 'テーマを書くと、AIが選択式の問題をつくる学びのドリル。' },
    { name: 'theme-color', content: '#f7f5ef' },
  ],
})

const THEME_MAX = 200

const router = useRouter()
const route = useRoute()
const { items: recent, load: loadRecent } = useManabiRecent()
const { totalCorrect, load: loadTotal } = useManabiTotalCorrect()

// 深掘りの提案などから来たときは ?theme= で入力済みにする（作るのは本人が押してから）
const theme = ref(typeof route.query.theme === 'string' ? route.query.theme.slice(0, THEME_MAX) : '')
const count = ref<ManabiCount>(10)
// 作成者の名前。前回入れた名前を端末から読む（SSR との食い違いを出さないため mount 後）
const creatorName = ref('')
// 公開の既定はオン（みんなで見られることが前提の機能）。やめたい人だけ外す
const isPublic = ref(true)
const generating = ref(false)
const error = ref('')
const elapsed = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)
let tick: ReturnType<typeof setInterval> | null = null

const canSubmit = computed(() => theme.value.trim().length > 0 && !generating.value)

// 実際の進み具合はサーバーから来ないので、経過時間でおおよその段階を見せる
const phaseText = computed(() => {
  if (elapsed.value < 6) return 'テーマを読み解いています'
  if (elapsed.value < 40) return '問題をつくっています'
  return 'もうすぐできあがります'
})
const waitHint = computed(() => (count.value === 10 ? '20秒' : count.value === 20 ? '30秒' : '40秒'))

onMounted(() => {
  loadRecent()
  loadTotal()
  creatorName.value = savedName()
  inputEl.value?.focus()
})
onBeforeUnmount(() => {
  if (tick) clearInterval(tick)
})

// 日本語入力の変換確定の Enter で送信しない
const onEnter = (e: KeyboardEvent) => {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  submit()
}

const submit = async () => {
  if (!canSubmit.value) return
  error.value = ''
  generating.value = true
  elapsed.value = 0
  tick = setInterval(() => elapsed.value++, 1000)
  try {
    const { id } = await $fetch<{ id: string }>('/api/sets', {
      method: 'POST',
      body: {
        theme: theme.value.trim(),
        count: count.value,
        isPublic: isPublic.value,
        creatorName: creatorName.value.trim(),
        ownerToken: ownerToken(),
      },
      // ふつうは20〜40秒。応答が返らないまま待たせ続けないよう上限を置く
      timeout: 120_000,
    })
    saveName(creatorName.value.trim())
    rememberOwned(id)
    await router.push(`/${id}`)
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || '問題をつくれませんでした。もう一度お試しください。'
    generating.value = false
  } finally {
    if (tick) clearInterval(tick)
    tick = null
  }
}
</script>
