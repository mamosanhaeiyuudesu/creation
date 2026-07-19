// 写真は R2 を使わず D1 に base64 data URL で保存するため、アップロード前に
// クライアント側で長辺を縮小・JPEG 圧縮して容量を抑える。
export function useKakiImage() {
  const MAX_EDGE = 1280
  const QUALITY = 0.82

  async function fileToDataUrl(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください')

    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('画像の処理に失敗しました')
    // 透過画像でも柿らしい生成りの下地を敷いてから描画する。
    ctx.fillStyle = '#fbf3e4'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    return canvas.toDataURL('image/jpeg', QUALITY)
  }

  return { fileToDataUrl }
}
