// アップロードされた音声の「長さ（秒）」の見積もり。
// 月間の利用上限を数えるために使う純粋関数（サーバー側だけで使うが、テストしやすいのでここに置く）。
//
// 【なぜクライアントの申告をそのまま信じないか】
// 長さは課金とAPI代に直結するので、ブラウザから送られてきた数字だけを根拠にしたくない。
// ただしファイルの形式によって分かることが違うので、2通りに分けている:
//
//   ①16kHz モノラルWAV（長い会議を分割したときに作られる形）
//     → ヘッダーから正確な秒数が計算できる。これが大半のケース。
//   ②そのまま送られた圧縮音声（20分以内・20MB以内のとき再エンコードせず送る）
//     → 正確な長さはファイルの中身を展開しないと分からないので、ブラウザの申告値を使う。
//       ただし「ファイルサイズから見てありえない短さ」は申告値を採らず、下限値へ丸める。

/** 音声の種類ごとのビットレート上限の目安。これより高音質なファイルはまず来ない（320kbps = 40,000バイト/秒） */
const MAX_PLAUSIBLE_BYTES_PER_SECOND = 40_000

/** 再エンコードせずに送られてくる音声の長さの上限（クライアント側の分割のしきい値と同じ値） */
export const DIRECT_UPLOAD_MAX_SECONDS = 20 * 60

/**
 * WAV のヘッダーから秒数を計算する。WAV でなければ null。
 * 先頭64バイトだけ渡せばよい（ファイル全体を読み込まなくてよいように byteLength を別に受ける）。
 */
export function wavSeconds(header: ArrayBuffer, byteLength: number): number | null {
  if (header.byteLength < 44) return null
  const view = new DataView(header)
  const tag = (offset: number) =>
    String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3))
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null

  const channels = view.getUint16(22, true)
  const sampleRate = view.getUint32(24, true)
  const bitsPerSample = view.getUint16(34, true)
  const bytesPerSecond = (sampleRate * channels * bitsPerSample) / 8
  if (!bytesPerSecond) return null

  // データ部の長さ。ヘッダー44バイトを引いた残りで十分（拡張チャンクがあっても誤差は1秒未満）
  const dataBytes = Math.max(0, byteLength - 44)
  return dataBytes / bytesPerSecond
}

/**
 * 圧縮音声の秒数。ブラウザの申告値を使いつつ、ファイルサイズから見てありえない短さなら下限へ丸める。
 * 申告が無いときもサイズからの下限を使う（0秒として数えないため）。
 */
export function compressedSeconds(byteLength: number, reportedSeconds: number): number {
  const floor = byteLength / MAX_PLAUSIBLE_BYTES_PER_SECOND
  const reported = Number.isFinite(reportedSeconds) && reportedSeconds > 0 ? reportedSeconds : 0
  return Math.min(DIRECT_UPLOAD_MAX_SECONDS, Math.max(floor, reported))
}

/**
 * 利用量として数える秒数を決める。
 * contentType が WAV のときはヘッダーから、それ以外は申告値とサイズから求める。
 */
export function chargeableSeconds(input: {
  byteLength: number
  header: ArrayBuffer
  reportedSeconds: number
}): number {
  const exact = wavSeconds(input.header, input.byteLength)
  if (exact !== null) return Math.round(exact)
  return Math.round(compressedSeconds(input.byteLength, input.reportedSeconds))
}
