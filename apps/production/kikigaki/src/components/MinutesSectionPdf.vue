<template>
  <!-- 確認画面の各セクションだけをPDFにする（A4縦）。画面には出さず、html2canvas で撮ってPDFにする。
       1枚目の「全体のPDF」（MinutesPdfMaker）と違い、AIの要約は通さず全文を載せ、長ければ2枚目以降に続ける。 -->
  <div ref="printRoot" class="kk-sp" aria-hidden="true">
    <template v-if="section">
      <div data-block class="kk-sp-head">
        <p class="kk-sp-heading">{{ section.label }}</p>
        <p class="kk-sp-meta">
          {{ doc.title || '（名前のない議事録）' }}<template v-if="doc.date"> ・ {{ formatDateLabel(doc.date) }}</template>
          <template v-if="people"> ・ {{ doc.mode === 'talk' ? '話し手' : '参加者' }}: {{ people }}</template>
        </p>
      </div>

      <!-- まとめ: 段落ごとに分けておく（ページの切れ目を段落の間に置くため） -->
      <template v-if="section.kind === 'summary'">
        <p v-for="(para, i) in summaryParas" :key="i" data-block class="kk-sp-para">{{ para || ' ' }}</p>
        <p v-if="!summaryParas.length" data-block class="kk-sp-empty">（記載なし）</p>
      </template>

      <template v-else>
        <p v-if="!lines.length" data-block class="kk-sp-empty">（なし）</p>
        <div v-for="(l, i) in lines" :key="i" data-block class="kk-sp-item">
          <p class="kk-sp-main">{{ i + 1 }}. {{ l.main }}</p>
          <p v-if="l.note" class="kk-sp-note">{{ l.note }}</p>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatDateLabel } from '~/utils/formatDate'
import { emptyMinutes } from '~/types/minutes'
import type { EventItem, Minutes, SectionKind } from '~/types/minutes'

interface Line {
  main: string
  note?: string
}

const doc = ref<Minutes>(emptyMinutes())
const section = ref<{ kind: SectionKind; label: string } | null>(null)
const printRoot = ref<HTMLElement | null>(null)

const people = computed(() => doc.value.participants.map((p) => p.trim()).filter(Boolean).join('、'))
const summaryParas = computed(() => (doc.value.summary.trim() ? doc.value.summary.split('\n') : []))

function eventWhen(ev: EventItem): string {
  if (ev.start) return ev.end ? `${ev.start.replace('T', ' ')} 〜 ${ev.end.replace('T', ' ')}` : ev.start.replace('T', ' ')
  return ev.datetime || '日時未定'
}

const lines = computed<Line[]>(() => {
  const d = doc.value
  switch (section.value?.kind) {
    case 'decisions':
    case 'discussions':
    case 'keyMessages':
    case 'topics':
      return d[section.value.kind].map((p) => ({ main: p.content, note: p.note }))
    case 'events':
      return d.eventCandidates.map((ev) => ({
        main: ev.title || '（無題）',
        note: ev.location ? `${eventWhen(ev)} ・ ${ev.location}` : eventWhen(ev),
      }))
    case 'tasks':
      return d.taskCandidates.map((t) => ({
        main: t.task,
        note: `担当: ${t.assignee || '未定'}${t.dueDate || t.due ? ` ・ 期限 ${t.dueDate || t.due}` : ''}`,
      }))
    default:
      return []
  }
})

/** 用紙（A4縦）と上下の余白（mm） */
const PAGE_W = 210
const PAGE_H = 297
const MARGIN_Y = 14

/**
 * ページの切れ目を決める（撮影前の画面上の px で）。
 * 項目・段落の途中で切らないよう、入りきらない項目の頭で次のページに送る。
 * 1つの項目だけで1ページを超えるときは、しかたなくページの高さで切る。
 */
function pageCuts(root: HTMLElement, pageHeightPx: number): number[] {
  const top0 = root.getBoundingClientRect().top
  const total = root.scrollHeight
  const cuts = [0]
  let start = 0
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-block]'))) {
    const r = el.getBoundingClientRect()
    const top = r.top - top0
    const bottom = r.bottom - top0
    while (bottom - start > pageHeightPx) {
      start = top > start ? top : start + pageHeightPx
      cuts.push(start)
    }
  }
  return cuts.filter((c) => c < total)
}

/** セクションをPDFにする。呼び出し側は保存済みの内容を渡すこと */
async function make(
  src: Minutes,
  kind: SectionKind,
  label: string
): Promise<{ pdf: InstanceType<Awaited<typeof import('jspdf')>['jsPDF']>; fileName: string }> {
  doc.value = src
  section.value = { kind, label }
  await nextTick()

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const el = printRoot.value
  if (!el) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')

  const pageHeightPx = (el.offsetWidth * (PAGE_H - MARGIN_Y * 2)) / PAGE_W
  const cuts = pageCuts(el, pageHeightPx)
  const scale = 2
  const canvas = await html2canvas(el, { scale, backgroundColor: '#ffffff' })
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const mmPerPx = PAGE_W / canvas.width

  cuts.forEach((cut, i) => {
    const from = Math.round(cut * scale)
    const to = Math.min(canvas.height, Math.round((cuts[i + 1] ?? el.scrollHeight) * scale))
    if (to <= from) return
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = to - from
    slice.getContext('2d')?.drawImage(canvas, 0, from, canvas.width, to - from, 0, 0, canvas.width, to - from)
    if (i > 0) pdf.addPage()
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, MARGIN_Y, PAGE_W, slice.height * mmPerPx)
  })

  const safeTitle = (src.title || (src.mode === 'talk' ? '話の記録' : '議事録')).replace(/[\\/:*?"<>|]/g, '_')
  const safeLabel = label.replace(/[\\/:*?"<>|]/g, '_')
  return { pdf, fileName: `${safeTitle}_${safeLabel}${src.date ? `_${src.date}` : ''}.pdf` }
}

defineExpose({ make })
</script>

<style scoped>
/* 画面外に実寸の A4 縦幅で置いて撮影する（display:none だと撮影できないので位置をずらすだけ） */
.kk-sp {
  position: fixed;
  top: 0;
  left: -99999px;
  z-index: -1;
  pointer-events: none;
  width: 210mm;
  box-sizing: border-box;
  padding: 0 16mm;
  background: #ffffff;
  color: #23272f;
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
}
.kk-sp p {
  margin: 0;
}
.kk-sp-head {
  padding-bottom: 6px;
  margin-bottom: 12px;
  border-bottom: 1.5px solid #23272f;
}
.kk-sp-heading {
  font-size: 17px;
  font-weight: 700;
}
.kk-sp-meta {
  margin-top: 2px !important;
  font-size: 11px;
  color: #5b6472;
}
.kk-sp-para {
  font-size: 12.5px;
  line-height: 1.9;
  white-space: pre-wrap;
}
.kk-sp-item {
  padding: 6px 0 8px;
  border-bottom: 1px dashed #c9d0da;
}
.kk-sp-main {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.7;
}
.kk-sp-note {
  margin-top: 2px !important;
  padding-left: 1.2em;
  font-size: 12px;
  line-height: 1.8;
  color: #3d4450;
  white-space: pre-wrap;
}
.kk-sp-empty {
  font-size: 12px;
  color: #8593a3;
}
</style>
