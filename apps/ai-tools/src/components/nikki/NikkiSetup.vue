<template>
  <section class="nk-card px-5 py-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="nk-serif m-0 text-[16px] leading-none">Googleカレンダーの連携</h2>
        <p class="mt-1.5 mb-0 text-[11.5px] text-[var(--nk-ink-soft)] leading-relaxed">
          予定を<strong class="font-bold">読むだけ</strong>の権限で連携します（書き込み・変更はしません）。
          表示したいカレンダーを選んでください。
        </p>
      </div>
      <button v-if="closable" class="nk-btn-ghost !h-8 !px-3 !text-[12px] shrink-0" @click="emit('close')">閉じる</button>
    </div>

    <!-- サーバー側のOAuthクライアントが未設定 -->
    <p v-if="!status.configured" class="mt-3 mb-0 text-[12px] leading-relaxed text-[var(--nk-today)]">
      連携の設定（Google の OAuth クライアント）がまだサーバーに入っていません。
      <code class="text-[11px]">NUXT_NIKKI_GOOGLE_CLIENT_ID</code> ほかを設定すると使えるようになります。
      連携なしでも、日記の記録と読み返しはできます。
    </p>

    <!-- 未連携 -->
    <template v-else-if="!status.connected">
      <a class="nk-btn inline-flex items-center mt-3" href="/api/nikki/google/connect">Googleカレンダーと連携する</a>
      <p class="mt-2 mb-0 text-[11px] text-[var(--nk-ink-soft)]">連携しなくても、日記の記録と読み返しはできます。</p>
    </template>

    <!-- 連携済み → カレンダーを選ぶ -->
    <template v-else>
      <p v-if="!calendars.length" class="mt-3 mb-0 text-[12px] text-[var(--nk-ink-soft)]">カレンダーを読み込み中…</p>

      <div v-else class="mt-3 flex flex-col gap-1.5">
        <label
          v-for="cal in calendars"
          :key="cal.id"
          class="flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors"
          :class="chosen.includes(cal.id) ? 'border-[var(--nk-indigo)] bg-[var(--nk-indigo-soft)]' : 'border-[var(--nk-line)] hover:border-[var(--nk-indigo)]'"
        >
          <input
            type="checkbox"
            class="accent-[var(--nk-indigo)]"
            :checked="chosen.includes(cal.id)"
            :disabled="!chosen.includes(cal.id) && chosen.length >= NIKKI_MAX_CALENDARS"
            @change="toggle(cal.id)"
          />
          <span class="w-[9px] h-[9px] rounded-full shrink-0" :style="{ background: cal.color }" />
          <span class="text-[13px] truncate">{{ cal.summary }}</span>
          <span v-if="cal.primary" class="ml-auto text-[10px] text-[var(--nk-ink-soft)] shrink-0">メイン</span>
        </label>

        <p class="mt-1 mb-0 text-[11px] text-[var(--nk-ink-soft)]">
          選べるのは{{ NIKKI_MAX_CALENDARS }}個までです（選んだ数だけGoogleに問い合わせるため）。
        </p>

        <div class="flex flex-wrap items-center gap-2 mt-2">
          <button class="nk-btn" :disabled="!dirty || saving" @click="emit('save', [...chosen])">
            {{ saving ? '保存中…' : '選択を保存' }}
          </button>
          <button class="nk-btn-ghost" :disabled="saving" @click="emit('disconnect')">連携を解除</button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { NIKKI_MAX_CALENDARS } from '~/types/nikki'
import type { NikkiCalendarOption } from '~/types/nikki'

const props = defineProps<{
  status: { connected: boolean; calendarIds: string[]; configured: boolean }
  calendars: NikkiCalendarOption[]
  saving: boolean
  closable: boolean
}>()

const emit = defineEmits<{
  save: [ids: string[]]
  disconnect: []
  close: []
}>()

const chosen = ref<string[]>([...props.status.calendarIds])

// 一覧を読み込み直したとき・保存が通ったときに、選択状態を合わせ直す
watch(
  () => props.status.calendarIds,
  (ids) => { chosen.value = [...ids] }
)

const dirty = computed(() => {
  const a = [...chosen.value].sort().join('|')
  const b = [...props.status.calendarIds].sort().join('|')
  return a !== b
})

const toggle = (id: string) => {
  if (chosen.value.includes(id)) chosen.value = chosen.value.filter((v) => v !== id)
  else if (chosen.value.length < NIKKI_MAX_CALENDARS) chosen.value = [...chosen.value, id]
}
</script>
