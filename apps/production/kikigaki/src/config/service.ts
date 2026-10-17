// サービスの可変な設定値はすべてこのファイルに集める。
//
// 【このファイルを置く理由】
// モニター期間の文言・有料化の時期・利用上限・特定商取引法の表記は、どれも運用しながら変わる値。
// 画面やAPIに直書きすると「どこを直せばいいか」が散って、変更のたびに探し回ることになる。
// apps/hareruya/src/config/site.ts と同じ考え方（未確定・可変の値を1ファイルに集める）。
//
// 【nuxt.config.ts から import している】
// そのため Nuxt / Vue / h3 に依存するものをこのファイルへ書かないこと（純粋な定数と関数だけ）。

export interface ServiceConfig {
  /** サービス名（画面・PDF・メール文面で使う） */
  name: string
  /** 本番URL。マジックリンクの戻り先の組み立てに使う */
  siteUrl: string

  /**
   * モニター期間フラグ。
   * true  = 全ユーザーが課金なしで全機能を使える（＝当面の運用）
   * false = 契約状態を見て利用可否を判定する（＝有料化後）
   *
   * ここが既定値で、`NUXT_PUBLIC_MONITOR_MODE=false` を設定すれば
   * コードを変えずに有料モードへ切り替えられる。
   */
  monitorMode: boolean
  /** 有料化の時期。バナー文言に差し込む */
  paidStartLabel: string
  /** モニター期間中に常時出すバナーの文言。`{paidStart}` が paidStartLabel に置き換わる */
  monitorNoticeTemplate: string

  /** 月額の表示用ラベル（実際の金額は Stripe の Price が持つ。ここは画面に出す文字だけ） */
  priceLabel: string

  /** 初めて契約する人の無料期間（日）。0 なら無料期間なし。2回目以降の契約には付けない */
  trialDays: number

  /** ユーザーひとりあたりの月間の利用上限。想定外の高額請求を防ぐための歯止め */
  limits: {
    /** 月のAI利用量の上限（USD。実際にAnthropicへ払う額）。画面には金額を出さず、割合（％）だけ出す */
    monthlyBudgetUsd: number
  }

  /**
   * 法務ページ（利用規約・プライバシーポリシー・特商法表記）が雛形のままか。
   * true の間は各ページの先頭に「この文面は雛形です」と出す
   * （空欄のまま確定文面のように見せないため）。本文を入れ終えたら false にする。
   */
  legalDraft: boolean

  /** 利用規約・プライバシーポリシーの制定日（表示用）。本文を改めたら「改定日」として足す */
  legalEnactedLabel: string

  /** 特定商取引法に基づく表記。空の項目は画面側で「（後日記載）」に落ちる */
  legal: {
    /** 事業者名 */
    operator: string
    /** 代表者名 */
    representative: string
    /** 所在地 */
    address: string
    /** 連絡先（メールアドレス） */
    email: string
    /** 電話番号 */
    tel: string
    /** 販売価格 */
    price: string
    /** 代金の支払時期・方法 */
    payment: string
    /** サービスの提供時期 */
    delivery: string
    /** 返品・キャンセルについて */
    refund: string
  }
}

export const SERVICE: ServiceConfig = {
  name: 'キキガキ',
  siteUrl: 'https://kikigaki.insightlens.jp',

  monitorMode: true,
  paidStartLabel: '2027年4月',
  monitorNoticeTemplate: '現在モニター期間です。{paidStart}頃から有料化を予定しています。それまでは無料でお使いいただけます。',

  // 仮の金額。2026-10-13 に月額500円へ変更（以前は300円の想定）。Stripe の Price を作ったら合わせる
  priceLabel: '月額 500円（税込）',

  // 2026-10-16 決定: 最初の1か月は無料。カードは最初に登録してもらい、期間が終わると自動で引き落とす
  trialDays: 30,

  // 【この数字の根拠】月額500円（税込）で、使い切られても原価が300円ほどに収まるようにする。
  // 500円 → 税抜き約455円 → Stripe手数料(3.6%)約18円を引いて約437円。上限が300円なら最悪でも約137円残る。
  // 上限は円ではなくドルで持つ（実際の請求がドル建てのため）。1ドル=160円で換算して約290円ぶん。
  // 画面には金額を出さず、使った割合（％）だけ出す。
  // **値段・モデル・単価（utils/usage.ts の PRICE_PER_MTOK）を変えるときは、この上限も一緒に見直すこと。**
  limits: {
    monthlyBudgetUsd: 1.8,
  },

  legalDraft: true,

  // 2026-10-17 に本文を作成。事業者の情報（legal の operator など）を入れて公開するときに日付を見直す
  legalEnactedLabel: '2026年10月17日',

  // 2026-10-17 本人の指示: 事業者名は屋号の prototyper。代表者の氏名（実名）・所在地・電話番号は「請求があれば開示」。
  // 請求が来たら遅滞なく出せるようにしておくこと（出せない体制での省略は認められない）
  legal: {
    operator: 'prototyper',
    representative: 'ご請求があれば、遅滞なく開示いたします。上記のお問い合わせ先までご連絡ください。',
    address: 'ご請求があれば、遅滞なく開示いたします。上記のお問い合わせ先までご連絡ください。',
    email: 'prototyper@insightlens.jp',
    tel: 'ご請求があれば、遅滞なく開示いたします。上記のお問い合わせ先までご連絡ください。',
    // 下の4つは事業者によらない内容なので先に埋めてある（金額・無料期間を変えたら合わせる）
    price: '月額 500円（税込）。最初の1か月は無料です。モニター期間中は無料でお使いいただけます。',
    payment:
      'クレジットカード（決済会社 Stripe を通じてお支払いいただきます）。無料期間が終わる日に初回のお支払いが発生し、以後は毎月同じ日に自動でお支払いになります。',
    delivery: 'お申し込みの手続きが終わったあと、すぐにお使いいただけます。',
    refund:
      'サービスの性質上、お支払い後の返金はいたしません。解約はいつでも画面から手続きでき、次回のお支払い日以降は請求されません（お支払い済みの期間の終わりまでお使いいただけます）。無料期間中に解約した場合、料金はかかりません。',
  },
}

/** モニター期間のバナー文言。時期は設定値から差し込む */
export function monitorNotice(service: ServiceConfig = SERVICE): string {
  return service.monitorNoticeTemplate.replace('{paidStart}', service.paidStartLabel)
}

/** 特商法の表記で、まだ決まっていない項目の表示。空欄のまま公開しないための目印 */
export const LEGAL_UNFILLED = '（後日記載）'
