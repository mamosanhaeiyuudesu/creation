// farm-manager の Claude 呼び出しを集約する。
// 読み取り精度・仕訳の匙加減はここだけ触ればよい（news-ai.ts / kikigaki-ai.ts と同じ方針）。
//
// 主たる入力対象は「レシート」ではなく「納品書」である（仕様§4-2）。
// 農家は資材店で「毎度」と言って商品を受け取り、その場では払わず伝票だけ切ってもらい、
// 後日まとめて精算する＝掛け払いが主流。だから発生日（納品日）と支払日を分けて読み取る。
import { callClaudeVision, parseJsonLoose } from '~/server/utils/anthropic'
import type { AccountMaster } from '~/types/farm-manager'

/** 勘定科目マスタ全件をプロンプトへ渡す（仕様§4-3）。定義済みコード以外を返させないため。 */
function accountCatalog(accounts: AccountMaster[]): string {
  const groups: { key: string; label: string }[] = [
    { key: 'A_REVENUE', label: 'A. 売上高（入金側。納品書・レシートではまず出てこない）' },
    { key: 'B_VARIABLE', label: 'B. 原価計＝変動費（畑の中で発生する経費。売上・栽培規模に比例して増減する）' },
    { key: 'D_FIXED', label: 'D. 販管費計＝固定費（畑の外で発生する費用。売上・規模に比例しない）' },
    { key: 'F_NON_OPERATING', label: 'F. 営業外損益（補助金・助成金・利息。売上には混ぜない）' },
    { key: 'H_FINANCE', label: 'H. 資金の出入り（借入・返済。損益ではない）' },
  ]
  return groups
    .map((g) => {
      const rows = accounts
        .filter((a) => a.category === g.key)
        .map((a) => {
          const flags = [a.isProvisionalBucket ? '仮置き用' : '', a.splitRisk ? '用途で変動/固定が割れる' : '']
            .filter(Boolean)
            .join('・')
          return `  ${a.code}\t${a.name}${a.note ? `（${a.note}）` : ''}${flags ? ` ※${flags}` : ''}`
        })
        .join('\n')
      return `${g.label}\n${rows}`
    })
    .join('\n\n')
}

const SYSTEM_BASE = `あなたは農家の経理アシスタントです。納品書・請求書・レシートの画像から、経営管理に必要な情報だけを正確に読み取り、農業簿記の勘定科目へ仕訳します。

【最重要】完璧な仕訳より、数字が埋まって先に進めることを優先してください。
分類がわからない品目は、無理に当てずに仮置き用科目（VAR999 / FIX999）へ入れて confidence を低くしてください。
あとから人がまとめて振り替えられる仕組みがあります。迷って止まるのがいちばん悪い結果です。

【読み取りの方針】
- 取引先名（vendor_name）は発行元の店舗・JA・会社名。ロゴや社判からでも読み取る。
- occurred_at は「発生日」＝納品日・購入日。納品書なら納品日、レシートなら購入日。YYYY-MM-DD で返す。
  和暦（令和6年7月3日）は西暦に直す。年の記載が無ければ、与えられた基準日の年を使う。読めなければ null。
- paid_at は「支払日」。その場で払った現金レシートなら occurred_at と同じ日。
  納品書・請求書で「後日精算」「〆／末締め翌月払い」等なら null（未払い）にする。読めなければ null。
- payment_type は CASH（その場で支払い済み）か CREDIT（掛け＝ツケ、後日まとめて精算）。
  納品書・伝票・請求書は原則 CREDIT。レジのレシートは原則 CASH。
- 明細は書かれている行をそのまま1行ずつ拾う。小計・消費税・合計の行は明細に含めない。
  ただし消費税が明細と別に立っている場合、total_amount には税込の総額を入れる。
- 金額(amount)は円単位の整数。数量・単価は読めたときだけ入れ、読めなければ null。
- 手書きで潰れている・値引き行がある等、自信が持てない点は warnings に日本語で書く。

【仕訳の方針】
- 変動費(B)＝売上・栽培規模に比例して増減し、かつ畑で発生するもの（肥料・農薬・種苗・袋・農機具の燃料など）。
- 固定費(D)＝売上・規模に比例せず、畑の外で発生するもの（運賃・手数料・通信費・地代家賃・保険など）。
- 資材費は仕入先で分ける。JA（農協）からの購入は FIX001 農協資材費、それ以外の資材店は FIX002 その他資材費。
  ただし袋掛け用の袋など「畑で使い切る資材」は VAR005 資材費（袋等）にする。
- 補助金・助成金は売上ではなく NOP003 助成金収入（営業外）へ入れる。
- 修繕費・燃料費・水道光熱費・車両費は用途で変動費/固定費が割れる。
  画像から用途（農機具用か、営業車・事務所用か）が読み取れないときは confidence を 0.6 以下にする。
- confidence は 0.0〜1.0。「品目名から科目が一意に決まる」なら 0.9 以上、
  「たぶんこれだろう」は 0.5〜0.7、「わからないので仮置き」は 0.3 以下。甘く付けないこと。
- reason は「なぜその科目にしたか」を日本語20字程度で。

必ず JSON のみを返す。前後に説明文やコードブロックの記号を付けない。`

export interface VisionExtractResult {
  vendor_name: string
  occurred_at: string | null
  paid_at: string | null
  payment_type: string
  document_type: string
  items: any[]
  total_amount: number | null
  warnings: string[]
}

/**
 * 納品書・レシート画像を Claude に読ませて構造化する（仕様§4-1 の 1〜3）。
 * 学習ルールの適用と科目の検証は呼び出し側（classifyItems）で行う。ここは読み取りに専念する。
 */
export async function extractDocument(
  apiKey: string,
  opts: { image: string; accounts: AccountMaster[]; referenceDate: string; hint?: string }
): Promise<VisionExtractResult | null> {
  const out = await callClaudeVision(apiKey, {
    system: `${SYSTEM_BASE}

【使用できる勘定科目（このコード以外は絶対に返さないこと）】
${accountCatalog(opts.accounts)}`,
    maxTokens: 2500,
    images: [opts.image],
    text: `基準日（年の記載が無いときはこの年を使う）: ${opts.referenceDate}
${opts.hint ? `\n人からの補足（画像より優先してよい）:\n"""\n${opts.hint}\n"""\n` : ''}
次のスキーマの JSON のみを返してください:
{
  "vendor_name": "取引先名",
  "occurred_at": "YYYY-MM-DD（発生日＝納品日/購入日） or null",
  "paid_at": "YYYY-MM-DD（支払日。未払いなら null） or null",
  "payment_type": "CASH or CREDIT",
  "document_type": "納品書 / 請求書 / レシート / 領収書 のいずれか",
  "items": [
    {
      "item_name": "品目名（書かれているまま）",
      "quantity": 数値 or null,
      "unit_price": 数値 or null,
      "amount": 金額（円・整数）,
      "account_code": "上の一覧にあるコード",
      "cost_type": "VARIABLE / FIXED / NON_OPERATING / FINANCE / REVENUE",
      "confidence": 0.0〜1.0,
      "reason": "その科目にした理由（20字程度）"
    }
  ],
  "total_amount": 合計金額（円・整数） or null,
  "warnings": ["読み取れなかった点・確認してほしい点", "..."]
}`,
  })

  return parseJsonLoose<VisionExtractResult>(out)
}
