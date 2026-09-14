// 納品書・レシートの写真は R2 を使わず D1 に base64 data URL で保存する（kaki / ippon と同じ方式）。
// ただし kaki の観察写真と違い、この画像は AI が文字を読む対象なので潰しすぎてはいけない。
// 長辺1600pxから始めて、上限バイト数に収まるまで品質→サイズの順で落とす。
export function useFarmManagerImage() {
  const MAX_EDGE = 1600
  const MAX_BYTES = 700 * 1024 // D1の1行が重くなりすぎないための目安

  async function fileToDataUrl(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください')

    const bitmap = await createImageBitmap(file)
    let edge = MAX_EDGE
    let quality = 0.85
    let dataUrl = ''

    // 5回まで: 品質を下げ、それでも大きければ長辺を縮める
    for (let attempt = 0; attempt < 5; attempt++) {
      dataUrl = draw(bitmap, edge, quality)
      if (dataUrl.length * 0.75 <= MAX_BYTES) break
      if (quality > 0.6) quality -= 0.1
      else edge = Math.round(edge * 0.8)
    }
    bitmap.close?.()
    return dataUrl
  }

  function draw(bitmap: ImageBitmap, maxEdge: number, quality: number): string {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('画像の処理に失敗しました')
    // 伝票は白地が前提。透過画像でも白を敷いてから描く
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  }

  return { fileToDataUrl }
}
