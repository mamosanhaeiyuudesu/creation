// トップページのツール一覧。訪問回数の記録（plugins/tool-usage.client.ts）でも
// 同じ定義を使うので、ここを唯一の情報源にしている。

export type Accent = 'sky' | 'amber' | 'emerald' | 'slate'

export type Tool = {
  path: string
  icon: string
  name: string
  desc: string
  tags?: string[]
}

export type Section = {
  title: string
  lead: string
  accent: Accent
  tools: Tool[]
}

export const SECTIONS: Section[] = [
  {
    title: '日々の道具',
    lead: '自分たちで毎日使うもの',
    accent: 'sky',
    tools: [
      { path: '/whisper', icon: '🎙️', name: 'whisper', desc: '録音や音声ファイルから文字起こし・要約・校正。Whisper / Gemini を切替可能。', tags: ['要ログイン'] },
      { path: '/hagemashi', icon: '💪', name: 'はげまし', desc: 'いまの状況を話すと、AIがはげましの言葉を書いて読み上げる。', tags: ['要ログイン', '読み上げ'] },
      { path: '/task', icon: '📋', name: 'タスクくん', desc: 'Trello の DOING / TODO / DONE を1画面に。週の使い方をAIが振り返る。', tags: ['要ログイン', 'Trello連携'] },
      { path: '/fitbit', icon: '⌚️', name: 'Fitbit', desc: '睡眠・歩数・心拍・HRV をまとめたヘルスダッシュボードと相談チャット。', tags: ['要ログイン', 'Google連携'] },
      { path: '/office', icon: '🏢', name: '勤怠', desc: '出勤・退勤の打刻と日付ごとの記録。', tags: ['要ログイン'] },
      { path: '/games', icon: '🎮', name: 'ゲーム', desc: 'パネルでポン・賢くなるパズル。息抜き用のレトロゲーム集。' },
    ],
  },
  {
    title: '誰かのために作ったアプリ',
    lead: '相談を受けて、その人の仕事や暮らしに合わせて作ったもの',
    accent: 'amber',
    tools: [
      { path: '/kaki', icon: '🌳', name: '柿の木 里親', desc: '自分の柿の木の成長写真・観察日記・応援コメントを見る。農家用の管理画面つき。', tags: ['要ログイン'] },
      { path: '/momo', icon: '🍑', name: '桃 注文管理', desc: 'SNSの会話を貼るとAIが注文を構造化。選果集計と佐川e飛伝III用CSVまで。', tags: ['要ログイン'] },
      { path: '/guesthouse', icon: '🏡', name: 'ゲストハウス案内', desc: 'お客様チャットにAIが自ら回答し、緊急時だけホストへ取り次ぐ。日記から顧客分析も。', tags: ['要ログイン', '共有リンク'] },
      { path: '/ippon', icon: '✏️', name: 'Sketch2View', desc: '紙のスケッチを撮ると、AIが形を読み解いて3Dビューにする。共有リンクで見せられる。', tags: ['要ログイン', '共有リンク'] },
      { path: '/keiko', icon: '🥋', name: 'けいこ記録', desc: '剣道の稽古をメンバーごとに記録。週・月・年でポイントを集計する。', tags: ['要ログイン'] },
      { path: '/kiroku', icon: '📝', name: 'kiroku', desc: '感情メモ。開いたらすぐ書ける入力欄ひとつ。AIの分析も採点もしない。', tags: ['端末内に保存'] },
      { path: '/life', icon: '📖', name: '人生のインタビュー', desc: 'ライフステージごとのテーマをAIと対話で深掘り。答えは本人のスプレッドシートへ。', tags: ['要ログイン', 'Google連携'] },
      { path: '/life-analyzer', icon: '🌗', name: '人生の影と光', desc: '自分について書かれた文章から、影と光のコアを図にして読み返す。', tags: ['要ログイン'] },
    ],
  },
  {
    title: 'データを見る',
    lead: '集めたデータを読めるかたちにしたもの',
    accent: 'emerald',
    tools: [
      { path: '/miyako', icon: '🏝️', name: '宮古島市議会 議事録', desc: 'キーワード×会期のヒートマップとAI解説。キーワード検索・議員別・年別の推移も。' },
      { path: '/japanese-mlb-player', icon: '⚾', name: '日本人MLB選手', desc: '打者・投手のスタッツを FanGraphs / MLB Stats から取得して一覧。' },
      { path: '/farm-log', icon: '🌿', name: '農作業ログ', desc: 'スマホのセンサーで記録した農作業の動きを可視化。' },
    ],
  },
  {
    title: '休止中',
    lead: 'いまは手を入れていないもの',
    accent: 'slate',
    tools: [
      { path: '/snapreader', icon: '📸', name: 'SnapReader', desc: '画像をアップロードしてOCR・要約・AIチャット。' },
      { path: '/marriage', icon: '💑', name: 'marriage', desc: 'ふたりの日々をムードとコメントで記録するカレンダー。', tags: ['要ログイン'] },
      { path: '/setsuyaku', icon: '💰', name: '節約', desc: '節約の記録。', tags: ['要ログイン'] },
    ],
  },
]

export const ALL_TOOLS: Tool[] = SECTIONS.flatMap((section) => section.tools)

/** ツール内の下層ページ（/kaki/xxx など）も、そのツールとして扱う */
export function findToolByPath(path: string): Tool | null {
  return ALL_TOOLS.find((tool) => path === tool.path || path.startsWith(tool.path + '/')) ?? null
}
