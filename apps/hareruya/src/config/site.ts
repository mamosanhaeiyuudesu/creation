/**
 * 晴レルヤ鍼灸院 — サイト設定
 *
 * 未確定の情報はすべてこのファイルに集約しています。
 * 実際の値が決まったらここだけ書き換えてください。
 * 未設定（空文字 / 仮の値）の項目は、ページ側で案内文（LINEでご案内しています等）に
 * 自動で切り替わります。「準備中」という表示は使いません。
 */

export const site = {
  /** LINE公式アカウントのURL。空文字の間はボタンが案内文の表示 / #contact へのリンクになる */
  lineUrl: '',

  /** Instagram（名刺表記: @SHOKO_HARIKYU） */
  instagramId: 'shoko_harikyu',
  instagramUrl: 'https://www.instagram.com/shoko_harikyu/',

  /** 所在地。詳細な番地が決まったら差し替え */
  address: '横浜市旭区若葉台 ショッピングタウン若葉台内 Wakka（わっか）',
  addressNote: '※詳細な住所はご予約時にご案内しています',

  /** GoogleマップのiframeのsrcURL。空文字の間は地図の代わりにテキスト案内を表示 */
  mapEmbedUrl: '',

  /** 施術日・施術時間（名刺記載） */
  openDays: '毎週 月曜日・木曜日',
  openHours: '10:00 〜 14:00（予約制）',

  /** メニュー・料金 */
  menus: [
    {
      name: '初回カウンセリング＋施術',
      desc: 'じっくりお話をうかがったうえで、からだの状態をチェックし、内臓鍼灸を行います。',
      duration: '約90分',
      price: '¥0,000',
    },
    {
      name: '通常施術',
      desc: '内臓鍼灸とソフトカイロ矯正を組み合わせ、その日のからだの状態に合わせて調整します。',
      duration: '約60分',
      price: '¥0,000',
    },
  ],

  /** お客様の声の掲載準備ができたら true に */
  showVoices: false,
  voices: [
    {
      body: '（お客様からいただいた感想がここに入ります）',
      author: '30代・女性',
    },
  ],
} as const

/** 料金が仮の値（¥0,000）のままかどうか */
export const isPricePending = site.menus.some((m) => m.price.includes('0,000'))
