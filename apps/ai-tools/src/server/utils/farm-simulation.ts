// 農家向け 経営シミュレーション (farm-simulation) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りする（farm-manager と同じ）。
//
// 状態（実績・前提条件・対応策）は1ユーザー1行の JSON として持ち、encrypt.ts で暗号化して保存する。
// 確定申告の数字は家計に直結する個人の情報なので平文では置かない。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { encryptComment, decryptComment } from '~/server/utils/encrypt'
import { emptyState } from '~/types/farm-simulation'
import type { SimState } from '~/types/farm-simulation'

/** 保存できる状態の上限。数字だけなので通常は数KB。壊れたクライアントが巨大な値を送るのを防ぐ。 */
export const FARM_SIM_MAX_BYTES = 300 * 1024

/** dev/未マイグレーション環境向けの保険。D1 の exec() は改行で文を切るので prepare().run() で流す。 */
export async function ensureFarmSimulationTables(db: any): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS farm_simulation_state (
        user_id TEXT PRIMARY KEY,
        data TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run()
}

/** ログイン確認・DB確認・テーブル用意までを1回で行う（各APIの入口）。 */
export async function initFarmSimulation(event: any): Promise<{ db: any; user: { id: string; username: string } }> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  await ensureFarmSimulationTables(db)
  return { db, user }
}

export async function loadState(event: any, db: any, userId: string): Promise<{ state: SimState; updatedAt: string | null }> {
  const row = await db
    .prepare('SELECT data, updated_at FROM farm_simulation_state WHERE user_id = ?')
    .bind(userId)
    .first()
  if (!row?.data) return { state: emptyState(), updatedAt: null }
  try {
    const parsed = JSON.parse(await decryptComment(event, row.data as string))
    // 項目を足したときに古い保存データでも壊れないよう、既定値の上に重ねる
    const base = emptyState()
    return {
      state: {
        ...base,
        ...parsed,
        assumptions: { ...base.assumptions, ...(parsed.assumptions ?? {}) },
        strategies: Array.isArray(parsed.strategies) && parsed.strategies.length ? parsed.strategies : base.strategies,
      },
      updatedAt: row.updated_at as string,
    }
  } catch {
    throw createError({ statusCode: 500, message: '保存データを読み込めませんでした' })
  }
}

export async function saveState(event: any, db: any, userId: string, state: SimState): Promise<string> {
  const json = JSON.stringify(state)
  if (json.length > FARM_SIM_MAX_BYTES) throw createError({ statusCode: 413, message: 'データが大きすぎます' })
  const enc = await encryptComment(event, json)
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO farm_simulation_state (user_id, data, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    )
    .bind(userId, enc, now)
    .run()
  return now
}
