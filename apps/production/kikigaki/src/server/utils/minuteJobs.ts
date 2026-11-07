// 議事録を作る仕事（minute_jobs）。
//
// AIの返事は数十秒〜数分かかる。以前は1回のリクエストで返事を待っていたが、Workers は接続が切れると
// 処理を打ち切るため（waitUntil で延ばせるのも30秒まで）、ブラウザを閉じたりスマホで別のアプリに移ったりすると
// 何も残らなかった。今は「仕事を1行作ってキュー（kikigaki-minutes）に入れ、すぐ返す」→
// キューの受け手（plugins/minute-queue.ts）が裏で作る → 画面は GET /api/minutes/jobs で様子を見る、という流れ。
//
// キューは同じ知らせを2回届けることがあるので、仕事を取るときは status を条件付きで書き換えて1回に絞る。
// キューが止まった・落ちたときの保険として、画面が様子を見に来たときに止まったままの仕事を入れ直す（listJobs）。

import type { H3Event } from 'h3'
import { decryptText, encryptText } from '~/server/utils/encrypt'
import { createRecord } from '~/server/utils/minutes'
import { structureTranscript } from '~/server/utils/minutes-ai'
import { ensureTables, requireDb } from '~/server/utils/db'
import { normalizeTags } from '~/utils/tags'
import { normalizeMode, type MinutesMode } from '~/types/minutes'

/** wrangler.toml の [[queues.producers]] と名前を揃える */
const QUEUE_BINDING = 'MINUTES_QUEUE'

/** AIに頼むのは最大この回数まで（失敗のたびに利用量はかかるので、増やしすぎない） */
const MAX_ATTEMPTS = 3
/** 待ちのまま動かない仕事を入れ直すまでの秒数（キューは普段なら数秒で届く。再試行は30秒あける） */
const PENDING_STALE_SEC = 5 * 60
/** 作っている途中で止まったとみなす秒数（キューの受け手は1回15分で打ち切られるので、それより長く） */
const RUNNING_STALE_SEC = 16 * 60

export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

export interface MinuteJob {
  id: string
  status: JobStatus
  mode: MinutesMode
  recordId: string
  error: string
  createdAt: string
}

/** 仕事に入れておく中身（暗号化して payload に持つ） */
interface JobPayload {
  transcript: string
  audioName: string
  date: string
  tags: string[]
  /** 会議をA4横1枚にまとめるか。この項目を足す前に受け付けた仕事は無いので、無ければ 1枚 */
  onePage?: boolean
}

/**
 * キューの中で既存の部品（D1・暗号化・AI利用量）を使うための最小限のイベント。
 * これらは event.context の cloudflare.env・kkUserId と useRuntimeConfig(event) しか見ない。
 */
function jobEvent(env: any, userId = ''): H3Event {
  return { context: { cloudflare: { env }, nitro: { errors: [] }, kkUserId: userId } } as unknown as H3Event
}

function envOf(event: H3Event): any {
  return (event.context as any).cloudflare?.env ?? {}
}

/** 仕事を1行作る。戻り値はID */
export async function createJob(
  event: H3Event,
  userId: string,
  mode: MinutesMode,
  payload: JobPayload
): Promise<string> {
  const db = requireDb(event)
  await ensureTables(db)
  const id = crypto.randomUUID()
  await db.batch([
    // 知らせ終えた古い仕事はもう使わないので、ここで片付けておく（表を小さく保つ）
    db.prepare('DELETE FROM minute_jobs WHERE user_id = ? AND seen = 1').bind(userId),
    db
      .prepare('INSERT INTO minute_jobs (id, user_id, status, mode, payload) VALUES (?, ?, ?, ?, ?)')
      .bind(id, userId, 'pending', mode, await encryptText(event, JSON.stringify(payload))),
  ])
  return id
}

/**
 * 仕事をキューに入れる。
 * ローカルの nuxt dev ではキューの受け手が動かないので、その場で裏で作る（dev は打ち切られない）。
 * 本番でキューが用意されていない（作り忘れ）ときは、以前と同じくこのリクエストの中で作り切る。
 */
export async function enqueueJob(event: H3Event, jobId: string): Promise<void> {
  const env = envOf(event)
  const queue = env[QUEUE_BINDING]
  if (import.meta.dev) {
    event.waitUntil(runJob(env, jobId).then(() => {}, (e) => console.error('[kikigaki] job failed (dev):', e)))
    return
  }
  if (queue) {
    await queue.send({ jobId })
    return
  }
  console.error(`[kikigaki] キュー ${QUEUE_BINDING} がありません。リクエストの中で作ります（閉じると途中で止まります）`)
  await runJob(env, jobId)
}

/** 失敗の理由を、利用者に見せる文言にする（サーバー側の createError は次の一手を日本語で持っている） */
function userMessage(e: any): string {
  const m = e?.data?.message || e?.statusMessage || (e?.statusCode ? e?.message : '')
  return typeof m === 'string' && m ? m : '議事録を作れませんでした。少し時間をおいて、もう一度お試しください。'
}

/** やり直しても変わらない失敗か（利用量の上限・文章が長すぎるなど 4xx）。AIの混雑や形の崩れ（5xx）はやり直す */
function isPermanent(e: any): boolean {
  const code = Number(e?.statusCode ?? 0)
  return code >= 400 && code < 500
}

/**
 * 仕事を1件こなす。キューの受け手（と dev）から呼ばれる。
 * 戻り値: done／failed＝終わり、retry＝もう一度キューから届けてほしい、skip＝ほかで処理中・処理済み
 */
export async function runJob(env: any, jobId: string): Promise<'done' | 'failed' | 'retry' | 'skip'> {
  const base = jobEvent(env)
  const db = requireDb(base)
  await ensureTables(db)

  // 仕事を取る。待ちのもの、または途中で止まったものだけ（同じ知らせが2回届いても1回だけ作る）
  const claimed = await db
    .prepare(
      `UPDATE minute_jobs SET status = 'running', attempts = attempts + 1, updated_at = datetime('now')
       WHERE id = ? AND (status = 'pending' OR (status = 'running' AND updated_at < datetime('now', ?)))`
    )
    .bind(jobId, `-${RUNNING_STALE_SEC} seconds`)
    .run()
  if (!(claimed?.meta?.changes > 0)) return 'skip'

  const row = await db
    .prepare('SELECT user_id, mode, payload, attempts FROM minute_jobs WHERE id = ?')
    .bind(jobId)
    .first()
  if (!row) return 'skip'

  const event = jobEvent(env, row.user_id)
  try {
    const p = JSON.parse(await decryptText(event, row.payload)) as JobPayload
    const minutes = await structureTranscript(event, p.transcript, normalizeMode(row.mode), p.onePage !== false)
    // 元の議事録で手で直した日付を優先する（AIが読み取る日付より確か）
    if (/^\d{4}-\d{2}-\d{2}$/.test(p.date ?? '')) minutes.date = p.date
    minutes.tags = normalizeTags(p.tags)
    const recordId = await createRecord(event, row.user_id, (p.audioName ?? '').slice(0, 200), p.transcript, minutes)
    await db
      .prepare(
        `UPDATE minute_jobs SET status = 'done', record_id = ?, payload = '', error = '', updated_at = datetime('now') WHERE id = ?`
      )
      .bind(recordId, jobId)
      .run()
    return 'done'
  } catch (e) {
    console.error('[kikigaki] minutes job error:', jobId, row.attempts, (e as any)?.statusCode ?? '', (e as any)?.message ?? e)
    if (isPermanent(e) || Number(row.attempts) >= MAX_ATTEMPTS) {
      await failJob(db, jobId, userMessage(e))
      return 'failed'
    }
    await db
      .prepare(`UPDATE minute_jobs SET status = 'pending', updated_at = datetime('now') WHERE id = ? AND status = 'running'`)
      .bind(jobId)
      .run()
    return 'retry'
  }
}

/** 失敗で終える。元の文章はもう要らないので消す */
async function failJob(db: any, jobId: string, message: string): Promise<void> {
  await db
    .prepare(`UPDATE minute_jobs SET status = 'failed', error = ?, payload = '', updated_at = datetime('now') WHERE id = ?`)
    .bind(message, jobId)
    .run()
}

/**
 * まだ画面に知らせていない仕事（新しい順）。
 * ついでに、止まったままの仕事をキューに入れ直す（キューが知らせを落とした・受け手が途中で落ちたときの保険）。
 */
export async function listJobs(event: H3Event, userId: string): Promise<MinuteJob[]> {
  const db = requireDb(event)
  await ensureTables(db)

  const stale = await db
    .prepare(
      `SELECT id, status, attempts, updated_at FROM minute_jobs
       WHERE user_id = ? AND seen = 0 AND (
         (status = 'pending' AND updated_at < datetime('now', ?)) OR
         (status = 'running' AND updated_at < datetime('now', ?))
       )`
    )
    .bind(userId, `-${PENDING_STALE_SEC} seconds`, `-${RUNNING_STALE_SEC} seconds`)
    .all()
  for (const s of (stale?.results ?? []) as any[]) {
    if (Number(s.attempts) >= MAX_ATTEMPTS) {
      await failJob(db, s.id, '議事録を作れませんでした。少し時間をおいて、もう一度お試しください。')
      continue
    }
    // 同じ画面が続けて見に来ても入れ直すのは1回だけ（updated_at が変わっていなければ書き換える）
    const res = await db
      .prepare(`UPDATE minute_jobs SET status = 'pending', updated_at = datetime('now') WHERE id = ? AND status = ? AND updated_at = ?`)
      .bind(s.id, s.status, s.updated_at)
      .run()
    if (res?.meta?.changes > 0) await enqueueJob(event, s.id)
  }

  const res = await db
    .prepare(
      `SELECT id, status, mode, record_id, error, created_at FROM minute_jobs
       WHERE user_id = ? AND seen = 0 AND created_at > datetime('now', '-2 days')
       ORDER BY created_at DESC LIMIT 20`
    )
    .bind(userId)
    .all()
  return ((res?.results ?? []) as any[]).map((r) => ({
    id: r.id,
    status: r.status as JobStatus,
    mode: normalizeMode(r.mode),
    recordId: r.record_id ?? '',
    error: r.error ?? '',
    createdAt: r.created_at,
  }))
}

/** 画面に知らせ終えた（できた議事録を開いた・失敗を見た）。作っている途中のものは消さない */
export async function markJobSeen(event: H3Event, userId: string, jobId: string): Promise<void> {
  const db = requireDb(event)
  await ensureTables(db)
  await db
    .prepare(`UPDATE minute_jobs SET seen = 1 WHERE id = ? AND user_id = ? AND status IN ('done', 'failed')`)
    .bind(jobId, userId)
    .run()
}
