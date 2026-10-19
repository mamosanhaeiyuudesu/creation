import { unzipSync, strFromU8 } from 'fflate'

/**
 * 文章ファイルから文字を取り出す（ブラウザ内で完結。ファイルはここでは送信しない）。
 * 対応: テキスト系（.txt .md .csv .json .srt .vtt .html .rtf など、拡張子を問わず文字のファイルならそのまま）
 *       Word（.docx）／PowerPoint（.pptx）／Excel（.xlsx）／OpenDocument（.odt .odp .ods）
 * 非対応: PDF・旧形式の Word（.doc）など。専用のエラーで知らせる。
 */

export const DOCUMENT_ACCEPT =
  '.txt,.md,.markdown,.csv,.tsv,.json,.log,.srt,.vtt,.html,.htm,.xml,.rtf,.docx,.pptx,.xlsx,.odt,.odp,.ods,text/*'

export const UNREADABLE_MESSAGE =
  'このファイルは読み込めませんでした。Word（.docx）やテキストファイルをお試しいただくか、文章を貼り付けてください。'

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

/** XML から文字だけを取り出す。段落の終わりと改行・タブ要素は文字に置き換える */
function xmlToText(xml: string, paragraphClose: RegExp): string {
  return decodeEntities(
    xml
      .replace(paragraphClose, '\n')
      .replace(/<(?:w:tab|text:tab)\s*\/>/g, '\t')
      .replace(/<(?:w:br|w:cr|text:line-break)\s*\/>/g, '\n')
      .replace(/<text:s\s*\/>/g, ' ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 文字コードの取り違えに備える。BOM → UTF-8（厳密）→ Shift_JIS の順で試す */
function decodeBytes(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('shift_jis').decode(bytes)
  }
}

function sortedEntries(files: Record<string, Uint8Array>, pattern: RegExp): string[] {
  return Object.keys(files)
    .filter((n) => pattern.test(n))
    .sort((a, b) => (parseInt(a.match(/(\d+)\.xml$/)?.[1] ?? '0', 10) - parseInt(b.match(/(\d+)\.xml$/)?.[1] ?? '0', 10)))
}

function readZipDocument(bytes: Uint8Array, ext: string): string {
  const files = unzipSync(bytes)
  const read = (name: string) => strFromU8(files[name]!)
  if (ext === 'docx') {
    if (!files['word/document.xml']) throw new Error(UNREADABLE_MESSAGE)
    return xmlToText(read('word/document.xml'), /<\/w:p>/g)
  }
  if (ext === 'pptx') {
    const slides = sortedEntries(files, /^ppt\/slides\/slide\d+\.xml$/)
    if (!slides.length) throw new Error(UNREADABLE_MESSAGE)
    return slides.map((n) => xmlToText(read(n), /<\/a:p>/g)).join('\n\n')
  }
  if (ext === 'xlsx') {
    // 表の位置は捨てて、セルに入っている文字を順に並べる（議事録の材料としてはこれで足りる）
    if (!files['xl/sharedStrings.xml']) throw new Error(UNREADABLE_MESSAGE)
    return xmlToText(read('xl/sharedStrings.xml'), /<\/si>/g)
  }
  // odt / odp / ods
  if (!files['content.xml']) throw new Error(UNREADABLE_MESSAGE)
  return xmlToText(read('content.xml'), /<\/text:(?:p|h)>|<\/table:table-row>/g)
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,style').forEach((el) => el.remove())
  doc.querySelectorAll('br').forEach((el) => el.replaceWith('\n'))
  doc.querySelectorAll('p,div,li,tr,h1,h2,h3,h4,h5,h6').forEach((el) => el.append('\n'))
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

function rtfToText(rtf: string): string {
  return rtf
    .replace(/\\'([0-9a-f]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u(-?\d+)\??/g, (_, n: string) => String.fromCharCode(parseInt(n, 10) & 0xffff))
    .replace(/\\(?:par|line)\b ?/g, '\n')
    .replace(/\\tab\b ?/g, '\t')
    .replace(/\{\\\*[^{}]*\}/g, '')
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .trim()
}

export async function readDocumentText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const bytes = new Uint8Array(await file.arrayBuffer())

  if (['docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods'].includes(ext)) {
    try {
      return readZipDocument(bytes, ext)
    } catch {
      throw new Error(UNREADABLE_MESSAGE)
    }
  }

  // PDF（%PDF）や旧 Word などの中身が文字でないファイルは、文字化けした議事録になる前に止める
  const head = bytes.subarray(0, 8)
  const isZip = head[0] === 0x50 && head[1] === 0x4b
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46
  const isOle = head[0] === 0xd0 && head[1] === 0xcf // .doc .xls .ppt
  if (isZip || isPdf || isOle) throw new Error(UNREADABLE_MESSAGE)

  const text = decodeBytes(bytes)
  // 制御文字だらけ（画像など）は読めないファイルとして扱う
  if (/[\u0000-\u0008\u000e-\u001f]/.test(text.slice(0, 2000))) throw new Error(UNREADABLE_MESSAGE)

  if (ext === 'html' || ext === 'htm' || ext === 'xml') return htmlToText(text)
  if (ext === 'rtf') return rtfToText(text)
  return text
}
