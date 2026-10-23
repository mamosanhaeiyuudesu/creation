import { initFarmSimulation } from '~/server/utils/farm-simulation'
import { extractTaxReturn } from '~/server/utils/farm-simulation-ai'
import { EXPENSE_ITEMS, REVENUE_ITEMS } from '~/types/farm-simulation'
import type { TaxYearDraft } from '~/types/farm-simulation'

// 確定申告書（写真・PDF）→ AI が損益計算書の数字を読み取る。
// ⚠ DBには保存しない。下書きとして返し、確認画面で人が直してから「確定」する（9月の誤読み込みの反省）。
// ⚠ 画像・PDFそのものも保存しない。必要なのは数字だけ。

const MAX_FILES = 4
const MAX_TOTAL_BYTES = 20 * 1024 * 1024

function toYen(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[,，円\s]/g, ''))
  return Number.isFinite(n) ? Math.round(n) : 0
}

function toYenOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = toYen(v)
  return n || null
}

export default defineEventHandler(async (event): Promise<TaxYearDraft> => {
  await initFarmSimulation(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{ files?: string[]; name?: string }>(event)
  const files = (Array.isArray(body?.files) ? body.files : []).filter(
    (f) => typeof f === 'string' && /^data:(image\/[\w+.-]+|application\/pdf);base64,/.test(f)
  )
  if (!files.length) throw createError({ statusCode: 400, message: '確定申告書の写真かPDFを送信してください' })
  if (files.length > MAX_FILES) throw createError({ statusCode: 400, message: `一度に読み込めるのは${MAX_FILES}ファイルまでです` })
  if (files.reduce((s, f) => s + f.length * 0.75, 0) > MAX_TOTAL_BYTES) {
    throw createError({ statusCode: 413, message: 'ファイルが大きすぎます。ページを分けて読み込んでください' })
  }

  const parsed = await extractTaxReturn(anthropicApiKey as string, files)
  if (!parsed) throw createError({ statusCode: 502, message: '読み取りに失敗しました。明るいところで撮り直すか、もう一度お試しください。' })

  const revenue: Record<string, number> = {}
  for (const d of REVENUE_ITEMS) revenue[d.key] = toYen(parsed.revenue?.[d.key])
  const expenses: Record<string, number> = {}
  for (const d of EXPENSE_ITEMS) expenses[d.key] = toYen(parsed.expenses?.[d.key])

  const printed = {
    revenueTotal: toYenOrNull(parsed.printed?.revenueTotal),
    expenseTotal: toYenOrNull(parsed.printed?.expenseTotal),
    income: toYenOrNull(parsed.printed?.income),
  }
  const knownKeys = new Set([...REVENUE_ITEMS, ...EXPENSE_ITEMS].map((d) => d.key))
  const uncertain = (Array.isArray(parsed.uncertain) ? parsed.uncertain : []).map(String).filter((k) => knownKeys.has(k))
  const warnings = (Array.isArray(parsed.warnings) ? parsed.warnings : []).map(String).slice(0, 8)

  const thisYear = new Date().getFullYear()
  const rawYear = Number(parsed.year)
  // 年が読めなかったら「去年分」を仮に入れる（確定申告は前年分を出すもの）。確認画面で直せる。
  const year = Number.isInteger(rawYear) && rawYear >= 1990 && rawYear <= thisYear ? rawYear : thisYear - 1
  if (year !== rawYear) warnings.unshift(`対象の年を読み取れなかったので、仮に${year}年分としています。`)

  if (!Object.values(revenue).some(Boolean) && !Object.values(expenses).some(Boolean)) {
    warnings.push('数字を1つも読み取れませんでした。損益計算書のページが写っているか確認してください。')
  }

  return {
    year,
    revenue,
    expenses,
    printed,
    uncertain,
    warnings,
    source: [String(parsed.form_type ?? '').trim(), String(body?.name ?? '').trim()].filter(Boolean).join(' ・ ').slice(0, 120),
  }
})
