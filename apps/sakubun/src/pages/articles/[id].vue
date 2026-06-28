<template>
  <div class="ar-page">
    <div
      class="ar-bg"
      :style="{ backgroundImage: `url(/images/${article?.id}.png)` }"
    ></div>
    <div class="ar-dim"></div>

    <nav class="ar-nav">
      <NuxtLink to="/" class="ar-back">← 一覧へ</NuxtLink>
      <div class="ar-actions">
        <button
          class="ar-like-btn"
          :class="{ 'ar-liked': liked }"
          @click="toggleLike"
          :aria-label="`いいね ${likeCount}件`"
          :aria-pressed="liked"
        >
          <span class="ar-like-icon" aria-hidden="true">{{ liked ? '♥' : '♡' }}</span>
          <span class="ar-like-count">{{ likeCount }}</span>
        </button>
        <button
          class="ar-comment-toggle"
          @click="showComments = true"
          :aria-label="`コメントを開く（${comments.length}件）`"
        >
          コメント<span v-if="comments.length > 0">（{{ comments.length }}）</span>
        </button>
      </div>
    </nav>

    <Transition name="ar-hint-fade">
      <div v-if="showHint" class="ar-hint" aria-hidden="true">
        <span class="ar-hint-arrow">‹</span>
        <span class="ar-hint-label">続きを読む</span>
      </div>
    </Transition>

    <div class="ar-scroll-area" ref="scrollAreaRef" @scroll.passive="onScrollArea">
      <article v-if="article" class="ar-inner">
        <h1 class="ar-title">{{ article.title }}</h1>
        <div class="ar-body">
          <p v-for="(para, i) in paragraphs" :key="i" class="ar-para">{{ para }}</p>
        </div>
      </article>
      <div v-else class="ar-not-found">
        <p>記事が見つかりません</p>
        <NuxtLink to="/">一覧へ戻る</NuxtLink>
      </div>
    </div>

    <!-- Comment drawer -->
    <Transition name="ar-drawer">
      <div
        v-if="showComments"
        class="ar-overlay"
        @click.self="showComments = false"
        role="presentation"
      >
        <div class="ar-drawer" role="dialog" aria-modal="true" aria-label="コメント">
          <div class="ar-drawer-hd">
            <span class="ar-drawer-hdtitle">コメント</span>
            <button class="ar-drawer-close" @click="showComments = false" aria-label="閉じる">✕</button>
          </div>
          <div class="ar-drawer-bd">
            <form @submit.prevent="submitComment" class="ar-cform" novalidate>
              <input
                v-model="form.name"
                class="ar-input"
                placeholder="お名前"
                maxlength="20"
                required
                autocomplete="nickname"
                :disabled="submitting"
              />
              <textarea
                v-model="form.body"
                class="ar-textarea"
                placeholder="コメントを書いてください"
                maxlength="400"
                required
                rows="3"
                :disabled="submitting"
              ></textarea>
              <div v-if="formError" class="ar-form-error" role="alert">{{ formError }}</div>
              <button type="submit" class="ar-submit" :disabled="submitting">
                {{ submitting ? '送信中…' : '送信する' }}
              </button>
            </form>

            <div class="ar-clist">
              <p v-if="comments.length === 0" class="ar-no-comments">まだコメントがありません</p>
              <div v-for="c in comments" :key="c.id" class="ar-citem">
                <div class="ar-cmeta">
                  <span class="ar-cname">{{ c.name }}</span>
                  <time class="ar-cdate" :datetime="c.created_at">{{ formatDate(c.created_at) }}</time>
                </div>
                <p class="ar-cbody">{{ c.body }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { getArticle } from '~/data/articles'

definePageMeta({ layout: false })

const route = useRoute()
const id = Number(route.params.id)
const article = getArticle(id)

const paragraphs = computed(() =>
  article?.body.split('\n').filter((l) => l.trim() !== '') ?? []
)

// Scroll hint
const scrollAreaRef = ref<HTMLElement | null>(null)
const showHint = ref(false)

onMounted(() => {
  const el = scrollAreaRef.value
  if (!el) return
  showHint.value = el.scrollWidth > el.clientWidth
})

function onScrollArea() {
  showHint.value = false
}

// Like state
const liked = ref(false)
const likeCount = ref(0)

// Comment state
const showComments = ref(false)
const comments = ref<{ id: number; name: string; body: string; created_at: string }[]>([])
const form = reactive({ name: '', body: '' })
const submitting = ref(false)
const formError = ref('')

// Initial data fetch (gracefully degrades when DB is unavailable in local dev)
const [likeData, commentData] = await Promise.all([
  $fetch<{ count: number; liked: boolean }>(`/api/sakubun/likes/${id}`).catch(() => null),
  $fetch<{ comments: typeof comments.value }>(`/api/sakubun/comments/${id}`).catch(() => null),
])

if (likeData) {
  liked.value = likeData.liked
  likeCount.value = likeData.count
}
if (commentData) {
  comments.value = commentData.comments
}

async function toggleLike() {
  const wasLiked = liked.value
  liked.value = !wasLiked
  likeCount.value += wasLiked ? -1 : 1

  try {
    const data = await $fetch<{ count: number; liked: boolean }>(`/api/sakubun/likes/${id}`, { method: 'POST' })
    liked.value = data.liked
    likeCount.value = data.count
  } catch {
    liked.value = wasLiked
    likeCount.value += wasLiked ? 1 : -1
  }
}

async function submitComment() {
  formError.value = ''
  submitting.value = true
  try {
    await $fetch(`/api/sakubun/comments/${id}`, {
      method: 'POST',
      body: { name: form.name, body: form.body },
    })
    const data = await $fetch<{ comments: typeof comments.value }>(`/api/sakubun/comments/${id}`)
    comments.value = data.comments
    form.name = ''
    form.body = ''
  } catch (e: any) {
    formError.value = e?.data?.message ?? '送信に失敗しました'
  } finally {
    submitting.value = false
  }
}

function formatDate(dt: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dt))
}

useHead({
  title: article ? `${article.title} — 心の作文` : '記事が見つかりません — 心の作文',
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✍</text></svg>` },
  ],
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;500;700&family=Noto+Sans+JP:wght@300;400;500&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.ar-page {
  height: 100vh;
  overflow: hidden;
  background: #faf9f6;
  font-family: 'Noto Serif JP', 'Georgia', serif;
  -webkit-font-smoothing: antialiased;
}

.ar-bg {
  position: fixed;
  inset: 0;
  background-size: cover;
  background-position: center;
  z-index: 0;
}

.ar-dim {
  position: fixed;
  inset: 0;
  background: rgba(250, 248, 244, 0.92);
  z-index: 1;
}

/* Nav */
.ar-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: rgba(250, 248, 244, 0.90);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(60, 40, 20, 0.10);
}

.ar-back {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 13px;
  color: #5a3e28;
  text-decoration: none;
  letter-spacing: 0.06em;
  touch-action: manipulation;
  flex-shrink: 0;
}

.ar-back:hover { color: #1e1208; }

.ar-back:focus-visible {
  outline: 2px solid #7a4f2e;
  outline-offset: 4px;
  border-radius: 2px;
}

.ar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* Like button */
.ar-like-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 1px solid rgba(60, 40, 20, 0.20);
  border-radius: 20px;
  padding: 6px 14px;
  cursor: pointer;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 13px;
  color: #5a3e28;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  touch-action: manipulation;
}

.ar-like-btn:hover {
  background: #f3f0eb;
}

.ar-like-btn.ar-liked {
  background: #7a4f2e;
  border-color: #7a4f2e;
  color: #fff;
}

.ar-like-btn.ar-liked:hover {
  background: #5a3e28;
  border-color: #5a3e28;
}

.ar-like-btn:focus-visible {
  outline: 2px solid #7a4f2e;
  outline-offset: 3px;
}

.ar-like-icon { font-size: 14px; }

/* Comment toggle */
.ar-comment-toggle {
  background: none;
  border: 1px solid rgba(60, 40, 20, 0.20);
  border-radius: 20px;
  padding: 6px 14px;
  cursor: pointer;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 13px;
  color: #5a3e28;
  touch-action: manipulation;
  transition: background 0.2s;
}

.ar-comment-toggle:hover { background: #f3f0eb; }

.ar-comment-toggle:focus-visible {
  outline: 2px solid #7a4f2e;
  outline-offset: 3px;
}

/* Article scroll */
.ar-scroll-area {
  position: relative;
  z-index: 10;
  height: 100vh;
  padding-top: 53px;
  overflow-x: scroll;
  overflow-y: hidden;
  direction: rtl;
}

.ar-inner {
  height: calc(100vh - 53px);
  display: inline-flex;
  flex-direction: column;
  writing-mode: vertical-rl;
  text-orientation: upright;
  direction: ltr;
  padding: 56px 72px 56px 80px;
}

.ar-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e1208;
  letter-spacing: 0.12em;
  line-height: 1.6;
  margin-block-end: 28px;
  padding-block-end: 28px;
  border-block-end: 1px solid rgba(60, 40, 20, 0.20);
}

.ar-body { display: contents; }

.ar-para {
  font-size: 17px;
  font-weight: 400;
  color: #2a1a0a;
  line-height: 2.4;
  letter-spacing: 0.08em;
  margin-block-end: 20px;
  padding-block-end: 20px;
  border-block-end: 1px solid rgba(60, 40, 20, 0.12);
}

.ar-para:last-child {
  border-block-end: none;
  padding-block-end: 0;
  margin-block-end: 0;
}

/* Not found */
.ar-not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 53px);
  gap: 16px;
  font-family: 'Noto Sans JP', sans-serif;
  color: #5a3e28;
}

.ar-not-found a {
  color: #3c2814;
  text-decoration: underline;
}

/* Comment drawer */
.ar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.30);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.ar-drawer {
  width: 100%;
  max-height: 70vh;
  background: #faf9f6;
  border-radius: 14px 14px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -4px 24px rgba(30, 18, 8, 0.12);
}

.ar-drawer-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.10);
  flex-shrink: 0;
}

.ar-drawer-hdtitle {
  font-family: 'Noto Serif JP', serif;
  font-size: 15px;
  font-weight: 700;
  color: #1e1208;
  letter-spacing: 0.06em;
}

.ar-drawer-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #8a7060;
  padding: 4px 8px;
  touch-action: manipulation;
  border-radius: 4px;
}

.ar-drawer-close:hover { color: #1e1208; }

.ar-drawer-close:focus-visible {
  outline: 2px solid #7a4f2e;
  outline-offset: 2px;
}

.ar-drawer-bd {
  overflow-y: auto;
  padding: 20px 24px 40px;
  flex: 1;
  overscroll-behavior: contain;
}

/* Comment form */
.ar-cform {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}

.ar-input,
.ar-textarea {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 14px;
  background: #fff;
  border: 1px solid rgba(60, 40, 20, 0.18);
  border-radius: 6px;
  padding: 10px 14px;
  color: #1e1208;
  width: 100%;
  outline: none;
  transition: border-color 0.2s;
}

.ar-input:focus,
.ar-textarea:focus {
  border-color: #7a4f2e;
}

.ar-input:disabled,
.ar-textarea:disabled {
  opacity: 0.6;
}

.ar-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.7;
}

.ar-form-error {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 12px;
  color: #c0392b;
}

.ar-submit {
  align-self: flex-end;
  background: #3c2814;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 24px;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 13px;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.2s;
}

.ar-submit:hover:not(:disabled) { background: #1e1208; }
.ar-submit:disabled { opacity: 0.5; cursor: default; }

.ar-submit:focus-visible {
  outline: 2px solid #7a4f2e;
  outline-offset: 3px;
}

/* Comment list */
.ar-no-comments {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 13px;
  color: #8a7060;
  text-align: center;
  padding: 16px 0;
}

.ar-citem {
  padding: 14px 0;
  border-bottom: 1px solid rgba(60, 40, 20, 0.07);
}

.ar-citem:last-child { border-bottom: none; }

.ar-cmeta {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 6px;
}

.ar-cname {
  font-family: 'Noto Serif JP', serif;
  font-size: 13px;
  font-weight: 700;
  color: #3c2814;
}

.ar-cdate {
  font-size: 11px;
  color: #8a7060;
  font-family: 'Noto Sans JP', sans-serif;
}

.ar-cbody {
  font-family: 'Noto Serif JP', serif;
  font-size: 14px;
  color: #2a1a0a;
  line-height: 1.9;
  white-space: pre-wrap;
}

/* Scroll hint */
.ar-hint {
  position: fixed;
  left: 0;
  top: 53px;
  bottom: 0;
  width: 64px;
  z-index: 15;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(to right, rgba(250, 248, 244, 0.95) 50%, transparent);
  animation: ar-hint-slide 2s ease-in-out infinite;
}

.ar-hint-arrow {
  font-size: 22px;
  color: #8a7060;
  line-height: 1;
}

.ar-hint-label {
  writing-mode: vertical-rl;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 10px;
  color: #8a7060;
  letter-spacing: 0.12em;
}

@keyframes ar-hint-slide {
  0%, 100% { transform: translateX(4px); opacity: 0.6; }
  50% { transform: translateX(-4px); opacity: 1; }
}

.ar-hint-fade-leave-active { transition: opacity 0.5s ease; }
.ar-hint-fade-leave-to { opacity: 0; }

/* Drawer transition */
.ar-drawer-enter-active { transition: opacity 0.25s ease; }
.ar-drawer-leave-active { transition: opacity 0.20s ease; }
.ar-drawer-enter-from,
.ar-drawer-leave-to { opacity: 0; }

.ar-drawer-enter-active .ar-drawer {
  transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
}
.ar-drawer-enter-from .ar-drawer { transform: translateY(100%); }

.ar-drawer-leave-active .ar-drawer {
  transition: transform 0.22s ease-in;
}
.ar-drawer-leave-to .ar-drawer { transform: translateY(100%); }

@media (prefers-reduced-motion: reduce) {
  .ar-drawer-enter-active,
  .ar-drawer-leave-active,
  .ar-drawer-enter-active .ar-drawer,
  .ar-drawer-leave-active .ar-drawer {
    transition: none;
  }
}
</style>
