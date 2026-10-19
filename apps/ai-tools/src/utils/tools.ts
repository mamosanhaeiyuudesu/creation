// トップページのツール一覧。ここを唯一の情報源にしている。

export type Accent = 'sky' | 'slate'

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
    title: '稼働中',
    lead: 'いま使っているもの',
    accent: 'sky',
    tools: [
      { path: 'https://kikigaki.insightlens.jp', icon: '🗒️', name: 'キキガキ', desc: '会議の録音から議事録をつくり、確認してPDFで保存。Googleでログインして使える一般公開版。', tags: ['要ログイン', '別ドメイン'] },
      { path: '/nikki', icon: '📔', name: '日記', desc: 'カレンダーの日を選んで話すだけ。その日の手応えの残る出来事をAIが拾って横並びに残す。', tags: ['要ログイン', 'Google連携'] },
      { path: 'https://manabi.insightlens.jp', icon: '✅', name: 'マナビー', desc: 'テーマを書くとAIが選択式の問題をつくる学びのドリル。URLで送れば同じ問題を解いてもらえる。みんなの問題や、授業用のA4問題集（PDF）も。', tags: ['ログイン不要', '共有リンク', '別ドメイン'] },
      { path: '/miyako', icon: '🏝️', name: '宮古島市議会 議事録', desc: '最新の定例会でよく議論された言葉をワードクラウドで。全体像・年別・議員別・キーワード検索とAI解説も。' },
      { path: '/games/panel-de-pon', icon: '🎴', name: 'パネルでポン', desc: 'SFC版パネルでポンをブラウザで。パネルを入れ替えて3つ以上並べて消す。' },
      { path: '/games/kendo2', icon: '🥋', name: '剣道 三本勝負', desc: '親子対戦もCOM対戦もできる剣道ゲーム。' },
      { path: 'https://genogram.insightlens.jp', icon: '🧬', name: 'ジェノグラム', desc: '家族構成をAIに伝えると、家系図(ジェノグラム)と感情関係図をその場に描画する。', tags: ['別ドメイン'] },
      { path: '/farm-manager', icon: '🌾', name: '農園の経営', desc: '納品書を撮るとAIが仕訳。畑の中（変動費）と畑の外（固定費）を色で分けて、毎月の利益が5秒で分かる。', tags: ['要ログイン'] },
    ],
  },
  {
    title: '停止中',
    lead: 'いまは手を入れていないもの',
    accent: 'slate',
    tools: [
      { path: '/japanese-mlb-player', icon: '⚾', name: '日本人MLB選手', desc: '打者・投手のスタッツを FanGraphs / MLB Stats から取得して一覧。' },
      { path: '/farm-log', icon: '🌿', name: '農作業ログ', desc: 'スマホのセンサーで記録した農作業の動きを可視化。' },
      { path: '/guesthouse', icon: '🏡', name: 'ゲストハウス案内', desc: 'お客様チャットにAIが自ら回答し、緊急時だけホストへ取り次ぐ。日記から顧客分析も。', tags: ['要ログイン', '共有リンク'] },
      { path: '/kaki', icon: '🌳', name: '柿の木 里親', desc: '自分の柿の木の成長写真・観察日記・応援コメントを見る。農家用の管理画面つき。', tags: ['要ログイン'] },
      { path: '/momo', icon: '🍑', name: '桃 注文管理', desc: 'SNSの会話を貼るとAIが注文を構造化。選果集計と佐川e飛伝III用CSVまで。', tags: ['要ログイン'] },
      { path: '/task', icon: '📋', name: 'タスクくん（旧）', desc: 'Trello の DOING / TODO / DONE を1画面に。週の使い方をAIが振り返る。', tags: ['要ログイン', 'Trello連携'] },
      { path: '/whisper', icon: '🎙️', name: 'whisper', desc: '録音や音声ファイルから文字起こし・要約・校正。Whisper / Gemini を切替可能。', tags: ['要ログイン'] },
      { path: '/hagemashi', icon: '💪', name: 'はげまし', desc: 'いまの状況を話すと、AIがはげましの言葉を書いて読み上げる。', tags: ['要ログイン', '読み上げ'] },
      { path: '/news', icon: '📰', name: 'AIニュース', desc: 'OpenAI・DeepMind の新着を日本語で要約。重要度で絞って読める。', tags: ['要ログイン'] },
      { path: '/keiko', icon: '🥋', name: 'けいこ記録', desc: '剣道の稽古をメンバーごとに記録。週・月・年でポイントを集計する。', tags: ['要ログイン'] },
      { path: '/kikigaki', icon: '🗒️', name: 'キキガキ（旧）', desc: '会議の録音から議事録をつくり、確認してからGoogleのドキュメント・ToDo・カレンダーへ送る。', tags: ['要ログイン', 'Google連携'] },
      { path: '/games/kenken', icon: '🧠', name: '賢くなるパズル', desc: 'ケンケン（KenKen）。ナンプレ＋四則計算のパズルで、暗算力と論理力を鍛える。' },
      { path: '/fitbit', icon: '⌚️', name: 'Fitbit', desc: '睡眠・歩数・心拍・HRV をまとめたヘルスダッシュボードと相談チャット。', tags: ['要ログイン', 'Google連携'] },
      { path: '/kouba', icon: '⏱️', name: 'タスクくん', desc: 'マーケティングなど自分で決めたカテゴリ×タスクで作業時間を記録。3×3の板に付箋でタスクを並べ、時間の内訳を集計する。', tags: ['要ログイン'] },
    ],
  },
]
