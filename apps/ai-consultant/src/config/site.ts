/**
 * ページ内で使う値のうち、未確定のものをここに集約する。
 * 空文字のままなら、ページ側が自動で案内文に切り替わる。文言を直接書き換えず、この値を更新すること。
 */
export const site = {
  domain: 'ai-consultant.insightlens.jp',
  serviceName: 'AI活用相談',
  makerName: 'まもりん',
  /** 聞き手の肩書き */
  makerTagline: 'AI活用アドバイザー（prototyper）',
  /** お問い合わせ先（Googleフォームなど）。決まったらURLを入れる */
  contactUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSd_h56W-9kJJRto5rqojYJ9HdDta9hLtcQ4Kk_sUeNL6cCTUQ/viewform?usp=dialog',
  ctaLabel: 'お問い合わせ',
  /** 聞き手のプロフィール文。決まったら入れる */
  profile:
    '2002年 桐蔭学園理数科卒／2006年 慶應義塾大学 情報工学科卒。\n心理カウンセラーとしても活動中。趣味は格闘技・野球観戦、子どもと始めた剣道、ベランダ農業。',

  /** 料金（税込かどうかは確定したら注記に足す） */
  price: '100,000',
  /** 単発のお試しセッション（60分） */
  trialPrice: '5,000',
  /** 1回あたりの時間（分） */
  minutes: 60,
  sessions: 10,

  /** 実施方法などの詳細。空なら「お問い合わせ時にご案内します」と出る */
  details: {
    method: '',
    minutes: '1回60分',
    period: '',
    payment: '',
  },
}
