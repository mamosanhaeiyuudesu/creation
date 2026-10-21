/**
 * 月ノ瀬 直（kaito2 / kaito.insightlens.jp）— サイト設定
 *
 * フォームの URL・料金・写真はこのファイルに集約しています。
 * 未設定（空文字）の項目は、ページ側が自動で表示を切り替えます。
 */
export const site = {
  /** 公開URL（特定商取引法の表記にも使う） */
  url: 'https://kaito.insightlens.jp',

  /** お問い合わせ用 Googleフォーム。空文字なら、ボタンはページ内のお問い合わせ欄へのスクロールになる */
  contactFormUrl: 'https://forms.gle/yGDcTJ9Xxao3mi8S9',

  /** お申し込み用 Googleフォーム。空文字ならお申し込みボタンを出さない */
  applyFormUrl: 'https://forms.gle/HaSANKgebkWDdaNm7',

  /** note のアカウント。空文字ならヘッダーのリンクを出さない */
  noteUrl: 'https://note.com/nijiironohane',

  /**
   * 料金（税込）。3つのメニューは共通の料金。
   * 継続コース・特典はページには載せず「お問い合わせください」で案内する方針。
   */
  price: {
    minutes: '60分',
    regular: '30,000円',
    campaign: '18,000円',
    monitor: '5,000円',
  },

  images: {
    /** ヒーローの写真（愛猫と。kaito の about-nao-cat.jpg を肌補正したもの） */
    hero: '/images/hero-nao-cat.jpg',
  },
} as const
