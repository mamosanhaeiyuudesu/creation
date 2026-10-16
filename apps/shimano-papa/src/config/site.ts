/**
 * ページ内で何度も出てくる値（問い合わせ先・料金）をここに集約する。
 * 文言を直接書き換えずに、この値を更新すること。
 */
export const site = {
  domain: 'shimano-papa.insightlens.jp',
  /** 聞き手の名前（ページ上の表記） */
  makerName: '島のパパ',
  /** 相談の受け口。note の DM で受け付ける */
  noteUrl: 'https://note.com/shima_no_papa',
  /** プラン。価格は税込 */
  plans: [
    {
      name: '5時間インタビュー',
      price: '98,000',
      items: ['インタビュー 計5時間', '写真・年表・家系図入り', '製本してお届け'],
    },
    {
      name: '12時間インタビュー',
      price: '198,000',
      items: ['インタビュー 計12時間（全6〜7回が目安）', '約150〜200ページ・3冊', '写真・年表・家系図入り'],
    },
  ],
} as const
