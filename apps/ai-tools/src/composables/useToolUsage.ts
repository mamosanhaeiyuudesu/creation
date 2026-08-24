import { computed, onMounted, ref } from 'vue'
import { findToolByPath, type Tool } from '~/utils/tools'

const STORAGE_KEY = 'ai-tools:usage'

/** トップに並べる「よく使う」の数 */
export const FREQUENT_LIMIT = 5

export type UsageEntry = { count: number; lastUsedAt: number }
export type UsageMap = Record<string, UsageEntry>

/** 利用回数は端末内（localStorage）だけに置く。サーバーには送らない。 */
function readUsage(): UsageMap {
  if (typeof localStorage === 'undefined') return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return {}
  }
  if (!parsed || typeof parsed !== 'object') return {}

  // 手で書き換えられる場所なので、ツール一覧にある path と数値だけを通す
  const usage: UsageMap = {}
  for (const [path, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!findToolByPath(path)) continue
    const { count, lastUsedAt } = (value ?? {}) as Partial<UsageEntry>
    if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) continue
    usage[path] = {
      count: Math.floor(count),
      lastUsedAt: typeof lastUsedAt === 'number' && Number.isFinite(lastUsedAt) ? lastUsedAt : 0,
    }
  }
  return usage
}

function writeUsage(usage: UsageMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage))
  } catch {
    // プライベートブラウズなどで書けなくても、集計が消えるだけなので黙って諦める
  }
}

/** ツールを1回開いたことを記録する。plugins/tool-usage.client.ts から呼ぶ。 */
export function recordToolUsage(path: string) {
  const tool = findToolByPath(path)
  if (!tool) return
  const usage = readUsage()
  const current = usage[tool.path]
  usage[tool.path] = { count: (current?.count ?? 0) + 1, lastUsedAt: Date.now() }
  writeUsage(usage)
}

export function useToolUsage() {
  const usage = ref<UsageMap>({})

  // localStorage はサーバーには無いので、ハイドレーション後に読む
  onMounted(() => {
    usage.value = readUsage()
  })

  const frequentTools = computed<{ tool: Tool; count: number }[]>(() =>
    Object.entries(usage.value)
      .sort(([, a], [, b]) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
      .slice(0, FREQUENT_LIMIT)
      .flatMap(([path, entry]) => {
        const tool = findToolByPath(path)
        return tool ? [{ tool, count: entry.count }] : []
      })
  )

  function resetUsage() {
    usage.value = {}
    writeUsage({})
  }

  return { usage, frequentTools, resetUsage }
}
