/**
 * ページ内で何度も出てくる値（問い合わせ先・料金・事業者情報）をここに集約する。
 * 文言を直接書き換えずに、この値を更新すること。
 * shimano-papa 本体と同じ値。料金を変えるときは本体・jibun-no-hon・sofubo-no-hon・otto-no-hon の4か所をそろえること。
 */
export const site = {
  domain: 'sofubo-no-hon.insightlens.jp',
  /** 法務ページ（規約・プライバシー・特商法）は本体サイトに置いてある */
  mainUrl: 'https://shimano-papa.insightlens.jp',
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
  ctaLabel: '贈り物の相談をする（無料）',
  /** ヘッダーのボタン用の短い文言 */
  ctaShort: '無料で相談する',
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
      short: '4回プラン',
      title: '約30ページ・インタビュー4回（各90分）・A5判小冊子3冊',
      chars: '12,000',
      photos: 20,
      hours: 6,
      price: '98,000',
      period: '約2〜3か月',
      items: [
        '3～5章構成',
        '文字起こしデータの納品',
        'ご契約後に、事前の準備をお願いしています（任意。難しければ一緒に作ります）',
      ],
      recommended: false,
    },
  ],

  /** 追加オプション。価格は税込 */
  options: [
    { name: '追加冊数（配る用）', unit: '追加1冊', price: '2,000' },
    { name: '写真の追加掲載', unit: '10枚ごと', price: '2,000' },
    { name: '追加インタビュー（4回で聞き切れない場合にご提案）', unit: '1回（90分・約8ページ分の増加を含む）', price: '30,000' },
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
