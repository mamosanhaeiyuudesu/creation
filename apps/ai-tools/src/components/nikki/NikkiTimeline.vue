<template>
  <section>
    <div v-if="!days.length" class="nk-card px-5 py-8 text-center text-[13px] text-[var(--nk-ink-soft)]">
      {{ loading ? '読み込み中…' : 'まだ記録がありません。上のボタンから、話すか書くかしてみてください。' }}
    </div>

    <!-- 縦に新しい日から並べる。下へ進むほど過去 -->
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="day in days"
        :key="day.date"
        class="nk-card px-4 py-3.5 flex flex-col gap-2.5 transition-colors"
        :class="day.date === today ? 'border-[var(--nk-today)]' : ''"
      >
        <div class="flex items-center justify-between gap-2">
        <button class="text-left flex items-baseline gap-2 min-w-0" @click="emit('select', day.date)">
          <span class="nk-serif text-[16px] leading-none" :class="day.date === today ? 'text-[var(--nk-today)]' : ''">
            {{ formatShortDate(day.date) }}
            <span class="text-[11.5px] font-normal text-[var(--nk-ink-soft)]">({{ weekdayJa(day.date) }})</span>
          </span>
          <span class="text-[10.5px] text-[var(--nk-ink-soft)]">
            {{ day.date === today ? '今日' : yearLabel(day.date) }}
          </span>
          <span class="text-[14px] leading-none text-[var(--nk-ink-soft)]" aria-hidden="true">›</span>
        </button>
        <div class="flex items-center gap-1.5 shrink-0">
          <NikkiPhotoAdd
            :remaining="NIKKI_PHOTO_MAX - day.photos.length"
            :busy="photoBusy"
            @add="(urls) => onAddPhotos(day.date, urls)"
            @error="(m) => onPhotoError(day.date, m)"
          />
          <!-- この日まるごと（全文・予定・追記・サマリ追加）を開く。サマリ1件の「直す」とは別 -->
          <button class="nk-btn-ghost !h-[26px] !px-2 !text-[10px] inline-flex items-center gap-1" @click="emit('select', day.date)">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M14.5 7.5l3 3" /></svg>
            編集
          </button>
        </div>
        </div>

        <p v-if="photoError?.date === day.date" class="m-0 text-[12px] leading-snug text-[var(--nk-today)]">{{ photoError.message }}</p>

        <NikkiPhotoStrip :photos="day.photos" :busy="photoBusy" size="sm" @remove="(id) => onRemovePhoto(day.date, id)" />

        <p v-if="!day.topics.length" class="m-0 text-[12px] text-[var(--nk-ink-soft)] leading-relaxed">
          インパクトのある出来事は拾えませんでした
        </p>

        <ul v-else class="m-0 p-0 list-none flex flex-col gap-1.5">
          <li
            v-for="topic in visibleTopics(day)"
            :key="topic.id"
            class="rounded-lg border px-3 py-2 transition-colors"
            :class="editingId === topic.id ? 'border-[var(--nk-indigo)]' : 'border-[var(--nk-line)]'"
          >
            <template v-if="editingId === topic.id">
              <input v-model="editHeadline" class="nk-input !text-[13px] font-bold mb-1.5" placeholder="見出し" />
              <textarea v-model="editDetail" rows="2" class="nk-input !text-[12px] resize-y mb-1.5" placeholder="具体（1〜2文）" />
              <div class="flex items-center gap-2">
                <button class="nk-btn !h-8 !px-3 !text-[12px]" :disabled="!editHeadline.trim() || busy" @click="commitEdit(day.date, topic)">
                  {{ busy ? '保存中…' : '保存' }}
                </button>
                <button class="nk-btn-ghost !h-8 !px-3 !text-[12px]" @click="editingId = ''">やめる</button>
                <button class="ml-auto text-[11px] text-[var(--nk-ink-soft)] underline underline-offset-2" :disabled="busy" @click="removeTopic(day.date, topic)">消す</button>
              </div>
            </template>
            <template v-else>
              <span class="flex items-start gap-2">
                <span class="text-[13px] font-bold leading-snug">{{ topic.headline }}</span>
                <button
                  class="shrink-0 ml-auto p-1 text-[var(--nk-indigo)]"
                  title="このサマリを直す"
                  aria-label="このサマリを直す"
                  @click="startEdit(topic)"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M14.5 7.5l3 3" /></svg>
                </button>
              </span>
              <span v-if="topic.detail" class="block mt-1 text-[12px] leading-snug text-[var(--nk-ink-soft)]">
                {{ topic.detail }}
              </span>
            </template>
          </li>
        </ul>

        <!-- 5つを超えた分はエクスパンドで見せる（要件: 最大5つ＋残りは展開）。右端はカード下からも日を開ける入口 -->
        <div class="flex items-center justify-between gap-2">
          <button
            v-if="day.topics.length > NIKKI_TIMELINE_VISIBLE"
            class="text-[11.5px] font-bold text-[var(--nk-indigo)] underline underline-offset-2"
            @click="toggle(day.date)"
          >
            {{ expanded.has(day.date) ? '閉じる' : `他${day.topics.length - NIKKI_TIMELINE_VISIBLE}件を見る` }}
          </button>
          <button class="ml-auto text-[11.5px] text-[var(--nk-ink-soft)]" @click="emit('select', day.date)">この日を開く ›</button>
        </div>
      </article>

      <button
        v-if="hasMore"
        class="nk-btn-ghost self-center"
        :disabled="loading"
        @click="onLoadOlder()"
      >{{ loading ? '読み込み中…' : 'もっと過去を見る' }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatShortDate } from '~/utils/nikki-calendar'
import { weekdayJa } from '~/utils/jst'
import { NIKKI_TIMELINE_VISIBLE, NIKKI_PHOTO_MAX } from '~/types/nikki'
import type { NikkiDay, NikkiTopic } from '~/types/nikki'
import NikkiPhotoAdd from '~/components/nikki/NikkiPhotoAdd.vue'
import NikkiPhotoStrip from '~/components/nikki/NikkiPhotoStrip.vue'

const props = defineProps<{
  /** 新しい順（サーバーの返り順）。そのまま上から並べる */
  days: NikkiDay[]
  hasMore: boolean
  loading: boolean
  today: string
  /** 過去を追い読みする */
  onLoadOlder: () => Promise<number>
  photoBusy: boolean
  photoError: { date: string; message: string } | null
  onPhotoError: (date: string, message: string) => void
  onAddPhotos: (date: string, dataUrls: string[]) => Promise<void>
  onRemovePhoto: (date: string, id: string) => Promise<void>
  onPatchTopic: (id: string, patch: { headline: string; detail: string; impact: number }, date: string) => Promise<void>
  onRemoveTopic: (id: string, date: string) => Promise<void>
}>()

const emit = defineEmits<{
  select: [date: string]
}>()

// サマリ（トピック）のその場編集。1度に1件だけ開く
const editingId = ref('')
const editHeadline = ref('')
const editDetail = ref('')
const busy = ref(false)

const startEdit = (topic: NikkiTopic) => {
  editingId.value = topic.id
  editHeadline.value = topic.headline
  editDetail.value = topic.detail
}

const commitEdit = async (date: string, topic: NikkiTopic) => {
  if (!editHeadline.value.trim()) return
  busy.value = true
  await props.onPatchTopic(topic.id, { headline: editHeadline.value, detail: editDetail.value, impact: topic.impact }, date)
  busy.value = false
  editingId.value = ''
}

const removeTopic = async (date: string, topic: NikkiTopic) => {
  if (!confirm(`「${topic.headline}」を消します。よろしいですか？`)) return
  busy.value = true
  await props.onRemoveTopic(topic.id, date)
  busy.value = false
  editingId.value = ''
}

const expanded = ref<Set<string>>(new Set())

const visibleTopics = (day: NikkiDay) =>
  expanded.value.has(day.date) ? day.topics : day.topics.slice(0, NIKKI_TIMELINE_VISIBLE)

const toggle = (date: string) => {
  const next = new Set(expanded.value)
  if (next.has(date)) next.delete(date)
  else next.add(date)
  expanded.value = next
}

/** 同じ年なら省く（毎カードに年が並ぶと読みにくい） */
const yearLabel = (date: string) => {
  const year = date.slice(0, 4)
  return year === props.today.slice(0, 4) ? '' : `${year}年`
}
</script>
