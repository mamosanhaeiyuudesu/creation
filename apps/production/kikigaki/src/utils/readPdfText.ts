// PDF から文字を取り出す（ブラウザ内で完結。ファイルはどこにも送らない）。
//
// 読めるのは、文字のデータが入っている PDF（Word・Googleドキュメントから書き出したものなど）だけ。
// スキャン・写真の PDF（画像だけ）は文字が無いので、専用のメッセージで断る（OCR はしない）。
// pdf.js は 1MB 以上あるので、PDF を選んだときにだけ読み込む（ふだんの表示を重くしない）。

export const PDF_NO_TEXT_MESSAGE =
  'このPDFには文字のデータが入っていないため読み込めません（スキャンや写真から作ったPDFなど）。テキストを貼り付けてください。'
export const PDF_PASSWORD_MESSAGE =
  'このPDFはパスワードがかかっているため読み込めません。パスワードを外したPDFか、テキストを貼り付けてください。'
export const PDF_UNREADABLE_MESSAGE = 'このPDFは読み込めませんでした。テキストを貼り付けてください。'

/**
 * 見た目は漢字でも、中身が部首用の文字（康熙部首 U+2F00〜、部首補助 U+2E80〜）になっているものを、ふつうの漢字に直す。
 * PDF ではよく起きる（「山」が U+2F2D「⼭」になるなど）。直さないと「山本」で探しても当たらず、AI も別の字として読む。
 * 文章全体を NFKC にはしない（①→1 や 全角英数→半角 など、ほかの字まで変わってしまうため）
 */
export function normalizeRadicals(text: string): string {
  return text.replace(/[\u2E80-\u2EFF\u2F00-\u2FDF]/g, (c) => c.normalize('NFKC'))
}

export async function readPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const task = pdfjs.getDocument({
    data: bytes,
    // 日本語の PDF には、文字の対応表（CMap）が無いと読めない作りのものがある。対応表は、入れた pdf.js と同じ版を CDN から読む
    // （送るのは対応表の名前だけで、PDF の中身は送らない）
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  })
  let doc: Awaited<typeof task.promise>
  try {
    doc = await task.promise
  } catch (e) {
    task.destroy()
    throw new Error((e as Error)?.name === 'PasswordException' ? PDF_PASSWORD_MESSAGE : PDF_UNREADABLE_MESSAGE)
  }

  try {
    const pages: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      let text = ''
      for (const item of content.items) {
        if (!('str' in item)) continue
        text += item.str + (item.hasEOL ? '\n' : '')
      }
      pages.push(text.trim())
    }
    const text = normalizeRadicals(pages.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim())
    if (!text) throw new Error(PDF_NO_TEXT_MESSAGE)
    return text
  } finally {
    task.destroy()
  }
}
