<script setup lang="ts">
// 画面右上の「ご意見」ボタンと、押すと開く匿名の意見フォーム。
// 名前・メールアドレスは聞かず、本文と「どのサービスのどのページか」だけを送る。
defineOptions({ inheritAttrs: false })
const props = defineProps<{ service: string }>()

const MAX = 2000
const open = ref(false)
const text = ref('')
const honey = ref('') // 人間には見えない欄。入っていたらボット
const sending = ref(false)
const done = ref(false)
const error = ref('')
const area = ref<HTMLTextAreaElement | null>(null)
const route = useRoute()

watch(open, async (v) => {
  if (v) {
    done.value = false
    error.value = ''
    await nextTick()
    area.value?.focus()
  }
})

function close() {
  open.value = false
}

async function submit() {
  const message = text.value.trim()
  if (!message || sending.value) return
  sending.value = true
  error.value = ''
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: { service: props.service, message, page: route.path, website: honey.value },
    })
    done.value = true
    text.value = ''
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || '送信できませんでした。時間をおいてもう一度お試しください'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <button type="button" class="fb-open" v-bind="$attrs" aria-label="ご意見を送る" @click="open = true">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    <span class="fb-open-label">ご意見</span>
  </button>

  <Teleport to="body">
    <div v-if="open" class="fb-backdrop" @click.self="close" @keydown.esc="close">
      <div class="fb-dialog" role="dialog" aria-modal="true" aria-labelledby="fb-title">
        <template v-if="!done">
          <h2 id="fb-title" class="fb-title">お客様の声をお聞かせください</h2>
          <p class="fb-note">お名前やメールアドレスは不要です。匿名で送信されます（そのため返信はできません）。</p>
          <form @submit.prevent="submit">
            <textarea
              ref="area"
              v-model="text"
              class="fb-text"
              rows="6"
              :maxlength="MAX"
              placeholder="使ってみて感じたこと、困ったこと、こうなったら嬉しいことなど"
              aria-label="ご意見"
            />
            <!-- ボット避け。画面外に置き、人間は触らない -->
            <input v-model="honey" class="fb-honey" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
            <p v-if="error" class="fb-error" role="alert">{{ error }}</p>
            <div class="fb-actions">
              <span class="fb-count">{{ text.length }} / {{ MAX }}</span>
              <button type="button" class="fb-cancel" @click="close">閉じる</button>
              <button type="submit" class="fb-send" :disabled="!text.trim() || sending">{{ sending ? '送信中…' : '送信する' }}</button>
            </div>
          </form>
        </template>
        <template v-else>
          <h2 id="fb-title" class="fb-title">ありがとうございました</h2>
          <p class="fb-note">いただいたご意見は今後の改善の参考にします。</p>
          <div class="fb-actions"><button type="button" class="fb-send" @click="close">閉じる</button></div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style>
.fb-open, .fb-backdrop {
  --fb-ink: #252c3a; --fb-sub: #5a6272; --fb-line: #c9c8c0; --fb-accent: #c23328; --fb-soft: #fde8e5; --fb-bg: #fff;
}
.fb-open {
  display: inline-flex; align-items: center; gap: 5px; min-height: 32px; padding: 0 12px;
  font-size: 12.5px; font-weight: 700; white-space: nowrap; cursor: pointer;
  color: var(--fb-ink); background: var(--fb-bg); border: 1px solid var(--fb-line); border-radius: 9999px;
  transition: color .15s, border-color .15s, background .15s;
}
.fb-open:hover { color: var(--fb-accent); border-color: var(--fb-accent); background: var(--fb-soft); }
@media (max-width: 420px) { .fb-open-label { display: none; } .fb-open { padding: 0 9px; } }
.fb-backdrop {
  position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 16px;
  background: rgba(20, 28, 40, .45);
}
.fb-dialog {
  width: 100%; max-width: 440px; max-height: calc(100dvh - 32px); overflow-y: auto; padding: 20px;
  color: var(--fb-ink); background: #fff; border-radius: 14px; box-shadow: 0 20px 50px -12px rgba(0, 0, 0, .35);
  font-family: inherit;
}
.fb-title { font-size: 16px; font-weight: 700; }
.fb-note { margin-top: 6px; font-size: 12.5px; line-height: 1.6; color: var(--fb-sub); }
.fb-text {
  display: block; width: 100%; margin-top: 12px; padding: 10px 12px; resize: vertical;
  font: inherit; font-size: 16px; line-height: 1.6; color: var(--fb-ink);
  background: #fff; border: 1px solid var(--fb-line); border-radius: 8px;
}
.fb-text:focus { outline: 2px solid var(--fb-accent); outline-offset: 1px; }
.fb-honey { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
.fb-error { margin-top: 8px; font-size: 13px; color: #c0392b; }
.fb-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.fb-count { margin-right: auto; font-size: 12px; color: var(--fb-sub); }
.fb-cancel, .fb-send { min-height: 40px; padding: 0 18px; font-size: 14px; font-weight: 700; border-radius: 9999px; cursor: pointer; }
.fb-cancel { color: var(--fb-sub); background: transparent; border: 1px solid var(--fb-line); }
.fb-send { color: #fff; background: var(--fb-accent); border: 1px solid var(--fb-accent); }
.fb-send:disabled { opacity: .45; cursor: not-allowed; }
</style>
