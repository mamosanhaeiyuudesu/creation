// 3D生成プロバイダの抽象化（仕様§5：複数社を差し替え可能に）。
// この領域は進化が速く半年で最良の選択肢が変わるため、呼び出し側は MeshProvider だけを見る。
//
// 現状:
//   - mock  : Claude の読み取り寸法からグレーのマッシングGLBを即時生成（鍵不要・§9の割り切り）
//   - tripo : Tripo AI の image-to-model。鍵が来たら NUXT_IPPON_PROVIDER=tripo で有効化
//
// 切替は環境変数 NUXT_IPPON_PROVIDER（tripo|mock）。鍵が無ければ自動で mock にフォールバック。

import type { GenerateInput, GenerateResult } from '~/types/ippon'
import { buildMassingGlb } from '~/server/utils/ippon-massing'

export interface MeshProvider {
  readonly name: string
  generate(input: GenerateInput): Promise<GenerateResult>
}

// ── モック: マッシングGLBを手続き生成 ──
class MockProvider implements MeshProvider {
  readonly name = 'mock'
  async generate(input: GenerateInput): Promise<GenerateResult> {
    return { modelUrl: buildMassingGlb(input.spec), format: 'glb', provider: this.name }
  }
}

// ── Tripo AI: image-to-model ──
// ⚠ 鍵が無いため未検証。エンドポイント/レスポンス形は公式ドキュメントで要確認・調整
//   （momo の佐川CSVと同じく、実データで確定させるまでは暫定実装）。
const TRIPO_BASE = 'https://api.tripo3d.ai/v2/openapi'
const POLL_TIMEOUT_MS = 85_000 // 90秒上限（仕様§7）より少し手前で打ち切る
const POLL_INTERVAL_MS = 2_500

class TripoProvider implements MeshProvider {
  readonly name = 'tripo'
  constructor(private apiKey: string) {}

  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.apiKey}`, ...extra }
  }

  /** data URL を Blob 化してアップロードし image_token を得る。 */
  private async uploadSketch(dataUrl: string): Promise<string> {
    const m = dataUrl.match(/^data:(.+?);base64,(.*)$/)
    if (!m) throw createError({ statusCode: 400, message: '線画のデータ形式が不正です' })
    const mime = m[1]
    const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))
    const form = new FormData()
    form.append('file', new Blob([bin], { type: mime }), 'sketch.png')
    const res = await fetch(`${TRIPO_BASE}/upload`, { method: 'POST', headers: this.headers(), body: form })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.data?.image_token) {
      throw createError({ statusCode: 502, message: `Tripo upload 失敗: ${json?.message || res.status}` })
    }
    return json.data.image_token
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const imageToken = await this.uploadSketch(input.sketch)

    // タスク作成（画像＋形状記述プロンプト）。
    const createRes = await fetch(`${TRIPO_BASE}/task`, {
      method: 'POST',
      headers: this.headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({
        type: 'image_to_model',
        file: { type: 'png', file_token: imageToken },
        prompt: input.prompt,
      }),
    })
    const createJson = await createRes.json().catch(() => null)
    const taskId: string | undefined = createJson?.data?.task_id
    if (!createRes.ok || !taskId) {
      throw createError({ statusCode: 502, message: `Tripo task 作成失敗: ${createJson?.message || createRes.status}` })
    }

    // 完了までポーリング（90秒上限）。
    const start = Date.now()
    while (Date.now() - start < POLL_TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS)
      const st = await fetch(`${TRIPO_BASE}/task/${taskId}`, { headers: this.headers() })
      const stJson = await st.json().catch(() => null)
      const status: string = stJson?.data?.status ?? ''
      if (status === 'success') {
        const url: string | undefined =
          stJson?.data?.output?.pbr_model || stJson?.data?.output?.model || stJson?.data?.result?.pbr_model?.url
        if (!url) throw createError({ statusCode: 502, message: 'Tripo 成功したがモデルURLが取得できません' })
        return { modelUrl: url, format: 'glb', provider: this.name, externalId: taskId }
      }
      if (status === 'failed' || status === 'cancelled' || status === 'banned') {
        throw createError({ statusCode: 502, message: `Tripo 生成失敗: ${status}` })
      }
    }
    throw createError({ statusCode: 504, message: '3D生成がタイムアウトしました（90秒）。もう一度お試しください。' })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * ランタイム設定からプロバイダを解決する。
 * tripo 指定でも鍵が無ければ mock にフォールバック（開発・鍵未設定でも動く）。
 */
export function getMeshProvider(config: { ipponProvider?: string; tripoApiKey?: string }): MeshProvider {
  const pick = (config.ipponProvider || 'mock').toLowerCase()
  if (pick === 'tripo' && config.tripoApiKey) return new TripoProvider(config.tripoApiKey)
  return new MockProvider()
}
