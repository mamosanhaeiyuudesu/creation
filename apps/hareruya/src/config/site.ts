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
  /** アクセス欄でこの場所に飛ぶためのページ内アンカーID（ヒーローの所在地バッジなどから参照する） */
  anchor: string
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
  /** 道順の見出し（どこからの道順か）。routeSteps が空なら使わない */
  routeTitle: string
  /** 道順写真。caption が空の写真は説明なしで並ぶ */
  routeSteps: readonly { image: string; caption: string }[]
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
  anchor: 'access-wakka',
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
  routeTitle: 'バス停「若葉台中央」からの道順',
  routeSteps: [
    { image: '/images/route/wakka-route-1.jpg', caption: '降車後左に進んでください。' },
    { image: '/images/route/wakka-route-2.jpg', caption: '右側にエレベータがあるので進んでください。' },
    { image: '/images/route/wakka-route-3.jpg', caption: 'エレベーターで一階に降りてください。' },
    {
      image: '/images/route/wakka-route-4.jpg',
      caption: 'エレベーターから降りたらそのまま真っすぐ進んでください。◯印が施術場所です。',
    },
    { image: '/images/route/wakka-route-5.jpg', caption: '中に入って左奥で施術を行っています。' },
  ],
  /**
   * 隣の「BOOK STAND 若葉台」の座標にピンを立てる。
   * Googleマップの place ページ（.../place/BOOK+STAND+若葉台/@35.5059382,139.4987655,17z/...）の
   * 緯度経度をそのまま使い、括弧内をピンのラベルにしている。
   */
  mapEmbedUrl:
    'https://maps.google.com/maps?q=35.5059382,139.4987655(BOOK%20STAND%20%E8%8B%A5%E8%91%89%E5%8F%B0)&z=17&output=embed',
}

/** 青葉台駅のレンタルサロン */
const aobadai: Place = {
  name: '青葉台駅レンタルサロン',
  anchor: 'access-aobadai',
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
  routeTitle: '青葉台駅からの道順',
  /** 説明文はあとから記入する。caption が空のうちは写真だけ並ぶ */
  routeSteps: [
    { image: '/images/route/aobadai-route-1.jpg', caption: '' },
    { image: '/images/route/aobadai-route-2.jpg', caption: '' },
    { image: '/images/route/aobadai-route-3.jpg', caption: '' },
    { image: '/images/route/aobadai-route-4.jpg', caption: '' },
    { image: '/images/route/aobadai-route-5.jpg', caption: '' },
    { image: '/images/route/aobadai-route-6.jpg', caption: '' },
  ],
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
  lineUrl: 'https://lin.ee/pdrt8JZ',

  /** Instagram（名刺表記: @SHOKO_HARIKYU） */
  instagramId: 'shoko_harikyu',
  instagramUrl: 'https://www.instagram.com/shoko_harikyu/',

  /** note（コラム）。空文字の間はナビの「コラム」を出さない */
  noteUrl: 'https://note.com/calm_borage5584',

  places,

  /** 以下6つは代表の場所の値。ヒーロー・フッター・お問い合わせで使う */
  placeName: wakaba.name,
  /** ヒーローの所在地バッジから代表の場所のアクセス欄へ飛ばすためのアンカーID */
  placeAnchor: wakaba.anchor,
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
      price: '6,000円',
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
