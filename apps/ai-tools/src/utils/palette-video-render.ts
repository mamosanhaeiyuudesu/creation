// palette「記事 → 動画」の描画と書き出し（ブラウザ専用）。
// プレビューも書き出しも同じ drawFrame で1コマずつ描く＝見たとおりに書き出される。
// 書き出しは mediabunny（WebCodecs）で H.264＋AAC の MP4 をブラウザの中で組み立てる（Workers では ffmpeg が使えないため）。
// AAC の音声エンコーダを持たないブラウザには、mediabunny の AAC 拡張（WebAssembly）を足して補う。
import {
  CROSSFADE_SEC,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  sceneAt,
  subtitleAt,
} from './palette-video'
import type { TimelineScene } from './palette-video'

export interface RenderScene {
  image: HTMLImageElement | null
  /** 絵はあるが、まだ読み込んでいる途中 */
  loading?: boolean
  /** 字幕（splitSubtitle 済み） */
  subtitles: string[]
}

const W = VIDEO_WIDTH
const H = VIDEO_HEIGHT
export const SUBTITLE_FONT = '700 52px "Noto Sans JP", "Hiragino Sans", sans-serif'
const SUBTITLE_MAX_WIDTH = 820
const SUBTITLE_LINE_HEIGHT = 74
/** 字幕の箱の下端。インスタのリールは画面の下 2 割ほどに説明文・ボタンが重なるので、その上に置く */
const SUBTITLE_BOTTOM = 1440
/** ゆっくり寄る・引く量（1.08 倍まで） */
const ZOOM = 0.08

// ── 読み込み ──────────────────────────────

const imageCache = new Map<string, Promise<HTMLImageElement>>()

/** 画像を読み込む。fal の画像は access-control-allow-origin: * で返る（実測）ので、crossOrigin を付ければ書き出せる。 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  let p = imageCache.get(url)
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('画像を読み込めませんでした'))
      img.src = url
    })
    p.catch(() => imageCache.delete(url))
    imageCache.set(url, p)
  }
  return p
}

let audioCtx: AudioContext | null = null
/** 再生用の AudioContext。iOS ではクリックの直後に作って resume しないと鳴らないので、再生ボタンの中で最初に呼ぶ。 */
export function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

const audioCache = new Map<string, Promise<AudioBuffer>>()

export function loadAudio(id: string): Promise<AudioBuffer> {
  let p = audioCache.get(id)
  if (!p) {
    p = (async () => {
      const res = await fetch(`/api/palette/video/audio/${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error('読み上げを読み込めませんでした')
      return await getAudioContext().decodeAudioData(await res.arrayBuffer())
    })()
    p.catch(() => audioCache.delete(id))
    audioCache.set(id, p)
  }
  return p
}

/** 字幕のフォント（Google Fonts）を、使う字ぶん読み込んでおく。読み込めなくても代わりの字体で描く。 */
export async function loadSubtitleFont(text: string): Promise<void> {
  try {
    await document.fonts.load(SUBTITLE_FONT, text || 'あ')
  } catch {
    // 代わりの字体で続ける
  }
}

// ── 音声 ──────────────────────────────

export const AUDIO_SAMPLE_RATE = 48000

/** シーンごとの読み上げを、タイムラインの位置に並べた1本の音声にする（無いシーンは無音）。 */
export async function mixAudio(timeline: TimelineScene[], buffers: (AudioBuffer | null)[], duration: number): Promise<AudioBuffer> {
  const length = Math.max(1, Math.ceil(duration * AUDIO_SAMPLE_RATE))
  const ctx = new OfflineAudioContext(2, length, AUDIO_SAMPLE_RATE)
  timeline.forEach((s, i) => {
    const buf = buffers[i]
    if (!buf) return
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(s.speechStart)
  })
  return await ctx.startRendering()
}

// ── 描画 ──────────────────────────────

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, index: number, p: number) {
  const zoom = index % 2 === 0 ? 1 + ZOOM * p : 1 + ZOOM * (1 - p)
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight) * zoom
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  // 寄るシーンと引くシーンを交互にし、横への流れも交互に変える
  const panX = (index % 2 === 0 ? -1 : 1) * (w - W) * 0.3 * (p - 0.5)
  ctx.drawImage(img, (W - w) / 2 + panX, (H - h) / 2, w, h)
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, index: number, loading: boolean) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#3a352d')
  g.addColorStop(1, '#1f1c18')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '700 64px "Noto Sans JP", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`シーン ${index + 1}`, W / 2, H * 0.4)
  ctx.font = '500 36px "Noto Sans JP", sans-serif'
  ctx.fillText(loading ? '絵を読み込んでいます…' : '絵がまだありません', W / 2, H * 0.4 + 80)
}

function drawScene(ctx: CanvasRenderingContext2D, scene: RenderScene | undefined, tl: TimelineScene, t: number) {
  // 前のシーンからの切り替え（CROSSFADE_SEC）のあいだも動いているので、そこから数えた進み具合にする
  const from = tl.start - CROSSFADE_SEC
  const p = Math.min(1, Math.max(0, (t - from) / (tl.end - from)))
  if (scene?.image) drawCover(ctx, scene.image, tl.index, p)
  else drawPlaceholder(ctx, tl.index, !!scene?.loading)
}

/** 日本語は単語の区切りが無いので、1字ずつ測って折り返す。行頭に句読点が来ないよう前の行へ寄せる。 */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    if (line && ctx.measureText(line + ch).width > maxWidth && !'、。，．！？」』）'.includes(ch)) {
      lines.push(line)
      line = ch
    } else {
      line += ch
    }
  }
  if (line) lines.push(line)
  return lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 字幕は、半透明の黒い箱に白い文字（どんな絵の上でも読めるように）。 */
function drawSubtitle(ctx: CanvasRenderingContext2D, text: string) {
  if (!text) return
  ctx.font = SUBTITLE_FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lines = wrapText(ctx, text, SUBTITLE_MAX_WIDTH)
  const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const padX = 36
  const padY = 26
  const boxW = textWidth + padX * 2
  const boxH = lines.length * SUBTITLE_LINE_HEIGHT + padY * 2
  const x = (W - boxW) / 2
  const y = SUBTITLE_BOTTOM - boxH
  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)'
  roundRect(ctx, x, y, boxW, boxH, 22)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y + padY + SUBTITLE_LINE_HEIGHT * (i + 0.5)))
}

/** 時刻 t（秒）の1コマを描く。ctx は VIDEO_WIDTH×VIDEO_HEIGHT のキャンバスのもの。 */
export function drawFrame(ctx: CanvasRenderingContext2D, scenes: RenderScene[], timeline: TimelineScene[], t: number) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  if (!timeline.length) return
  const i = sceneAt(timeline, t)
  const tl = timeline[i]!
  drawScene(ctx, scenes[i], tl, t)
  // 終わりぎわに次のシーンを重ねて切り替える
  const next = timeline[i + 1]
  if (next && t > tl.end - CROSSFADE_SEC) {
    ctx.globalAlpha = Math.min(1, (t - (tl.end - CROSSFADE_SEC)) / CROSSFADE_SEC)
    drawScene(ctx, scenes[i + 1], next, t)
    ctx.globalAlpha = 1
  }
  drawSubtitle(ctx, subtitleAt(scenes[i]?.subtitles ?? [], tl.speechDuration, t - tl.speechStart))
}

// ── 書き出し ──────────────────────────────

/**
 * MP4（H.264＋AAC・1080×1920・30fps）に書き出す。onProgress は 0〜1。
 * 動画のエンコードが使えないブラウザでは、理由を書いた Error を投げる。
 */
export async function exportMp4(
  scenes: RenderScene[],
  timeline: TimelineScene[],
  duration: number,
  audio: AudioBuffer,
  onProgress: (p: number) => void
): Promise<Blob> {
  const mb = await import('mediabunny')
  if (typeof VideoEncoder === 'undefined' || !(await mb.canEncodeVideo('avc', { width: W, height: H, frameRate: VIDEO_FPS }))) {
    throw new Error('このブラウザでは動画を書き出せません。PC の Chrome で開いてください。')
  }
  if (!(await mb.canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: AUDIO_SAMPLE_RATE }))) {
    const { registerAacEncoder } = await import('@mediabunny/aac-encoder')
    registerAacEncoder()
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('キャンバスを用意できませんでした')

  const target = new mb.BufferTarget()
  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target })
  const videoSource = new mb.CanvasSource(canvas, { codec: 'avc', quality: mb.QUALITY_HIGH, keyFrameInterval: 2 })
  const audioSource = new mb.AudioBufferSource({ codec: 'aac', quality: mb.QUALITY_HIGH })
  output.addVideoTrack(videoSource, { frameRate: VIDEO_FPS })
  output.addAudioTrack(audioSource)
  await output.start()

  try {
    await audioSource.add(audio)
    const frames = Math.ceil(duration * VIDEO_FPS)
    for (let f = 0; f < frames; f++) {
      const t = f / VIDEO_FPS
      drawFrame(ctx, scenes, timeline, t)
      await videoSource.add(t, 1 / VIDEO_FPS)
      if (f % 15 === 0) {
        onProgress(f / frames)
        // 画面の進み具合を描かせる
        await new Promise((r) => setTimeout(r, 0))
      }
    }
    await output.finalize()
  } catch (e) {
    await output.cancel().catch(() => {})
    throw e
  }
  onProgress(1)
  if (!target.buffer) throw new Error('書き出しに失敗しました')
  return new Blob([target.buffer], { type: 'video/mp4' })
}
