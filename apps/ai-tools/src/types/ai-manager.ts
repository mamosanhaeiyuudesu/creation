// AI管理（/ai-manager）のデータの形。元は scripts/ai-manager/build.mjs が git の履歴から作る
// src/server/data/ai-manager.json。

export type AiManagerApp = 'ai-tools' | 'kikigaki' | 'manabi' | 'genogram' | 'other'

/** 画面に出すツール。並び順もこのとおり（scripts/ai-manager/build.mjs の TARGETS と同じ） */
export const AI_MANAGER_TOOLS = ['kikigaki', 'manabi', 'nikki', 'miyako', 'genogram'] as const
export type AiManagerTool = (typeof AI_MANAGER_TOOLS)[number]

export const AI_MANAGER_TOOL_LABELS: Record<AiManagerTool, string> = {
  kikigaki: 'キキガキ',
  manabi: 'まなび',
  nikki: '日記',
  miyako: 'miyako',
  genogram: 'ジェノグラム',
}

export type AiManagerChangeType = 'new' | 'model' | 'options' | 'prompt' | 'moved' | 'forked' | 'removed'

export interface AiManagerVersionMeta {
  commit: string
  date: string
  /** ユーザープロンプトが「修正」と言えるほど変わったか（30字未満の直しは false） */
  userChanged: boolean
  path: string
  line: number
  endpoint: string | null
  app: AiManagerApp
  provider: string
  kind: string
  model: string
  options: Record<string, string>
  via: string | null
  change: { types: AiManagerChangeType[]; summary: string | null } | null
}

/** 詳細画面用。system / user はプロンプトの本文（コードから文字列だけを取り出した文章） */
export interface AiManagerVersion extends AiManagerVersionMeta {
  system: string | null
  user: string | null
}

export interface AiManagerSiteMeta {
  id: string
  app: AiManagerApp
  tool: AiManagerTool
  name: string
  feature: string
  path: string
  endpoint: string | null
  status: 'active' | 'removed'
  versions: AiManagerVersionMeta[]
}

export interface AiManagerSite extends Omit<AiManagerSiteMeta, 'versions'> {
  versions: AiManagerVersion[]
}

export interface AiManagerIndex {
  generatedAt: string
  head: string | null
  sites: AiManagerSiteMeta[]
}

export const AI_MANAGER_APP_LABELS: Record<AiManagerApp, string> = {
  'ai-tools': 'ai-tools',
  kikigaki: 'キキガキ本番版',
  manabi: 'まなび',
  genogram: 'ジェノグラム',
  other: 'その他',
}

/** バッジの並び順。プロンプトをいちばん左に（本人の希望） */
const CHANGE_ORDER: AiManagerChangeType[] = ['prompt', 'model', 'options', 'moved', 'forked', 'new', 'removed']
export const sortAiManagerChangeTypes = (types: AiManagerChangeType[]) =>
  [...types].sort((a, b) => CHANGE_ORDER.indexOf(a) - CHANGE_ORDER.indexOf(b))

export const AI_MANAGER_CHANGE_LABELS: Record<AiManagerChangeType, string> = {
  new: '新設',
  model: 'model',
  options: 'option',
  prompt: 'プロンプト',
  moved: '移動',
  forked: '派生',
  removed: '撤去',
}

export const AI_MANAGER_PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
  other: 'その他',
}

export const AI_MANAGER_KIND_LABELS: Record<string, string> = {
  text: 'テキスト',
  vision: '画像の読み取り',
  stt: '文字起こし',
  tts: '読み上げ',
  image: '画像生成',
  embedding: '埋め込み',
  file: 'ファイル',
  other: 'その他',
}

/**
 * オプションの表示。名前はコードのパラメタ名のまま（maxTokens・thinking など。本人の希望）。
 * 値は `MAX_TOKENS = 8000` のような定数の解決結果を数字だけにし、引用符を外す
 */
export function formatAiManagerOption(key: string, value: string): { label: string; value: string } {
  const v = value.replace(/^[A-Z_][A-Z0-9_]*\s*=\s*/, '').replace(/^['"](.*)['"]$/, '$1')
  return { label: key, value: v }
}
