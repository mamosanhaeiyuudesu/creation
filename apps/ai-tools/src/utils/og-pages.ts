// URLを共有したときのサムネイル（OGP）の対応表。server/plugins/og-meta.ts が HTML の head に差し込む。
// 画像は public/og/<image>.png。元は scripts/og/targets.json（リポジトリ直下で node scripts/og/build.mjs で作り直す）。
// path は前方一致（'/games/kendo' は /games/kendo2 にも当たる）。長いものを先に書くこと。

export interface OgPage {
  path: string
  title: string
  description: string
  image: string
}

export const OG_PAGES: OgPage[] = [
  { path: '/farm-simulation', title: '経営の見直し — 10年先の利益を試す', description: '確定申告書を読み込むだけ。資材費の上昇などの前提を変えながら、10年先の利益と対応策の効果を試せる。', image: 'farm-simulation' },
  { path: '/farm-manager', title: '農園の経営', description: '納品書を撮るとAIが仕訳。畑の中（変動費）と畑の外（固定費）を色で分けて、毎月の利益が5秒で分かる。', image: 'farm-manager' },
  { path: '/farm-news', title: '農業×AI ニュース', description: '海外・国内の農業テックの新着を日本語で要約し、潮流の予測までまとめて読める。', image: 'farm-news' },
  { path: '/farm-log', title: '農作業ログ', description: 'スマホのセンサーで記録した農作業の動きを可視化。', image: 'farm-log' },
  { path: '/nikki', title: '日記', description: 'カレンダーの日を選んで話すだけ。その日の手応えの残る出来事をAIが拾って横並びに残す。', image: 'nikki' },
  { path: '/kikigaki', title: 'キキガキ（旧）', description: '会議の録音から議事録をつくり、確認してからPDFで保存。', image: 'kikigaki' },
  { path: '/news', title: 'AIニュース', description: 'OpenAI・DeepMind の新着を日本語で要約。大きな潮流ごとに整理して読める。', image: 'news' },
  { path: '/momo', title: '桃 注文管理', description: 'SNSの会話を貼るとAIが注文を構造化。選果集計と佐川e飛伝III用CSVまで。', image: 'momo' },
  { path: '/kaki', title: '柿の木 里親', description: '自分の柿の木の成長写真・観察日記・応援コメントを見る。', image: 'kaki' },
  { path: '/guesthouse', title: 'ゲストハウス案内', description: 'お客様チャットにAIが自ら回答し、緊急時だけホストへ取り次ぐ。', image: 'guesthouse' },
  { path: '/keiko', title: 'けいこ記録', description: '剣道の稽古をメンバーごとに記録。週・月・年でポイントを集計する。', image: 'keiko' },
  { path: '/kouba', title: 'タスクくん', description: 'カテゴリ×タスクで作業時間を記録し、時間の内訳を集計する。', image: 'kouba' },
  { path: '/task', title: 'タスクくん（旧）', description: 'Trello の DOING / TODO / DONE を1画面に。週の使い方をAIが振り返る。', image: 'task' },
  { path: '/whisper', title: 'whisper', description: '録音や音声ファイルから文字起こし・要約・校正。', image: 'whisper' },
  { path: '/hagemashi', title: 'はげまし', description: '記録・カレンダー・分析・相談。がんばった自分に気づくための道具。', image: 'hagemashi' },
  { path: '/fitbit', title: 'Fitbit', description: '睡眠・歩数・心拍・HRV をまとめたヘルスダッシュボードと相談チャット。', image: 'fitbit' },
  { path: '/games/panel-de-pon', title: 'パネルでポン', description: 'パネルを入れ替えて3つ以上並べて消す。ブラウザですぐ遊べる。', image: 'panel-de-pon' },
  { path: '/games/kendo', title: '剣道 三本勝負', description: '親子対戦もCOM対戦もできる剣道ゲーム。', image: 'kendo' },
  { path: '/games/kenken', title: '賢くなるパズル', description: 'ナンプレ＋四則計算のパズルで、暗算力と論理力を鍛える。', image: 'kenken' },
  { path: '/games', title: 'ゲーム', description: 'パネルでポン・剣道 三本勝負・賢くなるパズル。ブラウザですぐ遊べる。', image: 'games' },
  { path: '/', title: 'AIツール集', description: '日々の困りごとから作った、AIの道具をまとめた入口。', image: 'top' },
]

/**
 * パスに当たる行。'/news' が '/newsletter' に当たらないよう区切りの '/' まで見る。
 * ゲームだけは '/games/kendo' を kendo0 / kendo2 にも当てたいので、区切りなしの前方一致にする。
 */
export function findOgPage(pathname: string): OgPage | null {
  return (
    OG_PAGES.find((p) => {
      if (p.path === '/') return pathname === '/'
      if (p.path.startsWith('/games/')) return pathname.startsWith(p.path)
      return pathname === p.path || pathname.startsWith(`${p.path}/`)
    }) ?? null
  )
}
