/**
 * ページ内で何度も出てくる値（問い合わせ先・料金・リンク）をここに集約する。
 * 文言を直接書き換えずに、この値を更新すること。
 */
export const site = {
  domain: 'data-vis.insightlens.jp',
  /** 問い合わせ・無料相談の受け口。prototyper と同じ Google フォームを使う */
  contactUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSd_h56W-9kJJRto5rqojYJ9HdDta9hLtcQ4Kk_sUeNL6cCTUQ/viewform?usp=dialog',
  prototyperUrl: 'https://prototyper.insightlens.jp',
  dsInsightUrl: 'https://ds.yahoo.co.jp/service/insight/basic.html',
  miyakoUrl: 'https://prototype.insightlens.jp/miyako',
  /** 料金の目安。miyako の規模（PDF 160本超・5画面）での参考価格 */
  price: {
    standard: '30',
    standardUnit: '万円〜',
  },
  /**
   * 特定商取引法に基づく表記。個人の受託のため、代表者名・住所・電話番号は
   * 「請求があれば遅滞なく開示」の形で省略している（請求が来たら必ずすぐ返すこと）
   */
  legal: [
    { label: '販売事業者', value: 'prototyper' },
    { label: '代表者・所在地・電話番号', value: 'ご請求があれば遅滞なく開示します。下記のメールアドレスまでご連絡ください。' },
    { label: 'メールアドレス', value: 'prototyper@insightlens.jp' },
    { label: '販売価格', value: 'ご相談は60分まで無料です。可視化サイトの制作費は、内容と規模に応じてお見積りします（目安：約30万円〜）。お見積り時に税込の金額をご提示します。' },
    { label: '販売価格以外の必要料金', value: '代金の振込手数料はお客様のご負担となります。公開に必要なサーバー・ドメインなどの費用がかかる場合は、お見積りに含めて事前にご提示します。' },
    { label: '代金の支払時期', value: '制作費の50%を着手金として着手前に、残金を納品時にお支払いいただきます。' },
    { label: '代金の支払方法', value: '銀行振込' },
    { label: 'サービスの提供時期', value: 'お見積り時に合意した納期に納品します。' },
    { label: 'キャンセル・返金', value: '着手前のキャンセルは費用はかかりません。着手後のキャンセルは、それまでに行った作業分を精算し、着手金との差額を返金またはご請求します。制作物の性質上、納品後の返品はお受けしていません。' },
  ],
} as const
