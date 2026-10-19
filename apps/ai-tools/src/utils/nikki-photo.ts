// nikki の写真：アップ前にブラウザで縮小する（D1 の1行に収め、読み込みも軽くするため）。

const MAX_EDGE = 1280
const QUALITY = 0.8

/** 画像ファイルを長辺 MAX_EDGE の JPEG data URL にする。読めない形式（ブラウザが開けない HEIC 等）は throw。 */
export async function fileToResizedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください')
  let bitmap: ImageBitmap
  try {
    // 既定でスマホ写真の向き（EXIF）を反映して開く
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('この形式の写真は読み込めませんでした')
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('写真を処理できませんでした')
  // 透過PNGが黒くならないよう白地に敷く
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', QUALITY)
}
