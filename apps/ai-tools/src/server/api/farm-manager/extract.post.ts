import { initFarmManager, classifyItems, loadAccounts, loadRules, normalizeDate, normalizePaymentType, toNumber } from '~/server/utils/farm-manager'
import { extractDocument } from '~/server/utils/farm-manager-ai'
import type { Extraction } from '~/types/farm-manager'

// 納品書・レシート画像 → AI構造化抽出 → 変動費/固定費の自動仕訳（仕様§4-1・実装優先度1）。
// ⚠ DBには保存しない。あくまで下書きで、確定は人が確認画面で行う。
// ⚠ 分類が決まらなくても失敗にしない。仮置きして返し、先に進ませる（仕様§3-3）。


/** 明細と合計の差が消費税とみなせる上限。軽減税率8%〜10%＋端数を見て少し広めに取る。 */
const TAX_RATE_LIMIT = 0.12

/** 消費税ぶんを金額の比で各明細へ振り分ける。端数は最も大きい明細に寄せて、合計をぴったり合わせる。 */
function allocateTax(items: { amount: number }[], gap: number): void {
  const sum = items.reduce((s, i) => s + i.amount, 0)
  if (sum <= 0) return
  let allocated = 0
  let largest = 0
  items.forEach((item, i) => {
    const add = Math.floor((item.amount * gap) / sum)
    item.amount += add
    allocated += add
    if (item.amount > items[largest]!.amount) largest = i
  })
  items[largest]!.amount += Math.round(gap - allocated)
}

export default defineEventHandler(async (event): Promise<Extraction> => {
  const { db, user } = await initFarmManager(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{ image?: string; referenceDate?: string; hint?: string }>(event)
  const image = (body?.image ?? '').trim()
  if (!/^data:image\/.+;base64,/.test(image)) throw createError({ statusCode: 400, message: '納品書・レシートの画像を送信してください' })

  const referenceDate =
    normalizeDate(body?.referenceDate) ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

  const [accounts, rules] = await Promise.all([loadAccounts(db, user.id), loadRules(db, user.id)])

  const parsed = await extractDocument(anthropicApiKey as string, {
    image,
    accounts,
    referenceDate,
    hint: (body?.hint ?? '').trim().slice(0, 500),
  })
  if (!parsed) throw createError({ statusCode: 502, message: '読み取りに失敗しました。明るいところで撮り直すか、もう一度お試しください。' })

  const vendorName = String(parsed.vendor_name ?? '').trim()
  const items = classifyItems(parsed.items ?? [], vendorName, accounts, rules)

  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map((w) => String(w)).slice(0, 8) : []
  const total = toNumber(parsed.total_amount)
  const itemSum = items.reduce((sum, i) => sum + (i.amount || 0), 0)

  if (total !== null && items.length) {
    const gap = total - itemSum
    const rate = itemSum > 0 ? gap / itemSum : 0
    if (gap > 0 && rate <= TAX_RATE_LIMIT) {
      // 「明細は税抜・合計は税込」の納品書がほとんどなので、差額を消費税とみなして各明細へ按分する。
      // 勘定科目マスタに消費税の科目は無い＝税込経理が前提。ここで按分しておかないと、
      // 実際に支払う額より1割ほど少ない数字で経営を見ることになる。
      allocateTax(items, gap)
      warnings.push(`消費税ぶん ${Math.round(gap).toLocaleString()}円を各明細に振り分けて、税込の金額にそろえました。`)
    } else if (Math.abs(gap) > Math.max(10, Math.abs(total) * 0.02)) {
      // 消費税では説明のつかないズレ＝行の読み落とし。止めずに気づけるようにする。
      warnings.push(`伝票の合計（${total.toLocaleString()}円）と明細の合計（${itemSum.toLocaleString()}円）が一致しません。抜けている行がないか確認してください。`)
    }
  }
  if (!items.length) warnings.push('明細を1行も読み取れませんでした。手で追加してください。')

  return {
    vendor_name: vendorName,
    occurred_at: normalizeDate(parsed.occurred_at),
    paid_at: normalizeDate(parsed.paid_at),
    payment_type: normalizePaymentType(parsed.payment_type),
    document_type: String(parsed.document_type ?? '').trim(),
    items,
    total_amount: total ?? itemSum,
    warnings,
  }
})
