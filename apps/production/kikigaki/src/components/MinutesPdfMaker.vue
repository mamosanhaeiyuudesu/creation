<template>
  <!-- PDF専用のレイアウト。画面には出さず、html2canvas で撮ってPDFにする。
       確認画面と一覧画面の両方から使う（一覧からは開かずにPDF・ドライブ保存ができる）。
       2つの入れ物がある:
         ① 計測用（measure）: 全ブロックを左右2列に流して、ブロックごとの高さを測る
         ② 出力用（pages）  : 計測で決めたページごとに並べ直したもの。1ページ＝1枚の画像＝PDFの1ページ -->
  <div class="kk-print kk-print--measure" aria-hidden="true">
    <div v-if="measure" ref="measureRoot" class="kk-print-page kk-print-page--measure">
      <div class="kk-print-col" data-col="left">
        <MinutesPrintBlock v-for="(b, i) in measure.left" :key="i" :block="b" :info="headerInfo" />
      </div>
      <div class="kk-print-col kk-print-col--right" data-col="right">
        <MinutesPrintBlock v-for="(b, i) in measure.right" :key="i" :block="b" :info="headerInfo" />
      </div>
    </div>
  </div>

  <div ref="printRoot" class="kk-print" aria-hidden="true">
    <div v-for="(pg, pi) in pages" :key="pi" class="kk-print-page">
      <div class="kk-print-col">
        <MinutesPrintBlock v-for="(b, i) in pg.left" :key="i" :block="b" :info="headerInfo" :class="{ 'is-first': i === 0 }" />
      </div>
      <div class="kk-print-col kk-print-col--right">
        <MinutesPrintBlock v-for="(b, i) in pg.right" :key="i" :block="b" :info="headerInfo" :class="{ 'is-first': i === 0 }" />
      </div>
      <p v-if="pages.length > 1" class="kk-print-pageno">{{ pi + 1 }} / {{ pages.length }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDateLabel } from '~/utils/formatDate'
import { buildPrintBlocks, paginateBlocks } from '~/utils/printLines'
import type { BlockSize, PrintBlock } from '~/utils/printLines'
import { emptyMinutes } from '~/types/minutes'
import type { Minutes } from '~/types/minutes'

/** 今PDFにしている議事録 */
const doc = ref<Minutes>(emptyMinutes())
const printRoot = ref<HTMLElement | null>(null)
const measureRoot = ref<HTMLElement | null>(null)

/** 計測中だけ中身が入る（全ブロックを流した状態） */
const measure = ref<{ left: PrintBlock[]; right: PrintBlock[] } | null>(null)
/** 出力用。ページごとの左右のブロック */
const pages = ref<{ left: PrintBlock[]; right: PrintBlock[] }[]>([{ left: [], right: [] }])

const headerInfo = computed(() => ({
  dateLabel: formatDateLabel(doc.value.date) || '日付が入っていません',
  title: doc.value.title || '（名前のない議事録）',
  peopleLabel: doc.value.mode === 'talk' ? '話し手' : '参加者',
  people: doc.value.participants.map((p) => p.trim()).filter(Boolean).join('、'),
}))

/** 1ページに入る高さ（px）。A4横の高さ210mmから、上下の余白12mmずつを引く（CSSの .kk-print-page と合わせる） */
const MM_TO_PX = 96 / 25.4
const PAGE_CONTENT_PX = (210 - 12 * 2) * MM_TO_PX - 2 // 2pxは計測と描画の誤差の逃げ

/** 列に流したブロックの高さと上下の余白を測る */
function measureColumn(col: HTMLElement | null): BlockSize[] {
  if (!col) return []
  return Array.from(col.querySelectorAll<HTMLElement>('[data-block]')).map((el) => {
    const style = getComputedStyle(el)
    return {
      heading: el.classList.contains('kk-print-heading') || el.classList.contains('kk-print-subheading'),
      top: parseFloat(style.marginTop) || 0,
      height: el.getBoundingClientRect().height,
      bottom: parseFloat(style.marginBottom) || 0,
    }
  })
}

/**
 * 全ブロックを左右の列に流して高さを測り、1枚に入る高さごとにページへ振り分ける。
 * 左右の列は別々に流す（右が長ければ、右だけが2枚目に続く）。縮小も要約もしない。
 */
async function buildPages(m: Minutes) {
  const blocks = buildPrintBlocks(m)
  measure.value = blocks
  await nextTick()
  // フォントの読み込み前後で行の折り返しが変わるので、読み込みを待ってから測る
  await (document as any).fonts?.ready
  const root = measureRoot.value
  const leftPages = paginateBlocks(measureColumn(root?.querySelector('[data-col="left"]') ?? null), PAGE_CONTENT_PX)
  const rightPages = paginateBlocks(measureColumn(root?.querySelector('[data-col="right"]') ?? null), PAGE_CONTENT_PX)
  const count = Math.max(leftPages.length, rightPages.length)
  pages.value = Array.from({ length: count }, (_, p) => ({
    left: (leftPages[p] ?? []).map((i) => blocks.left[i]!),
    right: (rightPages[p] ?? []).map((i) => blocks.right[i]!),
  }))
  measure.value = null
  await nextTick()
}

/**
 * 議事録からPDFを組み立てる。呼び出し側は保存済みの内容（確認画面なら保存した直後のもの）を渡すこと。
 * html2canvas / jspdf は重いので、ここで初めて読み込む。
 * 1枚に収まらないときは、収まらない分を2枚目以降の同じ列に続ける（文字は縮めない）。
 */
async function make(src: Minutes): Promise<{ pdf: InstanceType<Awaited<typeof import('jspdf')>['jsPDF']>; fileName: string }> {
  doc.value = src
  await nextTick()
  await buildPages(src)

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const els = Array.from(printRoot.value?.querySelectorAll<HTMLElement>('.kk-print-page') ?? [])
  if (!els.length) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')

  // 画像にしてから貼るのは、日本語フォントをPDFへ埋め込む手間を避けるため。
  // 1ページの要素はちょうどA4横（297×210mm）の大きさなので、そのまま貼れば縮尺は変わらない。
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  for (let i = 0; i < els.length; i++) {
    const canvas = await html2canvas(els[i]!, { scale: 2, backgroundColor: '#ffffff' })
    if (i > 0) pdf.addPage('a4', 'landscape')
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210)
  }

  return { pdf, fileName: pdfFileName(src) }
}

/** ファイル名（ドライブでは同じ名前のPDFを上書きするので、名前の付け方を変えるときは注意） */
function pdfFileName(m: Minutes): string {
  const safeTitle = (m.title || (m.mode === 'talk' ? '話の記録' : '議事録')).replace(/[\/:*?"<>|]/g, '_')
  return m.date ? `${safeTitle}_${m.date}.pdf` : `${safeTitle}.pdf`
}

defineExpose({ make })
</script>

<style>
/* ── PDF専用テンプレート ──
   画面外（left: -99999px）に実寸のA4横サイズで置いておき、html2canvas で撮影してPDFへ埋め込む。
   display:none にすると撮影できないため、位置をずらすだけにしている。
   MinutesPrintBlock の中身にも効かせるため scoped にしていない（クラスは kk-print- で始めて衝突を避ける）。 */
.kk-print {
  position: fixed;
  top: 0;
  left: -99999px;
  z-index: -1;
  pointer-events: none;
}

/* 1ページ＝ちょうどA4横。中身が多いときは次のページに続けるので、はみ出した分は切る（計測が合っていれば出ない） */
.kk-print-page {
  position: relative;
  width: 297mm;
  height: 210mm;
  box-sizing: border-box;
  padding: 12mm 14mm;
  overflow: hidden;
  background: #ffffff;
  color: #23272f;
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
  display: grid;
  grid-template-columns: 1fr 1fr;
}
/* 計測用: 高さを固定せず、全ブロックを流した高さをそのまま測る */
.kk-print-page--measure {
  height: auto;
  overflow: visible;
  align-items: start;
}

/* 列は縦に積むだけ。flex にして、隣り合うブロックの余白が重なって潰れない（高さの足し算が合う）ようにしている */
.kk-print-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-right: 8mm;
}

.kk-print-col--right {
  padding-left: 8mm;
  padding-right: 0;
  border-left: 1px solid #23272f;
}

/* ページの先頭のブロックは、上の余白を付けない（前のページからの続きでも頭がそろうように） */
.kk-print-col > .is-first {
  margin-top: 0;
}

.kk-print-pageno {
  position: absolute;
  right: 14mm;
  bottom: 4mm;
  margin: 0;
  font-size: 10px;
  color: #9aa1ab;
}

.kk-print-header {
  font-size: 15px;
  font-weight: 700;
  padding-bottom: 6px;
  margin-bottom: 10px;
  border-bottom: 1.5px solid #23272f;
  letter-spacing: 0.02em;
}
.kk-print-date {
  margin-right: 10px;
}
.kk-print-participants {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
  color: #5b6472;
}

.kk-print-heading {
  font-size: 12.5px;
  font-weight: 700;
  margin: 12px 0 6px;
  padding-bottom: 3px;
  border-bottom: 1px solid #23272f;
}
/* 見出しの直後が先頭（ヘッダーの次）の「概要」は、ヘッダーの下の余白だけにする */
.kk-print-header + .kk-print-heading {
  margin-top: 0;
}

.kk-print-body {
  font-size: 11.5px;
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 0;
}
/* 概要の【見出し】の行は、前の段落との間を少し空ける */
.kk-print-body--lead {
  margin-top: 6px;
}
.kk-print-heading + .kk-print-body--lead {
  margin-top: 0;
}

/* 概要欄の中に「話し合ったこと」を同居させるための小見出し。kk-print-heading より控えめにして
   「概要のなかの一部」に見えるようにする */
.kk-print-subheading {
  font-size: 11px;
  font-weight: 700;
  color: #5b6472;
  margin: 10px 0 4px;
}

.kk-print-item {
  font-size: 11.5px;
  line-height: 1.7;
  margin: 0 0 6px;
  padding-left: 1.1em;
  text-indent: -1.1em;
}

.kk-print-item-note {
  display: block;
  padding-left: 1.1em;
  font-size: 10px;
  color: #5b6472;
  text-indent: 0;
}

.kk-print-empty {
  font-size: 11px;
  color: #9aa1ab;
  margin: 0;
}
</style>
