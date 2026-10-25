// palette（FLUX LoRA 画像生成）のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、データは user_id でスコープする。
// fal.ai のキー（NUXT_FAL_KEY）は自分専用に運営側が持つので、ログイン必須にして他人に使わせない。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { PALETTE_LIMITS } from '~/types/palette'
import { clamp, isHttpsUrl } from '~/utils/palette-fal'
import type {
  PaletteGeneration,
  PaletteImage,
  PaletteLora,
  PaletteMode,
} from '~/types/palette'

export interface PaletteUser {
  id: string
  username: string
}

export const FAL_QUEUE = 'https://queue.fal.run'
export const FAL_ENDPOINTS: Record<PaletteMode, string> = {
  t2i: 'fal-ai/flux-lora',
  i2i: 'fal-ai/flux-lora/image-to-image',
}

/**
 * palette 用テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。
 * D1 の exec() は改行を文区切りとして扱うため、各 CREATE TABLE は1行で書く。
 */
export async function ensurePaletteTables(db: any): Promise<void> {
  await db
    .exec(
      `CREATE TABLE IF NOT EXISTS palette_loras (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '', scale REAL NOT NULL DEFAULT 1, trigger_word TEXT NOT NULL DEFAULT '', memo TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`
    )
    .catch(() => {})
  await db
    .exec(
      `CREATE TABLE IF NOT EXISTS palette_generations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 't2i', prompt_ja TEXT NOT NULL DEFAULT '', prompt TEXT NOT NULL DEFAULT '', params TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'pending', status_url TEXT NOT NULL DEFAULT '', response_url TEXT NOT NULL DEFAULT '', images TEXT NOT NULL DEFAULT '[]', seed INTEGER, error TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`
    )
    .catch(() => {})
  await db
    .exec(
      `CREATE INDEX IF NOT EXISTS idx_palette_generations_user ON palette_generations (user_id, created_at)`
    )
    .catch(() => {})
}

/** ログイン必須。未ログインなら 401 を throw。 */
export async function requirePaletteUser(event: any): Promise<PaletteUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** DB が無い場合に 503 を throw して返す。 */
export function requirePaletteDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  return db
}

export function requireFalKey(event: any): string {
  const { falKey } = useRuntimeConfig(event)
  if (!falKey) throw createError({ statusCode: 500, message: 'fal.ai のキー（NUXT_FAL_KEY）が設定されていません。' })
  return falKey as string
}

export async function falFetch(key: string, url: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(url, {
    ...init,
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

// ── 行 → 型 ──────────────────────────────

function parseJson<T>(raw: unknown, fallback: T): T {
  try {
    return JSON.parse(String(raw ?? '')) as T
  } catch {
    return fallback
  }
}

export function toLora(r: any): PaletteLora {
  return {
    id: r.id,
    name: r.name,
    url: r.url,
    scale: Number(r.scale),
    triggerWord: r.trigger_word,
    memo: r.memo,
  }
}

export function toGeneration(r: any): PaletteGeneration {
  const params = parseJson<PaletteGeneration['params'] & { resultSeed?: string }>(r.params, {})
  return {
    id: r.id,
    mode: r.mode === 'i2i' ? 'i2i' : 't2i',
    promptJa: r.prompt_ja,
    prompt: r.prompt,
    params,
    status: r.status === 'completed' ? 'completed' : r.status === 'failed' ? 'failed' : 'pending',
    images: parseJson<PaletteImage[]>(r.images, []),
    // シードは 20 桁近くあり INTEGER 列に入らない/丸まるので、結果は params の resultSeed（文字列）に持つ
    seed: params.resultSeed ?? (r.seed === null || r.seed === undefined ? null : String(r.seed)),
    error: r.error ?? '',
    createdAt: r.created_at,
  }
}

/** LoRA の入力（作成・更新で共通）を検証して整える。 */
export function parseLoraBody(body: any): { name: string; url: string; scale: number; triggerWord: string; memo: string } {
  const name = String(body?.name ?? '').trim().slice(0, 60)
  const url = String(body?.url ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: '名前を入力してください' })
  if (!isHttpsUrl(url)) throw createError({ statusCode: 400, message: 'URL は https:// で始まるものを入力してください' })
  return {
    name,
    url,
    scale: clamp(body?.scale, PALETTE_LIMITS.scale.min, PALETTE_LIMITS.scale.max, 1),
    triggerWord: String(body?.triggerWord ?? '').trim().slice(0, 200),
    memo: String(body?.memo ?? '').trim().slice(0, 500),
  }
}
