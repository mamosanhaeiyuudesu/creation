// nikki の写真：アップ前にブラウザで縮小する（D1 の1行に収め、読み込みも軽くするため）。

import { NIKKI_PHOTO_DATAURL_MAX } from '~/types/nikki'

// 長辺→画質の順に、サーバーの上限（NIKKI_PHOTO_DATAURL_MAX）に収まるまで落としていく。
// 固定の 1280px / 0.8 だと、ノイズの多い写真（夜景・細かい模様・スクリーンショット）が上限を超えて送れなかった。
const EDGES = [1280, 1024, 800, 640]
const QUALITIES = [0.8, 0.65, 0.5]
// 上限ぎりぎりを狙わず、少し余裕を持たせる
const TARGET = Math.floor(NIKKI_PHOTO_DATAURL_MAX * 0.9)

/** 画像ファイルを JPEG data URL に縮小する。読めない形式（ブラウザが開けない HEIC 等）は throw。 */
export async function fileToResizedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください')
  let bitmap: ImageBitmap
  try {
    // 既定でスマホ写真の向き（EXIF）を反映して開く
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('この形式の写真は読み込めませんでした')
  }
  try {
    let last = ''
    for (const edge of EDGES) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('写真を処理できませんでした')
      // 透過PNGが黒くならないよう白地に敷く
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      for (const q of QUALITIES) {
        last = canvas.toDataURL('image/jpeg', q)
        if (last.length <= TARGET) return last
      }
    }
    throw new Error('この写真は圧縮しても大きすぎるため追加できませんでした')
  } finally {
    bitmap.close()
  }
}
