<template>
  <div class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4">
    <p class="gh-display font-bold text-[15px] mb-1">このお客様専用の共有リンク</p>
    <p class="text-[11.5px] text-[var(--gh-ink-soft)] leading-relaxed mb-3">
      このお客様に、下のリンクまたはQRコードをお渡しください。ログイン不要でチャットに入れます。1人につき1つのリンク＝1つの会話・日記になります。
    </p>

    <div class="flex items-center gap-2 mb-3">
      <input :value="shareUrl" readonly class="gh-input !py-2 text-[12.5px] text-[var(--gh-ink-soft)]" @focus="selectAll" />
      <button type="button" class="gh-btn-ghost !h-10 shrink-0" @click="copy">{{ copied ? 'コピー済' : 'コピー' }}</button>
    </div>

    <div class="flex flex-col items-center gap-2 py-2">
      <div ref="qrEl" class="gh-qr rounded-xl bg-white p-3 border border-[var(--gh-line)]" />
      <a :href="shareUrl" target="_blank" rel="noopener" class="text-[12px] text-[var(--gh-forest-deep)] underline underline-offset-2">
        プレビューを開く
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

// token はお客様1人ぶんの滞在セッションのトークン。この URL がその会話を指す。
const props = defineProps<{ token: string }>()

const qrEl = ref<HTMLElement | null>(null)
const copied = ref(false)

const shareUrl = computed(() =>
  typeof window !== 'undefined' ? `${window.location.origin}/guesthouse/stay/${props.token}` : ''
)

function selectAll(e: FocusEvent) {
  ;(e.target as HTMLInputElement).select()
}

async function copy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    /* クリップボード不可の環境は無視（手動選択でコピー可能） */
  }
}

// QRコードはブラウザ内で生成する（宿URLを外部サービスに送らない）。
// qrcode-generator を CDN から一度だけ読み込み、SVG として描画する。
function loadQrLib(): Promise<any> {
  const w = window as any
  if (w.qrcode) return Promise.resolve(w.qrcode)
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('qrcode-generator-lib') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(w.qrcode))
      existing.addEventListener('error', reject)
      return
    }
    const s = document.createElement('script')
    s.id = 'qrcode-generator-lib'
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'
    s.onload = () => resolve(w.qrcode)
    s.onerror = reject
    document.head.appendChild(s)
  })
}

async function renderQr() {
  if (!qrEl.value || !shareUrl.value) return
  try {
    const qrcode = await loadQrLib()
    const qr = qrcode(0, 'M')
    qr.addData(shareUrl.value)
    qr.make()
    qrEl.value.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 0, scalable: true })
    const svg = qrEl.value.querySelector('svg')
    if (svg) {
      svg.setAttribute('width', '168')
      svg.setAttribute('height', '168')
    }
  } catch {
    qrEl.value.innerHTML = '<p class="text-[11px] text-[var(--gh-ink-soft)]">QRの生成に失敗しました。リンクをお使いください。</p>'
  }
}

onMounted(renderQr)
watch(() => props.token, renderQr)
</script>
