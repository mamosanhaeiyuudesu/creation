// nikki の記録を PDF にする（ブラウザ専用）。
//
// 日本語フォントを jsPDF に埋め込まずに済むよう、kikigaki と同じく HTML を html2canvas で画像にして貼る。
// 1回で全部を画像にすると期間が長いときキャンバスの上限を超えるので、「日」を最小の塊として
// 1ページぶんずつ詰め、ページごとに画像化する（日の途中でページが切れない）。

import { formatShortDate } from '~/utils/nikki-calendar'
import type { NikkiDay } from '~/types/nikki'

const PAGE_W_PX = 700 // 本文の幅（A4の幅 − 左右の余白 ＝ 186mm に対応）
const PAGE_W_MM = 186
const MARGIN_MM = 12
const PAGE_H_MM = 297
const USABLE_H_PX = Math.floor(((PAGE_H_MM - MARGIN_MM * 2) / PAGE_W_MM) * PAGE_W_PX)

function el(tag: string, css: string, text?: string): HTMLElement {
  const e = document.createElement(tag)
  e.style.cssText = css
  if (text !== undefined) e.textContent = text
  return e
}

function dayBlock(day: NikkiDay): HTMLElement {
  const block = el('div', 'padding:10px 0 12px;border-bottom:1px solid #d9d4c7;')
  block.appendChild(
    el('div', 'font-size:15px;font-weight:700;margin-bottom:6px;', `${day.date.slice(0, 4)}年 ${formatShortDate(day.date)}`)
  )
  if (!day.topics.length) {
    block.appendChild(el('div', 'font-size:12px;color:#8a8576;', '（トピックなし）'))
  }
  for (const t of day.topics) {
    const row = el('div', 'margin:0 0 6px 4px;')
    row.appendChild(el('div', 'font-size:13px;font-weight:700;line-height:1.5;', `・${t.headline}`))
    if (t.detail) row.appendChild(el('div', 'font-size:12px;line-height:1.6;color:#4a4739;margin-left:14px;', t.detail))
    block.appendChild(row)
  }
  return block
}

function headerBlock(label: string): HTMLElement {
  const h = el('div', 'padding-bottom:10px;border-bottom:2px solid #22252c;')
  h.appendChild(el('div', 'font-size:22px;font-weight:900;', '日記'))
  h.appendChild(el('div', 'font-size:12px;color:#6b6757;margin-top:4px;', label))
  return h
}

/** 古い日が先頭になるよう並べ直して PDF を保存する。days は新しい順で受け取る。 */
export async function downloadNikkiPdf(
  days: NikkiDay[],
  periodLabel: string,
  fileName: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])

  const sandbox = el('div', `position:fixed;left:-99999px;top:0;width:${PAGE_W_PX}px;background:#fff;color:#22252c;font-family:'Hiragino Sans','Noto Sans JP',sans-serif;`)
  document.body.appendChild(sandbox)

  try {
    const blocks = [headerBlock(periodLabel), ...[...days].reverse().map(dayBlock)]

    // 高さを測って1ページぶんずつ詰める
    for (const b of blocks) sandbox.appendChild(b)
    const heights = blocks.map((b) => b.getBoundingClientRect().height)
    sandbox.textContent = ''

    const pages: HTMLElement[][] = []
    let cur: HTMLElement[] = []
    let used = 0
    blocks.forEach((b, i) => {
      if (cur.length && used + heights[i]! > USABLE_H_PX) {
        pages.push(cur)
        cur = []
        used = 0
      }
      cur.push(b)
      used += heights[i]!
    })
    if (cur.length) pages.push(cur)

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    for (let i = 0; i < pages.length; i++) {
      sandbox.textContent = ''
      for (const b of pages[i]!) sandbox.appendChild(b)
      const canvas = await html2canvas(sandbox, { scale: 2, backgroundColor: '#ffffff' })
      // 1日だけでページを超える場合は縮小して収める
      const hMm = Math.min((canvas.height / canvas.width) * PAGE_W_MM, PAGE_H_MM - MARGIN_MM * 2)
      const wMm = (hMm / canvas.height) * canvas.width
      if (i > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN_MM, MARGIN_MM, wMm, hMm)
      onProgress?.(i + 1, pages.length)
    }
    pdf.save(fileName)
  } finally {
    sandbox.remove()
  }
}
