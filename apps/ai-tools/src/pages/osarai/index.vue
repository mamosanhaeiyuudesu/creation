<template>
  <div class="min-h-[100dvh] flex flex-col">
    <header class="shrink-0 flex items-center px-4 sm:px-6 h-14">
      <span class="os-display text-[15px] font-bold text-[var(--os-accent-deep)]">おさらい</span>
    </header>

    <main class="flex-1 w-full max-w-[600px] mx-auto px-4 sm:px-6 pb-10 flex flex-col">
      <!-- 作っている間は入力欄ごと置き換える（二重に送らせない・待っていることを伝える） -->
      <div v-if="generating" class="flex-1 flex flex-col items-center justify-center text-center os-rise">
        <div class="os-dots mb-6" aria-hidden="true"><span /><span /><span /></div>
        <p class="os-display text-[19px] font-bold">{{ theme }}</p>
        <p class="mt-3 text-[14px] text-[var(--os-ink-soft)]">{{ phaseText }}</p>
        <p class="mt-8 text-[12px] text-[var(--os-ink-faint)]">{{ count }}問だと{{ waitHint }}ほどかかります</p>
      </div>

      <template v-else>
        <div class="flex-1 flex flex-col justify-center pt-[8vh] pb-8">
          <h1 class="os-display text-center text-[24px] sm:text-[28px] font-bold leading-snug">
            何をおさらいしますか？
          </h1>
          <p class="mt-3 text-center text-[13.5px] text-[var(--os-ink-soft)]">
            テーマを書くと、AIが選択式の問題をつくります
          </p>

          <div class="mt-8 os-bar">
            <input
              ref="inputEl"
              v-model="theme"
              type="text"
              enterkeyhint="go"
              :maxlength="THEME_MAX"
              placeholder="例：肥料の基礎知識"
              aria-label="おさらいしたいテーマ"
              autocomplete="off"
              @keydown.enter="onEnter"
            />
            <button class="os-send" :disabled="!canSubmit" aria-label="問題をつくる" @click="submit">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          <div class="mt-4 flex items-center justify-center gap-2" role="radiogroup" aria-label="問題数">
            <button
              v-for="n in OSARAI_COUNTS"
              :key="n"
              class="os-chip"
              :class="{ 'os-chip--on': count === n }"
              role="radio"
              :aria-checked="count === n"
              @click="count = n"
            >
              {{ n }}問
            </button>
          </div>

          <p v-if="error" class="mt-5 text-center text-[13.5px] text-[var(--os-bad)]">{{ error }}</p>

          <!-- 何を書けばいいか迷ったときの手がかり。押すと入力欄に入るだけで、すぐには作らない -->
          <div class="mt-10">
            <p class="text-center text-[12px] text-[var(--os-ink-faint)]">たとえば</p>
            <div class="mt-3 flex flex-wrap justify-center gap-2">
              <button
                v-for="ex in EXAMPLES"
                :key="ex"
                class="text-[13px] px-3 py-1.5 rounded-full text-[var(--os-ink-soft)] hover:text-[var(--os-ink)] hover:bg-[rgba(128,128,128,0.08)] transition-colors"
                @click="pickExample(ex)"
              >
                {{ ex }}
              </button>
            </div>
          </div>
        </div>

        <section v-if="recent.length" class="pt-2">
          <h2 class="text-[12px] text-[var(--os-ink-faint)] mb-2 px-1">最近の問題</h2>
          <ul class="os-card divide-y divide-[var(--os-line)] overflow-hidden">
            <li v-for="r in recent" :key="r.id">
              <NuxtLink
                :to="`/osarai/${r.id}`"
                class="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(128,128,128,0.05)] transition-colors"
              >
                <span class="flex-1 min-w-0 truncate text-[14.5px]">{{ r.title }}</span>
                <span class="shrink-0 text-[12px] text-[var(--os-ink-faint)]">{{ r.count }}問</span>
                <span
                  class="shrink-0 w-12 text-right text-[13px] font-bold tabular-nums"
                  :class="r.lastScore === null ? 'text-[var(--os-ink-faint)] font-normal' : 'text-[var(--os-accent-deep)]'"
                >
                  {{ r.lastScore === null ? '未回答' : `${r.lastScore}%` }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * osarai — テーマを書くだけで選択式の問題セットができる、学び直しのドリル。
 *
 * 手を入れるときの判断基準（意図して「無い」もの）:
 * - カテゴリ・難易度の選択UIは置かない。レベルや範囲はテーマの言葉からAIが読み取る
 * - 回答形式は選択式だけ（穴埋め・記述はスキマ時間のテンポを落とす）
 * - トップは入力欄ひとつ。問題数だけは選べるが、それ以上の設定は足さない
 * - ログインは求めない（共有されたURLをLINEから開いた人が、そのまま解けるように）
 */
import { OSARAI_COUNTS, type OsaraiCount } from '~/types/osarai'
import { useOsaraiRecent } from '~/composables/osarai/useOsaraiRecent'

definePageMeta({ layout: 'osarai' })
useHead({
  title: 'おさらい',
  meta: [
    { name: 'description', content: 'テーマを書くと、AIが選択式の問題をつくる学び直しのドリル。' },
    { name: 'theme-color', content: '#f7f6f1', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#141715', media: '(prefers-color-scheme: dark)' },
  ],
})

const THEME_MAX = 200
const EXAMPLES = ['肥料の基礎知識', '農薬の安全な使い方', '桃の栽培の基本', '小学4年生で習う漢字']

const router = useRouter()
const { items: recent, load: loadRecent } = useOsaraiRecent()

const theme = ref('')
const count = ref<OsaraiCount>(10)
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

const pickExample = (ex: string) => {
  theme.value = ex
  inputEl.value?.focus()
}

const submit = async () => {
  if (!canSubmit.value) return
  error.value = ''
  generating.value = true
  elapsed.value = 0
  tick = setInterval(() => elapsed.value++, 1000)
  try {
    const { id } = await $fetch<{ id: string }>('/api/osarai/sets', {
      method: 'POST',
      body: { theme: theme.value.trim(), count: count.value },
      // ふつうは20〜40秒。応答が返らないまま待たせ続けないよう上限を置く
      timeout: 120_000,
    })
    await router.push(`/osarai/${id}`)
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || '問題をつくれませんでした。もう一度お試しください。'
    generating.value = false
  } finally {
    if (tick) clearInterval(tick)
    tick = null
  }
}
</script>
