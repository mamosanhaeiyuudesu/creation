import type { Player, StatMeta } from '~/types/mlb'

export const PLAYERS: Player[] = [
  // ア・リーグ
  { id: '807799', nameJa: '吉田 正尚', nameEn: 'Masataka Yoshida', position: 'batter', team: 'BOS', teamFull: 'ボストン・レッドソックス', league: 'AL' },
  { id: '672960', nameJa: '岡本 和真', nameEn: 'Kazuma Okamoto', position: 'batter', team: 'TOR', teamFull: 'トロント・ブルージェイズ', league: 'AL' },
  { id: '808959', nameJa: '村上 宗隆', nameEn: 'Munetaka Murakami', position: 'batter', team: 'CWS', teamFull: 'シカゴ・ホワイトソックス', league: 'AL' },
  { id: '579328', nameJa: '菊池 雄星', nameEn: 'Yusei Kikuchi', position: 'pitcher', team: 'LAA', teamFull: 'ロサンゼルス・エンゼルス', league: 'AL' },
  { id: '837227', nameJa: '今井 達也', nameEn: 'Tatsuya Imai', position: 'pitcher', team: 'HOU', teamFull: 'ヒューストン・アストロズ', league: 'AL' },
  // ナ・リーグ
  { id: '673540', nameJa: '千賀 滉大', nameEn: 'Kodai Senga', position: 'pitcher', team: 'NYM', teamFull: 'ニューヨーク・メッツ', league: 'NL' },
  { id: '684007', nameJa: '今永 昇太', nameEn: 'Shota Imanaga', position: 'pitcher', team: 'CHC', teamFull: 'シカゴ・カブス', league: 'NL' },
  { id: '673548', nameJa: '鈴木 誠也', nameEn: 'Seiya Suzuki', position: 'batter', team: 'CHC', teamFull: 'シカゴ・カブス', league: 'NL' },
  { id: '666971', nameJa: 'ラーズ・ヌートバー', nameEn: 'Lars Nootbaar', position: 'batter', team: 'STL', teamFull: 'セントルイス・カージナルス', league: 'NL' },
  { id: '808963', nameJa: '佐々木 朗希', nameEn: 'Roki Sasaki', position: 'pitcher', team: 'LAD', teamFull: 'ロサンゼルス・ドジャース', league: 'NL' },
  { id: '660271', nameJa: '大谷 翔平', nameEn: 'Shohei Ohtani', position: 'both', team: 'LAD', teamFull: 'ロサンゼルス・ドジャース', league: 'NL' },
  { id: '808967', nameJa: '山本 由伸', nameEn: 'Yoshinobu Yamamoto', position: 'pitcher', team: 'LAD', teamFull: 'ロサンゼルス・ドジャース', league: 'NL' },
  { id: '673513', nameJa: '松井 裕樹', nameEn: 'Yuki Matsui', position: 'pitcher', team: 'SD', teamFull: 'サンディエゴ・パドレス', league: 'NL' },
  { id: '506433', nameJa: 'ダルビッシュ 有', nameEn: 'Yu Darvish', position: 'pitcher', team: 'SD', teamFull: 'サンディエゴ・パドレス', league: 'NL' },
]

export const PITCHER_PLAYERS = PLAYERS.filter(p => p.position === 'pitcher' || p.position === 'both')
export const BATTER_PLAYERS = PLAYERS.filter(p => p.position === 'batter' || p.position === 'both')

export const PLAYER_MAP = new Map(PLAYERS.map(p => [p.id, p]))

const fmtAvg = (v: number | null) => v === null ? '—' : v.toFixed(3).replace(/^0/, '')


export const BATTER_STATS: StatMeta[] = [
  {
    key: 'hr', label: 'HR',
    fullName: 'Home Runs',
    description: '本塁打数。',
    direction: 'high',
    format: (v) => v === null ? '—' : `${Math.round(v as number)}本`,
    counting: true,
  },
  {
    key: 'rbi', label: '打点',
    fullName: 'RBI = Runs Batted In',
    description: '打点数。',
    direction: 'high',
    format: (v) => v === null ? '—' : `${Math.round(v as number)}点`,
    counting: true,
  },
  {
    key: 'hits', label: '安打',
    fullName: 'Hits',
    description: '安打数。',
    direction: 'high',
    format: (v) => v === null ? '—' : `${Math.round(v as number)}本`,
    counting: true,
  },
  {
    key: 'runs', label: '得点',
    fullName: 'Runs Scored',
    description: '得点数。',
    direction: 'high',
    format: (v) => v === null ? '—' : `${Math.round(v as number)}点`,
    counting: true,
  },
  {
    key: 'stolenBases', label: '盗塁',
    fullName: 'SB = Stolen Bases',
    description: '盗塁数。',
    direction: 'high',
    format: (v) => v === null ? '—' : `${Math.round(v as number)}個`,
    counting: true,
  },
  {
    key: 'avg', label: '打率',
    fullName: 'AVG = Batting Average',
    description: 'ヒット数 ÷ 打数。高いほど良い。',
    direction: 'high',
    format: fmtAvg,
    chartMin: 0.15, chartMax: 0.40,
  },
  {
    key: 'obp', label: '出塁率',
    fullName: 'OBP = On-Base Percentage',
    description: '安打・四球・死球で塁に出た割合。高いほど良い。',
    direction: 'high',
    format: fmtAvg,
    chartMin: 0.20, chartMax: 0.50,
  },
  {
    key: 'slg', label: '長打率',
    fullName: 'SLG = Slugging Percentage',
    description: '塁打数 ÷ 打数。長打力の指標。高いほど良い。',
    direction: 'high',
    format: fmtAvg,
    chartMin: 0.25, chartMax: 0.70,
  },
  {
    key: 'ops', label: 'OPS',
    fullName: 'OPS = On-base Plus Slugging',
    description: '出塁率＋長打率の合計。1.000以上が超一流。高いほど良い。',
    direction: 'high',
    format: (v) => v === null ? '—' : v.toFixed(3).replace(/^0/, ''),
    chartMin: 0.45, chartMax: 1.20,
  },
  {
    key: 'bbPct', label: '四球率',
    fullName: 'BB% = Base on Balls Percentage',
    description: '四球を選んだ割合（選球眼の指標）。高いほど良い。',
    direction: 'high',
    format: (v) => v === null ? '—' : (v as number).toFixed(1) + '%',
    chartMin: 0, chartMax: 25,
  },
  {
    key: 'kPct', label: '三振率',
    fullName: 'K% = Strikeout Percentage',
    description: '三振した割合。低いほど良い。',
    direction: 'low',
    format: (v) => v === null ? '—' : (v as number).toFixed(1) + '%',
    chartMin: 0, chartMax: 45,
  },
]

export const PITCHER_STATS: StatMeta[] = [
  // 勝敗
  {
    key: 'wins', label: '勝利',
    fullName: 'Wins',
    description: '勝利数。',
    direction: 'high',
    format: (v) => v === null ? '—' : `${Math.round(v as number)}勝`,
    counting: true,
  },
  {
    key: 'losses', label: '敗北',
    fullName: 'Losses',
    description: '敗北数。',
    direction: 'low',
    format: (v) => v === null ? '—' : `${Math.round(v as number)}敗`,
    counting: true,
  },
  // 救援
  {
    key: 'saves', label: 'セーブ',
    fullName: 'Saves',
    description: 'セーブ数。',
    direction: 'high',
    format: (v) => v === null ? '—' : `${Math.round(v as number)}S`,
    counting: true,
  },
  {
    key: 'holds', label: 'ホールド',
    fullName: 'Holds',
    description: 'ホールド数。',
    direction: 'high',
    format: (v) => v === null ? '—' : `${Math.round(v as number)}H`,
    counting: true,
  },
  // 球量
  {
    key: 'inningsPitched', label: '投球回',
    fullName: 'IP = Innings Pitched',
    description: '投球イニング数。',
    direction: 'high',
    format: (v) => { if (v === null) return '—'; const full = Math.floor(v as number); const thirds = Math.round(((v as number) - full) * 3); return thirds === 0 ? `${full}回` : `${full}.${thirds}回` },
    counting: true,
  },
  // 失点
  {
    key: 'era', label: '防御率',
    fullName: 'ERA = Earned Run Average',
    description: '9イニングあたりの自責点。低いほど良い。',
    direction: 'low',
    format: (v) => v === null ? '—' : (v as number).toFixed(2),
    chartMin: 0, chartMax: 6,
  },
  {
    key: 'whip', label: '被出塁/回',
    fullName: 'WHIP = Walks plus Hits per Inning Pitched',
    description: '1イニングあたりの被安打＋与四球数。低いほど良い。',
    direction: 'low',
    format: (v) => v === null ? '—' : (v as number).toFixed(2),
    chartMin: 0, chartMax: 2.5,
  },
  // 三振
  {
    key: 'strikeouts', label: '奪三振',
    fullName: 'Strikeouts',
    description: '奪三振数。',
    direction: 'high',
    format: (v) => v === null ? '—' : `${Math.round(v as number)}K`,
    counting: true,
  },
  {
    key: 'kPct', label: '奪三振率',
    fullName: 'K% = Strikeout Percentage',
    description: '打者を三振に打ち取った割合。高いほど良い。',
    direction: 'high',
    format: (v) => v === null ? '—' : (v as number).toFixed(1) + '%',
    chartMin: 0, chartMax: 50,
  },
  // 制球
  {
    key: 'bbPct', label: '与四球率',
    fullName: 'BB% = Base on Balls Percentage',
    description: '打者に四球を与えた割合。低いほど良い。',
    direction: 'low',
    format: (v) => v === null ? '—' : (v as number).toFixed(1) + '%',
    chartMin: 0, chartMax: 20,
  },
]

export const PLAYER_COLORS: Record<string, string> = {
  '660271': '#E63946',  // 大谷
  '808967': '#2196F3',  // 山本
  '673540': '#4CAF50',  // 千賀
  '684007': '#FF9800',  // 今永
  '808963': '#9C27B0',  // 佐々木
  '506433': '#00BCD4',  // ダルビッシュ
  '673513': '#FDD835',  // 松井
  '579328': '#3F51B5',  // 菊池
  '837227': '#009688',  // 今井
  '807799': '#26A69A',  // 吉田
  '673548': '#8BC34A',  // 鈴木
  '666971': '#FFC107',  // ヌートバー
  '672960': '#E91E63',  // 岡本
  '808959': '#607D8B',  // 村上
}
