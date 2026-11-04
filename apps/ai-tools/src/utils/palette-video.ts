// palette「テキスト → 動画」の純関数（サーバー・画面・テストから使う）。
// 入力の整形（normalizeVideo）と、書き出し・プレビューで共通のタイムライン（buildTimeline）と字幕の区切り（splitSubtitle）。
import { PALETTE_VOICES, PALETTE_VIDEO_LIMITS } from '../types/palette'
import type { PaletteVideo, PaletteVideoImage, PaletteVideoScene, PaletteVoice } from '../types/palette'
import { clamp, isHttpsUrl } from './palette-fal'

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

export function isVoice(v: unknown): v is PaletteVoice {
  return typeof v === 'string' && (PALETTE_VOICES as readonly string[]).includes(v)
}

function normalizeImage(img: any): PaletteVideoImage | null {
  if (!img || !isHttpsUrl(img.url)) return null
  return {
    generationId: str(img.generationId, 128),
    url: img.url,
    seed: /^\d{1,20}$/.test(String(img.seed ?? '')) ? String(img.seed) : null,
    key: String(img.key ?? '').slice(0, 4000),
  }
}

function normalizeScene(raw: any): PaletteVideoScene | null {
  const id = str(raw?.id, 64)
  if (!id) return null
  const image = normalizeImage(raw?.image)
  const aud = raw?.audio
  const candidates: PaletteVideoImage[] = []
  // 候補が無い古い下書きは、今の絵を1枚目の候補にする
  for (const c of Array.isArray(raw?.candidates) ? raw.candidates : image ? [image] : []) {
    const n = normalizeImage(c)
    if (n && !candidates.some((x) => x.url === n.url)) candidates.push(n)
    if (candidates.length >= PALETTE_VIDEO_LIMITS.candidates) break
  }
  return {
    id,
    narration: str(raw?.narration, PALETTE_VIDEO_LIMITS.narrationChars),
    sceneJa: str(raw?.sceneJa, 1000),
    image,
    candidates,
    audio:
      aud && str(aud.id, 64) && isVoice(aud.voice)
        ? {
            id: str(aud.id, 64),
            text: String(aud.text ?? '').slice(0, PALETTE_VIDEO_LIMITS.narrationChars),
            voice: aud.voice,
            duration: clamp(aud.duration, 0, 120, 0),
          }
        : null,
  }
}

/** 新しく作った絵を候補の先頭に足す（同じ絵は重ねず、古いものから捨てる）。 */
export function addCandidate(list: PaletteVideoImage[], img: PaletteVideoImage): PaletteVideoImage[] {
  return [img, ...list.filter((c) => c.url !== img.url)].slice(0, PALETTE_VIDEO_LIMITS.candidates)
}

/** 画面から来た動画の下書きを検証して整える（保存する形）。id・日時はサーバーが決める。 */
export function normalizeVideo(body: any): Omit<PaletteVideo, 'id' | 'createdAt' | 'updatedAt'> {
  const scenes = (Array.isArray(body?.scenes) ? body.scenes : [])
    .slice(0, PALETTE_VIDEO_LIMITS.scenes.max)
    .map(normalizeScene)
    .filter((s: PaletteVideoScene | null): s is PaletteVideoScene => !!s)
  return {
    title: str(body?.title, 120),
    article: str(body?.article, PALETTE_VIDEO_LIMITS.articleChars),
    style: str(body?.style, 1000),
    voice: isVoice(body?.voice) ? body.voice : 'coral',
    quality: body?.quality === 'high' ? 'high' : 'standard',
    loras: (Array.isArray(body?.loras) ? body.loras : [])
      .filter((l: any) => isHttpsUrl(l?.path))
      .slice(0, 5)
      .map((l: any) => ({ path: l.path, scale: clamp(l.scale, 0, 4, 1), name: str(l.name, 60) })),
    scenes,
  }
}

// ── タイムライン ──────────────────────────────

/** 書き出しの大きさ（インスタのリール） */
export const VIDEO_WIDTH = 1080
export const VIDEO_HEIGHT = 1920
export const VIDEO_FPS = 30
/** 読み上げの前後の間（秒）。最初のシーンの前・最後のシーンの後は少し長めにとる */
export const LEAD_SEC = 0.25
export const TAIL_SEC = 0.45
export const FIRST_LEAD_SEC = 0.5
export const LAST_TAIL_SEC = 1.2
/** 次の絵へ重ねて切り替える長さ（秒） */
export const CROSSFADE_SEC = 0.5
/** 音声がまだ無いシーンの仮の長さ（日本語の読み上げは1秒あたり約6字） */
export const CHARS_PER_SEC = 6

export interface TimelineScene {
  index: number
  /** このシーンの絵が出はじめる時刻 */
  start: number
  /** 次のシーンへ切り替わり終える時刻（最後のシーンは動画の終わり） */
  end: number
  /** 読み上げが始まる時刻と長さ */
  speechStart: number
  speechDuration: number
}

export function estimateSpeechSec(text: string): number {
  return Math.max(2, text.length / CHARS_PER_SEC)
}

/**
 * シーンごとの読み上げの長さ（秒）から、各シーンの時刻を決める。シーンの長さ＝前の間＋読み上げ＋後の間。
 * 切り替えの重なりは次のシーンの頭に食い込ませず、前のシーンの「後の間」の中で済ませる。
 */
export function buildTimeline(speechSecs: number[]): { scenes: TimelineScene[]; duration: number } {
  const scenes: TimelineScene[] = []
  let t = 0
  speechSecs.forEach((sec, i) => {
    const lead = i === 0 ? FIRST_LEAD_SEC : LEAD_SEC
    const tail = i === speechSecs.length - 1 ? LAST_TAIL_SEC : TAIL_SEC
    const start = t
    const end = start + lead + sec + tail
    scenes.push({ index: i, start, end, speechStart: start + lead, speechDuration: sec })
    t = end
  })
  return { scenes, duration: t }
}

/** 時刻 t に出ているシーンの番号（範囲外は端に寄せる） */
export function sceneAt(scenes: TimelineScene[], t: number): number {
  for (const s of scenes) if (t < s.end) return s.index
  return Math.max(0, scenes.length - 1)
}

// ── 字幕 ──────────────────────────────

/** 字幕1枚の上限（2行ぶん）。超える文は読点で、それも無ければ字数で割る */
export const SUBTITLE_MAX_CHARS = 32

function splitLong(sentence: string): string[] {
  if (sentence.length <= SUBTITLE_MAX_CHARS) return [sentence]
  // 真ん中にいちばん近い読点で割る
  const mid = sentence.length / 2
  let best = -1
  for (let i = 0; i < sentence.length - 1; i++) {
    if ('、，,'.includes(sentence[i]!) && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i
  }
  const cut = best > 0 ? best + 1 : Math.ceil(sentence.length / 2)
  return [...splitLong(sentence.slice(0, cut)), ...splitLong(sentence.slice(cut))]
}

/** 読み上げの文を、字幕1枚ずつに分ける（文末で区切り、長い文は割る）。 */
export function splitSubtitle(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？!?])/)
    .map((s) => s.trim())
    .filter(Boolean)
  return sentences.flatMap(splitLong).map((s) => s.trim()).filter(Boolean)
}

/** 読み上げの中の経過時間 t（秒）に出す字幕。字幕ごとの表示時間は字数に比例させる。 */
export function subtitleAt(chunks: string[], speechDuration: number, t: number): string {
  if (!chunks.length) return ''
  const total = chunks.reduce((n, c) => n + c.length, 0)
  let acc = 0
  for (const c of chunks) {
    acc += (c.length / total) * speechDuration
    if (t < acc) return c
  }
  return chunks[chunks.length - 1]!
}
