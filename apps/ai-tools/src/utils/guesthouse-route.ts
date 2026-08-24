// guesthouse 顧客分析：旅程の「順番」を扱う小さなユーティリティ。
//
// 「どこを経由したか」だけでなく「旅全体のうち何番目にこの宿へ来たか」を見るための計算をここに置く。
// 例：全10地点中8番目 → 旅の後半。高山市→高野山のように経路が違っても、
// 「後半に高野山へ来る人が多い」という傾向は前半／中盤／後半のざっくりした位置で読める。
//
// サーバ（抽出時の正規化）とページ（表示）の両方から使うので、どちらにも依存しない純粋な関数だけを置く。

/**
 * 経由地リスト（GuestProfileData.route）の中で「この宿での滞在」を表す予約語。
 * 宿名の表記ゆれ（「柿畑の宿」「阪中さんの宿」…）で位置を見失わないよう、AI にはこの固定文字列を書かせ、
 * 表示のときに実際の宿名へ差し替える。
 */
export const ROUTE_SELF = 'この宿'

/** 旅程のどのあたりに宿が来たか。unknown＝並びが読み取れず位置を決められない。 */
export type RoutePhase = 'early' | 'middle' | 'late' | 'unknown'

export const ROUTE_PHASES: RoutePhase[] = ['early', 'middle', 'late', 'unknown']

export const ROUTE_PHASE_LABEL: Record<RoutePhase, string> = {
  early: '旅の前半',
  middle: '旅の中盤',
  late: '旅の後半',
  unknown: '読み取れず',
}

/**
 * 「全 total 地点のうち index 番目（1始まり）」を 0〜1 の位置に直す。
 * 最初の地点が 0、最後の地点が 1 になる割り方にしているので、地点数が少ない旅程でも
 * 「はじめの方／おわりの方」が素直に出る（全3地点の2番目＝0.5＝ちょうど中盤）。
 * 地点が1つしか読み取れていない旅程は位置を決めようがないので null。
 */
export function routeRatio(index: number, total: number): number | null {
  if (!Number.isFinite(index) || !Number.isFinite(total)) return null
  if (index < 1 || index > total || total < 2) return null
  return (index - 1) / (total - 1)
}

/**
 * 位置を前半・中盤・後半の3つに丸める（1/3ずつ）。
 * 経由地の細かい違いや順序のズレを吸収して傾向だけを見たいので、あえて粗い3分割にしている。
 */
export function routePhase(index: number, total: number): RoutePhase {
  const r = routeRatio(index, total)
  if (r === null) return 'unknown'
  if (r < 1 / 3) return 'early'
  if (r < 2 / 3) return 'middle'
  return 'late'
}

/** 「全10地点中8番目」のような表示文字列。位置が読み取れなければ空文字。 */
export function routePositionLabel(index: number, total: number): string {
  if (routeRatio(index, total) === null) return ''
  return `全${total}地点中${index}番目`
}

/** 経由地リストの予約語 ROUTE_SELF を実際の宿名に差し替える（表示用）。 */
export function routeStopLabel(stop: string, houseName: string): string {
  return stop === ROUTE_SELF ? houseName || '宿' : stop
}

/**
 * 旅程の「前の滞在地（From）」「次の行き先（To）」を決める。
 *
 * prevStop / nextStop が空でも、route（旅程全体の経由地）が読み取れていれば、その中の
 * この宿の隣の地点を使う。読み取れなければ空文字。
 * 図（Sankey）とお客様カードの両方で同じ答えになるよう、ここに1つだけ置く。
 */
export function routeEdges(p: { prevStop: string; nextStop: string; route: string[] }): { prev: string; next: string } {
  const route = p.route ?? []
  const i = route.indexOf(ROUTE_SELF)
  return {
    prev: p.prevStop || (i > 0 ? route[i - 1] : '') || '',
    next: p.nextStop || (i >= 0 ? (route[i + 1] ?? '') : '') || '',
  }
}
