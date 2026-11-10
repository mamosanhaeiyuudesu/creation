/**
 * ページ内で使う値のうち、未確定のものをここに集約する。
 * 空文字のままなら、ページ側が自動で案内文に切り替わる。文言を直接書き換えず、この値を更新すること。
 */
export const site = {
  domain: 'interview.insightlens.jp',
  makerName: 'しゅごりん',
  /** 聞き手の肩書き */
  makerTagline: 'ライフインタビュアー',
  /** お問い合わせ先（Googleフォームなど）。決まったらURLを入れる */
  contactUrl: '',
  ctaLabel: 'お問い合わせ',
  /** 聞き手のプロフィール文。決まったら入れる */
  profile: '',

  /** 料金（税込かどうかは確定したら price の注記に足す） */
  prices: {
    base: '100,000',
    book: '10,000',
  },

  /** 実施方法などの詳細。空なら「お問い合わせ時にご案内します」と出る */
  details: {
    method: '',
    minutes: '',
    period: '',
    payment: '',
  },
}
