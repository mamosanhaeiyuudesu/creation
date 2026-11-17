/**
 * ページ内で使う値のうち、未確定のものをここに集約する。
 * 空文字のままなら、ページ側が自動で案内文に切り替わる。文言を直接書き換えず、この値を更新すること。
 */
export const site = {
  domain: 'kikigaki-promotion.insightlens.jp',
  serviceName: 'キキガキ',
  /** キキガキ本体（本番版） */
  appUrl: 'https://kikigaki.insightlens.jp/',
  ctaLabel: 'キキガキを使ってみる',
  /** ウェブアプリ・ホームページ開発の依頼先（prototyper） */
  prototyperUrl: 'https://prototyper.insightlens.jp',
  prototyperLabel: 'ウェブアプリやホームページ開発のご依頼はこちら',
  /** たたき（下書き）のあいだは true。検索に載らないようにする。公開するときに false */
  draft: true,
}
