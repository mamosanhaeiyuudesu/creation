// guesthouse 顧客分析：旅程の「順番」を扱う小さなユーティリティ。
//
// 「どこを経由したか」だけでなく「旅全体のうち何番目にこの宿へ来たか」を見るための計算をここに置く。
// 例：全10地点中8番目 → 旅のおわりの方。高山市→高野山のように経路が違っても、
// 「旅の終盤に高野山へ来る人が多い」という傾向は帯の上の位置で読める。
//
// サーバ（抽出時の正規化）とページ（表示）の両方から使うので、どちらにも依存しない純粋な関数だけを置く。

/**
 * 経由地リスト（GuestProfileData.route）の中で「この宿での滞在」を表す予約語。
 * 宿名の表記ゆれ（「柿畑の宿」「阪中さんの宿」…）で位置を見失わないよう、AI にはこの固定文字列を書かせ、
 * 表示のときに実際の宿名へ差し替える。
 */
export const ROUTE_SELF = 'この宿'

/**
 * 「全 total 地点のうち index 番目（1始まり）」を 0〜1 の位置に直す。
 * 最初の地点が 0、最後の地点が 1 になる割り方にしているので、地点数が少ない旅程でも
 * 「はじめの方／おわりの方」が素直に出る（全3地点の2番目＝0.5＝ちょうど中ほど）。
 * 地点が1つしか読み取れていない旅程は位置を決めようがないので null。
 */
export function routeRatio(index: number, total: number): number | null {
  if (!Number.isFinite(index) || !Number.isFinite(total)) return null
  if (index < 1 || index > total || total < 2) return null
  return (index - 1) / (total - 1)
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

/** 経路の1地点（表示用）。self＝この宿での滞在。 */
export interface RouteStop {
  label: string
  self: boolean
}

/** 前後の空白だけ吸収して、同じ地点かどうかを見る。 */
function sameStop(a: string, b: string): boolean {
  return a.trim() === b.trim()
}

/**
 * 旅程を「関空 → 和歌山 → この宿 → 奈良」のひと続きの経路に直す（表示用）。
 *
 * route（通った順）を主にして、prevStop / nextStop は route に入っていないときだけ端へ足す。
 * そうしないと From/To と route で同じ地点が二度出てしまう（「宿 → 和歌山市」と「1 宿 › 2 和歌山市」の重複）。
 * route がまるごと読み取れていない旅程だけ、prevStop → 宿 → nextStop の短い経路になる。
 */
export function routeChain(p: {
  prevStop: string
  nextStop: string
  route: string[]
  routeIndex: number
  houseName: string
}): RouteStop[] {
  const stops: RouteStop[] = []
  const add = (stop: string, self: boolean) => {
    const label = routeStopLabel(stop ?? '', p.houseName).trim()
    if (label) stops.push({ label, self })
  }

  const route = (p.route ?? []).filter((s) => (s ?? '').trim())
  if (route.length) {
    // AI が予約語ではなく宿名をそのまま書いた旅程でも、routeIndex が分かれば宿の位置を印せる。
    const selfAt = route.includes(ROUTE_SELF) ? -1 : p.routeIndex - 1
    if (p.prevStop && !route.some((s) => sameStop(s, p.prevStop))) add(p.prevStop, false)
    route.forEach((s, i) => add(s, s === ROUTE_SELF || i === selfAt))
    if (p.nextStop && !route.some((s) => sameStop(s, p.nextStop))) add(p.nextStop, false)
  } else {
    add(p.prevStop, false)
    add(ROUTE_SELF, true)
    add(p.nextStop, false)
  }

  // 隣り合う同じ地点はひとつにまとめる（「和歌山市 → 和歌山市」を消す）。宿の印だけは残す。
  const merged: RouteStop[] = []
  for (const stop of stops) {
    const last = merged[merged.length - 1]
    if (last && sameStop(last.label, stop.label)) {
      last.self = last.self || stop.self
      continue
    }
    merged.push(stop)
  }
  return merged
}
