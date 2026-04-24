import type { Player, StatMeta } from '~/types/mlb'

export const PLAYERS: Player[] = [
  // ア・リーグ
  { id: '676440', nameJa: '吉田 正尚', nameEn: 'Masataka Yoshida', position: 'batter', team: 'BOS', teamFull: 'ボストン・レッドソックス', league: 'AL' },
  { id: '838984', nameJa: '岡本 和真', nameEn: 'Kazuma Okamoto', position: 'batter', team: 'TOR', teamFull: 'トロント・ブルージェイズ', league: 'AL' },
  { id: '838985', nameJa: '村上 宗隆', nameEn: 'Munetaka Murakami', position: 'batter', team: 'CWS', teamFull: 'シカゴ・ホワイトソックス', league: 'AL' },
  { id: '579328', nameJa: '菊池 雄星', nameEn: 'Yusei Kikuchi', position: 'pitcher', team: 'LAA', teamFull: 'ロサンゼルス・エンゼルス', league: 'AL' },
  { id: '838986', nameJa: '今井 達也', nameEn: 'Tatsuya Imai', position: 'pitcher', team: 'HOU', teamFull: 'ヒューストン・アストロズ', league: 'AL' },
  // ナ・リーグ
  { id: '694973', nameJa: '千賀 滉大', nameEn: 'Kodai Senga', position: 'pitcher', team: 'NYM', teamFull: 'ニューヨーク・メッツ', league: 'NL' },
  { id: '694297', nameJa: '今永 昇太', nameEn: 'Shota Imanaga', position: 'pitcher', team: 'CHC', teamFull: 'シカゴ・カブス', league: 'NL' },
  { id: '673548', nameJa: '鈴木 誠也', nameEn: 'Seiya Suzuki', position: 'batter', team: 'CHC', teamFull: 'シカゴ・カブス', league: 'NL' },
  { id: '666971', nameJa: 'ラーズ・ヌートバー', nameEn: 'Lars Nootbaar', position: 'batter', team: 'STL', teamFull: 'セントルイス・カージナルス', league: 'NL' },
  { id: '838982', nameJa: '佐々木 朗希', nameEn: 'Roki Sasaki', position: 'pitcher', team: 'LAD', teamFull: 'ロサンゼルス・ドジャース', league: 'NL' },
  { id: '660271', nameJa: '大谷 翔平', nameEn: 'Shohei Ohtani', position: 'both', team: 'LAD', teamFull: 'ロサンゼルス・ドジャース', league: 'NL' },
  { id: '808967', nameJa: '山本 由伸', nameEn: 'Yoshinobu Yamamoto', position: 'pitcher', team: 'LAD', teamFull: 'ロサンゼルス・ドジャース', league: 'NL' },
  { id: '673668', nameJa: '松井 裕樹', nameEn: 'Yuki Matsui', position: 'pitcher', team: 'SD', teamFull: 'サンディエゴ・パドレス', league: 'NL' },
  { id: '506433', nameJa: 'ダルビッシュ 有', nameEn: 'Yu Darvish', position: 'pitcher', team: 'SD', teamFull: 'サンディエゴ・パドレス', league: 'NL' },
]

export const PITCHER_PLAYERS = PLAYERS.filter(p => p.position === 'pitcher' || p.position === 'both')
export const BATTER_PLAYERS = PLAYERS.filter(p => p.position === 'batter' || p.position === 'both')

export const PLAYER_MAP = new Map(PLAYERS.map(p => [p.id, p]))

const fmtAvg = (v: number | null) => v === null ? '—' : v.toFixed(3).replace(/^0\./, '')

export const BATTER_STATS: StatMeta[] = [
  {
    key: 'avg', label: '打率',
    fullName: 'AVG = Batting Average',
    description: 'ヒット数 ÷ 打数。高いほど良い。',
    direction: 'high',
    format: fmtAvg,
  },
  {
    key: 'obp', label: '出塁率',
    fullName: 'OBP = On-Base Percentage',
    description: '安打・四球・死球で塁に出た割合。高いほど良い。',
    direction: 'high',
    format: fmtAvg,
  },
  {
    key: 'ops', label: '出塁+長打',
    fullName: 'OPS = On-base Plus Slugging',
    description: '出塁率＋長打率の合計。1.000以上が超一流。高いほど良い。',
    direction: 'high',
    format: (v) => v === null ? '—' : v.toFixed(3).replace(/^0\./, ''),
  },
  {
    key: 'bbPct', label: '四球率',
    fullName: 'BB% = Base on Balls Percentage',
    description: '四球を選んだ割合（選球眼の指標）。高いほど良い。',
    direction: 'high',
    format: (v) => v === null ? '—' : (v as number).toFixed(1) + '%',
  },
  {
    key: 'kPct', label: '三振率',
    fullName: 'K% = Strikeout Percentage',
    description: '三振した割合。低いほど良い。',
    direction: 'low',
    format: (v) => v === null ? '—' : (v as number).toFixed(1) + '%',
  },
]

export const PITCHER_STATS: StatMeta[] = [
  {
    key: 'era', label: '防御率',
    fullName: 'ERA = Earned Run Average',
    description: '9イニングあたりの自責点。低いほど良い。',
    direction: 'low',
    format: (v) => v === null ? '—' : (v as number).toFixed(2),
  },
  {
    key: 'whip', label: '被出塁/回',
    fullName: 'WHIP = Walks plus Hits per Inning Pitched',
    description: '1イニングあたりの被安打＋与四球数。低いほど良い。',
    direction: 'low',
    format: (v) => v === null ? '—' : (v as number).toFixed(2),
  },
  {
    key: 'kPct', label: '奪三振率',
    fullName: 'K% = Strikeout Percentage',
    description: '打者を三振に打ち取った割合。高いほど良い。',
    direction: 'high',
    format: (v) => v === null ? '—' : (v as number).toFixed(1) + '%',
  },
  {
    key: 'bbPct', label: '与四球率',
    fullName: 'BB% = Base on Balls Percentage',
    description: '打者に四球を与えた割合。低いほど良い。',
    direction: 'low',
    format: (v) => v === null ? '—' : (v as number).toFixed(1) + '%',
  },
]

export const PLAYER_COLORS: Record<string, string> = {
  '660271': '#E63946',  // 大谷
  '808967': '#2196F3',  // 山本
  '694973': '#4CAF50',  // 千賀
  '694297': '#FF9800',  // 今永
  '838982': '#9C27B0',  // 佐々木
  '506433': '#00BCD4',  // ダルビッシュ
  '673668': '#F44336',  // 松井
  '579328': '#3F51B5',  // 菊池
  '838986': '#009688',  // 今井
  '676440': '#FF5722',  // 吉田
  '673548': '#8BC34A',  // 鈴木
  '666971': '#FFC107',  // ヌートバー
  '838984': '#E91E63',  // 岡本
  '838985': '#607D8B',  // 村上
}
