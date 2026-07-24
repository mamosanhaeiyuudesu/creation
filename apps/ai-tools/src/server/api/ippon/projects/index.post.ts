import {
  requireIpponUser, requireIpponDb, ensureIpponTables, makeShareToken, normalizeStyle, loadProject,
} from '~/server/utils/ippon'
import { getMeshProvider } from '~/server/utils/ippon-provider'
import { toMassingSpec } from '~/server/utils/ippon-massing'
import type { CreateProjectRequest, Interpretation } from '~/types/ippon'

// 解釈確認で「このまま生成」された案件を作成する。
// 1. 案件レコードを作る
// 2. 3D生成プロバイダ（mock/tripo）でモデルを生成する
// 3. バージョン(v1)として保存する
// 生成は90秒上限（プロバイダ側で担保）。一本道MVPなので作成と生成を1リクエストで行う（仕様§4.3）。
export default defineEventHandler(async (event) => {
  const user = await requireIpponUser(event)
  const db = requireIpponDb(event)
  await ensureIpponTables(db)
  const config = useRuntimeConfig(event)

  const body = await readBody<CreateProjectRequest>(event)
  const sketch = (body?.sketch ?? '').trim()
  if (!/^data:image\/.+;base64,/.test(sketch)) throw createError({ statusCode: 400, message: 'スケッチ画像がありません' })
  const it = body?.interpretation
  if (!it || typeof it !== 'object') throw createError({ statusCode: 400, message: '読み取り結果がありません' })

  const style = normalizeStyle(body?.style)
  const interpretation: Interpretation = {
    category: it.category ?? '什器',
    width_mm: numOrNull(it.width_mm),
    depth_mm: numOrNull(it.depth_mm),
    height_mm: numOrNull(it.height_mm),
    shelves: numOrNull(it.shelves),
    has_legs: !!it.has_legs,
    material: it.material ?? '',
    prompt_en: it.prompt_en ?? '',
    completions: Array.isArray(it.completions) ? it.completions : [],
    summary: it.summary ?? '',
  }
  const title = (body?.title ?? '').trim() || interpretation.category || '無題の案件'

  // ── 3D生成 ──
  const provider = getMeshProvider(config)
  const spec = toMassingSpec(interpretation, style)
  const result = await provider.generate({ sketch, prompt: interpretation.prompt_en, spec })

  // ── 保存 ──
  const projectId = crypto.randomUUID()
  const shareToken = makeShareToken()
  await db
    .prepare('INSERT INTO ippon_projects (id, user_id, title, note, style, share_token) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(projectId, user.id, title, (body?.note ?? '').trim(), style, shareToken)
    .run()
  await db
    .prepare(
      `INSERT INTO ippon_versions (id, project_id, label, sketch_url, interpretation, model_url, provider)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), projectId, 'v1', sketch, JSON.stringify(interpretation), result.modelUrl, result.provider)
    .run()

  return await loadProject(db, { userId: user.id, projectId })
})

function numOrNull(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}
