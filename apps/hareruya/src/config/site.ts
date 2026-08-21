/**
 * 晴レルヤ鍼灸院 — サイト設定
 *
 * 未確定の情報はすべてこのファイルに集約しています。
 * 実際の値が決まったらここだけ書き換えてください。
 * 未設定（空文字 / 仮の値）の項目は、ページ側で案内文（LINEでご案内しています等）に
 * 自動で切り替わります。「準備中」という表示は使いません。
 */

/** 施術場所ひとつぶんの情報 */
type Place = {
  name: string
  address: string
  /** 所在地の下に添える補足。空文字なら何も表示しない */
  addressNote: string
  /** 空文字ならその行を出さない */
  days: string
  /** 施術日の下に添える補足。linkUrl が空ならリンクを出さない */
  daysNote: string
  daysNoteLinkUrl: string
  daysNoteLinkLabel: string
  hours: string
  parking: string
  parkingNote: string
  /** 電車・バスでの行き方。空配列ならその行を出さない */
  transit: readonly { from: string; route: string }[]
  /**
   * GoogleマップのiframeのsrcURL。空文字の場合は地図の代わりにテキスト案内を表示する。
   * 差し替えるときは Googleマップ → 共有 → 地図を埋め込む の iframe src を貼るか、
   * 短縮URL（maps.app.goo.gl/…）の転送先クエリに `&output=embed` を付けたものを入れる。
   */
  mapEmbedUrl: string
}

/** 若葉台（代表の場所） */
const wakaba: Place = {
  name: 'ショッピングタウンわかば内『Wakka（わっか）』',
  address: '神奈川県横浜市旭区若葉台3-5-1 ショッピングタウンわかば内『Wakka（わっか）』 BOOK STAND若葉台の隣',
  addressNote: '',
  /** 名刺記載 */
  days: '毎週 月曜日・木曜日',
  daysNote: '',
  daysNoteLinkUrl: '',
  daysNoteLinkLabel: '',
  hours: '10:00 〜 14:00（予約制）',
  parking: '近くにコインパーキングがあります',
  parkingNote:
    '最初の1時間無料、商店街でお買い物するとさらに1時間無料。当方の鍼灸治療はお買い物の対象外となっております。ご了承ください。',
  transit: [
    {
      from: 'JR横浜線「十日市場」駅よりバスで15分',
      route: '駅南口のバスロータリー①番のりば 23系統「若葉台中央」ゆきの終点「若葉台中央」で下車',
    },
    {
      from: '東急田園都市線「青葉台」駅よりバスで25分',
      route: '駅北口のバスロータリー⑧番のりば 23系統「若葉台中央」ゆきの終点「若葉台中央」で下車',
    },
    {
      from: '相鉄線「三ツ境」駅よりバスで25分',
      route:
        '駅北口からでて、陸橋を渡った先にあるバスロータリー①番のりば 116系統「若葉台中央」ゆきの終点「若葉台中央」で下車',
    },
  ],
  /** https://maps.app.goo.gl/VYHFL8SJW6PLoVaY9 が指す「ショッピングタウンわかば」 */
  mapEmbedUrl:
    'https://maps.google.com/maps?q=%E3%80%92241-0801+%E7%A5%9E%E5%A5%88%E5%B7%9D%E7%9C%8C%E6%A8%AA%E6%B5%9C%E5%B8%82%E6%97%AD%E5%8C%BA%E8%8B%A5%E8%91%89%E5%8F%B0%EF%BC%93%E4%B8%81%E7%9B%AE%EF%BC%95%E2%88%92%EF%BC%92+%E3%82%B7%E3%83%A7%E3%83%83%E3%83%94%E3%83%B3%E3%82%B0%E3%82%BF%E3%82%A6%E3%83%B3%E3%82%8F%E3%81%8B%E3%81%B0&z=17&output=embed',
}

/** 青葉台駅のレンタルサロン */
const aobadai: Place = {
  name: '青葉台駅レンタルサロン',
  address: '神奈川県横浜市青葉区しらとり台1-27',
  addressNote: '部屋番号は日によって変わりますので、ご予約完了時にお知らせします。',
  days: '不定期',
  daysNote: 'まずはお問い合わせください。営業日はインスタグラムの営業カレンダーでご確認いただけます。',
  daysNoteLinkUrl: 'https://www.instagram.com/shoko_harikyu/',
  daysNoteLinkLabel: '営業カレンダーを見る',
  /** 時間が決まったら記入。空文字の間は施術時間の行を出さない */
  hours: '',
  /** 駐車場の情報が分かったら記入 */
  parking: '',
  parkingNote: '',
  /** 行き方が決まったら記入。空配列の間は電車・バスの行を出さない */
  transit: [],
  /**
   * https://maps.app.goo.gl/tQAwunu71XjH1TBP7 が指す「しらとり台1−27」。
   * z=15 は青葉台駅が地図の上部に入るよう引いた倍率（z=16以上だと駅が画面外に出る）。
   */
  mapEmbedUrl:
    'https://maps.google.com/maps?q=%E3%80%92227-0054+%E7%A5%9E%E5%A5%88%E5%B7%9D%E7%9C%8C%E6%A8%AA%E6%B5%9C%E5%B8%82%E9%9D%92%E8%91%89%E5%8C%BA%E3%81%97%E3%82%89%E3%81%A8%E3%82%8A%E5%8F%B0%EF%BC%91%E2%88%92%EF%BC%92%EF%BC%97&z=15&output=embed',
}

/**
 * 施術場所。曜日によって場所が変わるため配列で持つ。
 * 先頭が代表の場所で、ヒーロー・フッター・お問い合わせの文言は wakaba を参照する。
 */
const places: readonly Place[] = [wakaba, aobadai]

export const site = {
  /** LINE公式アカウントのURL。空文字の間はボタンが案内文の表示 / #contact へのリンクになる */
  lineUrl: '',

  /** Instagram（名刺表記: @SHOKO_HARIKYU） */
  instagramId: 'shoko_harikyu',
  instagramUrl: 'https://www.instagram.com/shoko_harikyu/',

  places,

  /** 以下5つは代表の場所の値。ヒーロー・フッター・お問い合わせで使う */
  placeName: wakaba.name,
  address: wakaba.address,
  addressNote: wakaba.addressNote,
  openDays: wakaba.days,
  openHours: wakaba.hours,

  /** メニュー・料金 */
  menus: [
    {
      name: '通常施術（内蔵鍼灸×ソフトカイロ矯正）',
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
