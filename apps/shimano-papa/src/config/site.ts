/**
 * ページ内で何度も出てくる値（問い合わせ先・料金・事業者情報）をここに集約する。
 * 文言を直接書き換えずに、この値を更新すること。
 * LP（index.vue）と、ご契約・プライバシーポリシー・特商法表記の各ページで共有している。
 */
export const site = {
  domain: 'shimano-papa.insightlens.jp',
  /** 聞き手の名前（ページ上の表記） */
  makerName: '島のパパ',
  /** 聞き手の本名 */
  makerFullName: '赤崎宗佑',
  /** 聞き手の肩書き */
  makerTagline: '沖縄・宮古島在住　全国オンライン対応',
  /** 聞き手の note（ヘッダー帯・フッターのリンク先。相談の受け口ではない） */
  noteUrl: 'https://note.com/shima_no_papa',
  /** 相談の受け口（Googleフォーム）。ボタンの文言は ctaLabel に統一する */
  formUrl: 'https://forms.gle/mYus8oMPHowpFLnu8',
  ctaLabel: '無料で相談する',
  /** フォームへの返信の目安 */
  replyWithin: '2営業日以内',

  /** お試しインタビュー。価格は税込 */
  trial: {
    minutes: 90,
    price: '20,000',
    sampleChars: '約1,000字',
    /** お試しから何日以内に本契約すれば、お試し料金を差し引くか */
    deductDays: 30,
  },

  /** プラン。価格は税込 */
  plans: [
    {
      short: '3回プラン',
      title: '約30ページ・インタビュー3回・A5判小冊子3冊',
      chars: '12,000',
      photos: 20,
      hours: 6,
      price: '98,000',
      period: '約2〜3か月',
      items: ['3章構成', '文字起こしデータの納品'],
      recommended: false,
    },
    {
      short: '7回プラン',
      title: '約70ページ・インタビュー7回・A5判3冊',
      chars: '25,000',
      photos: 40,
      hours: 12,
      price: '198,000',
      period: '約4〜5か月',
      items: ['人生のハイライトを5つの章', '文字起こしデータの納品'],
      recommended: true,
    },
  ],

  /** 追加オプション。価格は税込 */
  options: [
    { name: '追加冊数（配る用）', unit: '追加1冊', price: '2,000' },
    { name: '写真の追加掲載', unit: '10枚ごと', price: '2,000' },
  ],

  /** 契約まわりの数値（ご契約・キャンセルのページと FAQ で共有） */
  terms: {
    revisions: 2,
    audioKeepMonths: 6,
    textKeepYears: 1,
    refundBusinessDays: 10,
    deliveryAfterApproval: '約2〜3週間',
  },

  /** 特定商取引法に基づく表記・プライバシーポリシーの窓口 */
  business: {
    seller: '島のパパ（赤崎宗佑）',
    manager: '赤崎　宗佑',
    address: '〒906-0007 沖縄県宮古島市平良字東仲宗根617-3 B9',
    tel: '080-7986-1031',
    email: 'shimapapa43@zohomail.com',
    privacyEstablished: '2026年10月17日',
  },
} as const
