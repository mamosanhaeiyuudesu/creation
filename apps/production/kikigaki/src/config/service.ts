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

  /** ユーザーひとりあたりの月間の利用上限。想定外の高額請求を防ぐための歯止め */
  limits: {
    /** 文字起こしできる音声の長さ（分） */
    monthlyMinutes: number
    /** 議事録を作れる回数 */
    monthlyRecords: number
  }

  /**
   * 法務ページ（利用規約・プライバシーポリシー・特商法表記）が雛形のままか。
   * true の間は各ページの先頭に「この文面は雛形です」と出す
   * （空欄のまま確定文面のように見せないため）。本文を入れ終えたら false にする。
   */
  legalDraft: boolean

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

  // 仮の金額。2026-09-18 の検討時点では月額300円を想定していた。Stripe の Price を作ったら合わせる
  priceLabel: '月額 300円（税込）',

  // 【この数字の根拠】AI代の実測は1時間の会議で約70円（文字起こし約54円＋Claude約14円）。
  // 月額300円で出すなら、原価が売値を超えないよう3時間/月あたりが上限の目安になる
  // （3時間 ≈ 210円）。**値段を変えるときは必ずこの上限も一緒に見直すこと。**
  limits: {
    monthlyMinutes: 180, // 3時間ぶん
    monthlyRecords: 15,
  },

  legalDraft: true,

  legal: {
    operator: '',
    representative: '',
    address: '',
    email: '',
    tel: '',
    price: '',
    payment: '',
    delivery: '',
    refund: '',
  },
}

/** モニター期間のバナー文言。時期は設定値から差し込む */
export function monitorNotice(service: ServiceConfig = SERVICE): string {
  return service.monitorNoticeTemplate.replace('{paidStart}', service.paidStartLabel)
}

/** 特商法の表記で、まだ決まっていない項目の表示。空欄のまま公開しないための目印 */
export const LEGAL_UNFILLED = '（後日記載）'
