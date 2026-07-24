<template>
  <div class="max-w-[1080px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/ippon" class="text-[13px] text-[var(--ip-ink-soft)] hover:text-[var(--ip-accent-soft)]">‹ 案件一覧</NuxtLink>
      <button v-if="isLoggedIn" class="text-[13px] text-[var(--ip-ink-soft)] px-3 py-1.5 rounded-full hover:bg-white/[0.05]" @click="doLogout">ログアウト</button>
    </div>

    <header class="flex items-center gap-2.5 mb-5">
      <span class="text-3xl">📐</span>
      <div>
        <h1 class="ippon-display text-[22px] sm:text-[26px] font-bold leading-none">スケッチから3Dを作る</h1>
        <p class="text-[12px] text-[var(--ip-ink-soft)] mt-1">撮って送るだけ。AIが読み解いてイメージ図を出します</p>
      </div>
    </header>

    <div class="grid lg:grid-cols-2 gap-5 items-start">
      <!-- 左: 入力 -->
      <div class="space-y-4 ip-rise">
        <SketchCapture @captured="onCaptured" @cleared="onCleared" />

        <!-- 写真とセットで渡すメッセージ。読み取り・生成に反映される。 -->
        <div class="ip-card p-4">
          <div class="flex items-baseline justify-between mb-2">
            <p class="text-[12px] font-bold text-[var(--ip-ink)] tracking-wide">メッセージ（顧客の要望・意図）</p>
            <span class="text-[11px] text-[var(--ip-ink-faint)]">任意・AIが反映します</span>
          </div>
          <textarea
            v-model="note"
            rows="4"
            class="ip-input resize-y text-[13px] leading-relaxed"
            placeholder="例: 幅2m前後、木目でナチュラルに。&#10;もっと軽い印象で、脚は細く。&#10;棚はあと1段増やしたい。"
          />
          <p class="mt-1.5 text-[11px] text-[var(--ip-ink-faint)] leading-relaxed">
            寸法・棚段数・材質・雰囲気など、写真に描き切れていない要望を書くほど狙った形に近づきます。
          </p>
        </div>

        <div class="ip-card p-4">
          <p class="text-[12px] font-bold text-[var(--ip-ink-soft)] tracking-wide mb-2">スタイル</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="s in STYLE_PRESETS"
              :key="s.value"
              class="ip-chip"
              :class="{ 'ip-chip--on': style === s.value }"
              @click="style = s.value"
            >{{ s.label }}</button>
          </div>

          <button class="ip-btn w-full mt-4" :disabled="interpreting || !sketch" @click="interpret">
            <span v-if="interpreting" class="inline-block w-4 h-4 rounded-full border-2 border-black/30 border-t-black/80 animate-spin align-middle mr-1.5" />
            {{ interpreting ? 'AIが読み取り中…' : 'AIで読み取る' }}
          </button>
          <p v-if="errorMsg" class="mt-2 text-[12.5px] text-rose-400">{{ errorMsg }}</p>
        </div>
      </div>

      <!-- 右: 解釈確認 → 生成 -->
      <div class="ip-card p-4 ip-rise">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-[15px]">解釈の確認</h2>
          <span v-if="interpretation" class="text-[11px] text-[var(--ip-ink-faint)]">修正してから生成できます</span>
        </div>

        <div v-if="!interpretation" class="text-center text-[var(--ip-ink-soft)] py-16 text-[13px] leading-relaxed">
          スケッチを選んで「AIで読み取る」を押すと、<br />ここに読み取り結果が出ます。
        </div>

        <div v-else-if="generating" class="py-14 text-center">
          <div class="mx-auto w-12 h-12 rounded-full border-[3px] border-[var(--ip-line)] border-t-[var(--ip-accent)] animate-spin mb-4" />
          <p class="text-[14px] font-bold">3Dを生成中…</p>
          <p class="text-[12px] text-[var(--ip-ink-soft)] mt-1">最大90秒ほど。粗くても即出しを優先します。</p>
        </div>

        <template v-else>
          <label class="block mb-4">
            <span class="text-[11.5px] text-[var(--ip-ink-faint)] font-semibold block mb-1">案件名</span>
            <input v-model="title" class="ip-input" :placeholder="interpretation.category || '無題の案件'" />
          </label>

          <InterpretationPanel :it="interpretation" />

          <div class="mt-4 rounded-xl bg-white/[0.03] border border-[var(--ip-line)] p-2.5 text-[11.5px] text-[var(--ip-ink-soft)] leading-relaxed">
            ⚠️ これはイメージ確認用です。寸法は目安で、製作精度は保証しません。
          </div>

          <div class="flex gap-2 mt-4">
            <button class="ip-btn flex-1" @click="generate">このまま生成する</button>
          </div>
        </template>
      </div>
    </div>

    <AuthModal v-if="showAuthModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import SketchCapture from '~/components/ippon/SketchCapture.vue'
import InterpretationPanel from '~/components/ippon/InterpretationPanel.vue'
import { STYLE_PRESETS } from '~/types/ippon'
import type { Interpretation, Project, StylePreset } from '~/types/ippon'

definePageMeta({ layout: 'ippon' })
useHead({ title: 'スケッチから3Dを作る | ippon' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const router = useRouter()

const sketch = ref('')
const note = ref('')
const style = ref<StylePreset>('natural')
const title = ref('')
const interpreting = ref(false)
const generating = ref(false)
const errorMsg = ref('')

// 読み取り結果は reactive にして確認画面で直接編集する。
const interpretation = ref<Interpretation | null>(null)

function onCaptured(dataUrl: string) {
  sketch.value = dataUrl
}
function onCleared() {
  sketch.value = ''
}

async function interpret() {
  if (interpreting.value || !sketch.value) return
  interpreting.value = true
  errorMsg.value = ''
  try {
    const it = await $fetch<Interpretation>('/api/ippon/interpret', {
      method: 'POST',
      body: { sketch: sketch.value, note: note.value, style: style.value },
    })
    interpretation.value = reactive(it)
    title.value = it.category || ''
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'スケッチの読み取りに失敗しました'
  } finally {
    interpreting.value = false
  }
}

async function generate() {
  if (generating.value || !interpretation.value) return
  generating.value = true
  errorMsg.value = ''
  try {
    const project = await $fetch<Project>('/api/ippon/projects', {
      method: 'POST',
      body: {
        title: title.value,
        note: note.value,
        style: style.value,
        sketch: sketch.value,
        interpretation: interpretation.value,
      },
    })
    await router.push(`/ippon/${project.id}`)
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '3Dの生成に失敗しました'
    generating.value = false
  }
}

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(checkAuth)
</script>
