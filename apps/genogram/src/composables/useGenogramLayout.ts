import type { GenogramData, Person, Union, Relation } from '~/types/genogram'
import { personDetailLines, hasEnrichedInfo } from '~/utils/personDisplay'

export const LAYOUT = {
  margin: 40,
  rowHeight: 150,
  symbolSize: 40,
  charWidth: 14,
  labelPadding: 16,
  partnerGap: 36,
  clusterGap: 80,
  busRatio: 0.55,
  legendRowHeight: 22,
  legendTopGap: 34,
} as const

export interface LayoutNode {
  person: Person
  x: number
  y: number
  /** 横方向に確保されたスロット幅(ラベル込み) */
  slotWidth: number
  size: number
}

export interface UnionLine {
  union: Union
  unionIndex: number
  x1: number
  y1: number
  x2: number
  y2: number
  midX: number
  midY: number
}

export interface ChildConnector {
  unionIndex: number
  dropX: number
  dropTopY: number
  busY: number
  busX1: number
  busX2: number
  children: { id: string; x: number; topY: number }[]
}

export interface RelationLine {
  relation: Relation
  index: number
  x1: number
  y1: number
  x2: number
  y2: number
  labelX: number
  labelY: number
}

export interface LegendItem {
  kind: 'union' | 'relation' | 'badge'
  value: string
  label: string
}

export interface GenogramLayoutResult {
  nodes: LayoutNode[]
  unionLines: UnionLine[]
  childConnectors: ChildConnector[]
  relationLines: RelationLine[]
  legend: LegendItem[]
  width: number
  height: number
  /** 家系図本体(凡例を除く)の高さ。凡例グループの描画位置に使う */
  diagramHeight: number
  /** 凡例1列分の幅。凡例項目の描画位置(GenogramSvg側)に使う */
  legendColWidth: number
  viewBox: string
  errors: string[]
}

class DisjointSet {
  private parent = new Map<string, string>()

  find(id: string): string {
    if (!this.parent.has(id)) this.parent.set(id, id)
    let root = this.parent.get(id)!
    if (root !== id) {
      root = this.find(root)
      this.parent.set(id, root)
    }
    return root
  }

  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

function slotWidthOf(person: Person): number {
  const nameWidth = person.name.length * LAYOUT.charWidth + LAYOUT.labelPadding
  // 生没年・職業・注記は名前より小さいフォントで表示するため、文字幅は控えめに見積もる
  const detailWidths = personDetailLines(person).map((line) => line.length * 8 + LAYOUT.labelPadding)
  return Math.max(LAYOUT.symbolSize + 16, nameWidth, ...detailWidths)
}

/** 親子の有向グラフ(親→子)に循環があるか検出する。あれば関与するidの配列を返す */
function detectCycle(people: Person[], unions: Union[]): string[] | null {
  const childrenOf = new Map<string, Set<string>>()
  for (const u of unions) {
    if (!u.children) continue
    for (const p of u.partners) {
      if (!childrenOf.has(p)) childrenOf.set(p, new Set())
      for (const c of u.children) childrenOf.get(p)!.add(c)
    }
  }

  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>()
  for (const p of people) color.set(p.id, WHITE)
  const stack: string[] = []

  function dfs(id: string): string[] | null {
    color.set(id, GRAY)
    stack.push(id)
    for (const child of childrenOf.get(id) ?? []) {
      const c = color.get(child)
      if (c === GRAY) {
        const cycleStart = stack.indexOf(child)
        return stack.slice(cycleStart).concat(child)
      }
      if (c === WHITE) {
        const found = dfs(child)
        if (found) return found
      }
    }
    stack.pop()
    color.set(id, BLACK)
    return null
  }

  for (const p of people) {
    if (color.get(p.id) === WHITE) {
      const found = dfs(p.id)
      if (found) return found
    }
  }
  return null
}

/**
 * 人物ごとの世代を解決する。明示指定 > 親子関係からの伝播 > 親のいない人はルート(0)扱い。
 *
 * 夫婦(union.partners)は必ず同じ世代になる必要があるため、まず配偶者同士を
 * Union-Findでグループ化してから親子関係を「グループ間」の辺として解決する。
 * こうしないと「よそから嫁いできた配偶者(このデータ内に親がいない人)」が
 * 誤って世代0のルート扱いされてしまう(配偶者の実際の世代は相手の世代に従うべき)。
 */
function resolveGenerations(people: Person[], unions: Union[]) {
  const dsu = new DisjointSet()
  for (const p of people) dsu.find(p.id)
  for (const u of unions) dsu.union(u.partners[0], u.partners[1])

  const groupMembers = new Map<string, string[]>()
  for (const p of people) {
    const root = dsu.find(p.id)
    if (!groupMembers.has(root)) groupMembers.set(root, [])
    groupMembers.get(root)!.push(p.id)
  }

  const childGroupsOf = new Map<string, Set<string>>()
  const parentGroupsOf = new Map<string, Set<string>>()
  const parentUnionOfChild = new Map<string, number>()

  unions.forEach((u, idx) => {
    const parentGroup = dsu.find(u.partners[0])
    for (const c of u.children ?? []) {
      parentUnionOfChild.set(c, idx)
      const childGroup = dsu.find(c)
      if (!childGroupsOf.has(parentGroup)) childGroupsOf.set(parentGroup, new Set())
      childGroupsOf.get(parentGroup)!.add(childGroup)
      if (!parentGroupsOf.has(childGroup)) parentGroupsOf.set(childGroup, new Set())
      parentGroupsOf.get(childGroup)!.add(parentGroup)
    }
  })

  const groupGen = new Map<string, number>()
  const queue: string[] = []

  for (const p of people) {
    if (p.generation === undefined) continue
    const group = dsu.find(p.id)
    if (!groupGen.has(group)) {
      groupGen.set(group, p.generation)
      queue.push(group)
    }
  }
  for (const group of groupMembers.keys()) {
    if (!groupGen.has(group) && !parentGroupsOf.has(group)) {
      groupGen.set(group, 0)
      queue.push(group)
    }
  }

  while (queue.length > 0) {
    const group = queue.shift()!
    const gen = groupGen.get(group)!
    for (const childGroup of childGroupsOf.get(group) ?? []) {
      if (!groupGen.has(childGroup)) {
        groupGen.set(childGroup, gen + 1)
        queue.push(childGroup)
      }
    }
    for (const parentGroup of parentGroupsOf.get(group) ?? []) {
      if (!groupGen.has(parentGroup)) {
        groupGen.set(parentGroup, gen - 1)
        queue.push(parentGroup)
      }
    }
  }

  // 孤立していた場合(理論上ここには来ないはずだが念のため)の最終フォールバック
  for (const group of groupMembers.keys()) {
    if (!groupGen.has(group)) groupGen.set(group, 0)
  }

  const genOf = new Map<string, number>()
  for (const [group, members] of groupMembers) {
    const gen = groupGen.get(group)!
    for (const m of members) genOf.set(m, gen)
  }

  return { genOf, parentUnionOfChild }
}

export function computeGenogramLayout(data: GenogramData): GenogramLayoutResult {
  const { people, unions, relations } = data
  const errors: string[] = []

  const cycle = detectCycle(people, unions)
  if (cycle) {
    const names = cycle.map((id) => people.find((p) => p.id === id)?.name ?? id)
    errors.push(`親子関係が循環しています: ${names.join(' → ')}`)
    return { nodes: [], unionLines: [], childConnectors: [], relationLines: [], legend: [], width: 0, height: 0, diagramHeight: 0, legendColWidth: 0, viewBox: '0 0 0 0', errors }
  }

  const { genOf, parentUnionOfChild } = resolveGenerations(people, unions)

  const dsu = new DisjointSet()
  for (const p of people) dsu.find(p.id)
  unions.forEach((u) => {
    const [a, b] = u.partners
    if (genOf.get(a) === genOf.get(b)) dsu.union(a, b)
  })

  const rows = [...new Set(genOf.values())].sort((a, b) => a - b)
  const rowIndexOf = new Map<number, number>()
  rows.forEach((g, i) => rowIndexOf.set(g, i))

  const peopleByRow = new Map<number, Person[]>()
  for (const p of people) {
    const row = rowIndexOf.get(genOf.get(p.id)!)!
    if (!peopleByRow.has(row)) peopleByRow.set(row, [])
    peopleByRow.get(row)!.push(p)
  }

  const nodeById = new Map<string, LayoutNode>()
  const unionLines: UnionLine[] = []
  const childConnectors: ChildConnector[] = []
  let maxX = 0

  let prevRowClusterOrder: string[][] = []

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const rowPeople = peopleByRow.get(rowIndex) ?? []
    const clusterMap = new Map<string, string[]>()
    for (const p of rowPeople) {
      const root = dsu.find(p.id)
      if (!clusterMap.has(root)) clusterMap.set(root, [])
      clusterMap.get(root)!.push(p.id)
    }
    // クラスタ内の並び順は people 配列での初出順に揃える
    const peopleOrderIndex = new Map(people.map((p, i) => [p.id, i]))
    for (const members of clusterMap.values()) {
      members.sort((a, b) => peopleOrderIndex.get(a)! - peopleOrderIndex.get(b)!)
    }

    // このrowのクラスタの左→右の並び順を決める
    const placed = new Set<string>()
    const orderedClusterRoots: string[] = []
    const pushCluster = (memberId: string) => {
      const root = dsu.find(memberId)
      if (placed.has(root)) return
      placed.add(root)
      orderedClusterRoots.push(root)
    }

    for (const parentCluster of prevRowClusterOrder) {
      // 親クラスタに属する全unionの子を、union出現順・children出現順で収集
      const childIdsInOrder: string[] = []
      unions.forEach((u) => {
        const [a, b] = u.partners
        if (parentCluster.includes(a) && parentCluster.includes(b)) {
          for (const c of u.children ?? []) childIdsInOrder.push(c)
        }
      })
      for (const cid of childIdsInOrder) {
        if (rowIndexOf.get(genOf.get(cid)!) === rowIndex) pushCluster(cid)
      }
    }
    // 残り(親がこの図の中にいない人=入り婿・養子など)は入力順で追加
    for (const p of rowPeople) pushCluster(p.id)

    // 各クラスタの「望ましい中心x」(親unionの中点の平均)を計算
    const desiredCenterOf = new Map<string, number | null>()
    for (const root of orderedClusterRoots) {
      const members = clusterMap.get(root)!
      const centers: number[] = []
      for (const m of members) {
        const uIdx = parentUnionOfChild.get(m)
        if (uIdx !== undefined) {
          const ul = unionLines[uIdx] // unionは生成順に埋めていくのでindexアクセス可能になった時点のみ有効
          if (ul) centers.push(ul.midX)
        }
      }
      desiredCenterOf.set(root, centers.length > 0 ? centers.reduce((a, b) => a + b, 0) / centers.length : null)
    }

    const y = LAYOUT.margin + rowIndex * LAYOUT.rowHeight + LAYOUT.symbolSize / 2
    let cursor = LAYOUT.margin

    for (const root of orderedClusterRoots) {
      const members = clusterMap.get(root)!
      const widthById = new Map(members.map((id) => [id, slotWidthOf(people.find((p) => p.id === id)!)]))
      const clusterWidth = members.reduce((sum, id) => sum + widthById.get(id)!, 0) + (members.length - 1) * LAYOUT.partnerGap
      const desired = desiredCenterOf.get(root) ?? null
      const idealLeft = desired !== null ? desired - clusterWidth / 2 : cursor
      const left = Math.max(cursor, idealLeft)

      let memberCursor = left
      members.forEach((id) => {
        const w = widthById.get(id)!
        const person = people.find((p) => p.id === id)!
        const cx = memberCursor + w / 2
        nodeById.set(id, { person, x: cx, y, slotWidth: w, size: LAYOUT.symbolSize })
        maxX = Math.max(maxX, cx + w / 2)
        memberCursor += w + LAYOUT.partnerGap
      })

      cursor = left + clusterWidth + LAYOUT.clusterGap
    }

    // このrowで完結する婚姻線を確定させる(次rowの desiredCenter 計算に使うため先に埋める)
    unions.forEach((u, idx) => {
      if (unionLines[idx]) return
      const [a, b] = u.partners
      const na = nodeById.get(a)
      const nb = nodeById.get(b)
      if (!na || !nb) return
      unionLines[idx] = {
        union: u,
        unionIndex: idx,
        x1: na.x,
        y1: na.y,
        x2: nb.x,
        y2: nb.y,
        midX: (na.x + nb.x) / 2,
        midY: (na.y + nb.y) / 2,
      }
    })

    prevRowClusterOrder = orderedClusterRoots.map((root) => clusterMap.get(root)!)
  }

  // 未確定分(まれ)を最終フォールバックで埋める
  unions.forEach((u, idx) => {
    if (unionLines[idx]) return
    const [a, b] = u.partners
    const na = nodeById.get(a)
    const nb = nodeById.get(b)
    if (!na || !nb) return
    unionLines[idx] = {
      union: u,
      unionIndex: idx,
      x1: na.x,
      y1: na.y,
      x2: nb.x,
      y2: nb.y,
      midX: (na.x + nb.x) / 2,
      midY: (na.y + nb.y) / 2,
    }
  })

  // 子への接続線(バスライン)
  unions.forEach((u, idx) => {
    if (!u.children || u.children.length === 0) return
    const ul = unionLines[idx]
    if (!ul) return
    const childNodes = u.children.map((cid) => nodeById.get(cid)).filter((n): n is LayoutNode => !!n)
    const [firstChild] = childNodes
    if (!firstChild) return

    const rowGapY = firstChild.y - ul.midY
    const busY = ul.midY + rowGapY * LAYOUT.busRatio
    const xs = childNodes.map((n) => n.x)
    childConnectors.push({
      unionIndex: idx,
      dropX: ul.midX,
      dropTopY: ul.midY,
      busY,
      busX1: Math.min(ul.midX, ...xs),
      busX2: Math.max(ul.midX, ...xs),
      children: childNodes.map((n) => ({ id: n.person.id, x: n.x, topY: n.y - n.size / 2 })),
    })
  })

  // 感情関係線
  const relationLines: RelationLine[] = []
  relations.forEach((r, idx) => {
    const from = nodeById.get(r.from)
    const to = nodeById.get(r.to)
    if (!from || !to) return
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const clip = LAYOUT.symbolSize / 2 + 4
    const x1 = from.x + ux * clip
    const y1 = from.y + uy * clip
    const x2 = to.x - ux * clip
    const y2 = to.y - uy * clip
    // ラベルは線の真上に重ねず、垂直方向に少しオフセットして避ける(他のノード・線との重なり対策)
    const px = -uy
    const py = ux
    const labelOffset = 24
    relationLines.push({
      relation: r,
      index: idx,
      x1,
      y1,
      x2,
      y2,
      labelX: (x1 + x2) / 2 + px * labelOffset,
      labelY: (y1 + y2) / 2 + py * labelOffset,
    })
  })
  // ラベルが近すぎる場合は少しずつ縦にずらして重なりを避ける(ラベル文字幅も考慮)
  const labelHalfWidth = (label: string) => Math.max(14, label.length * 5.5 + 4)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < relationLines.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = relationLines[i]
        const b = relationLines[j]
        if (!a || !b || !a.relation.label || !b.relation.label) continue
        const dist = Math.hypot(a.labelX - b.labelX, a.labelY - b.labelY)
        const minDist = labelHalfWidth(a.relation.label) + labelHalfWidth(b.relation.label) + 8
        if (dist < minDist) {
          a.labelY += 20
        }
      }
    }
  }

  const legend: LegendItem[] = []
  const unionLabels: Record<string, string> = {
    married: '婚姻',
    divorced: '離婚',
    separated: '別居',
    distant: '疎遠(夫婦)',
    conflict: '対立(夫婦)',
  }
  const relationLabels: Record<string, string> = {
    conflict: '対立',
    cutoff: '断絶',
    enmeshed: '巻き込み',
    close: '密着(良好)',
    distant: '疎遠',
  }
  const usedUnionStatuses = new Set(unions.map((u) => u.status))
  const usedRelationTypes = new Set(relations.map((r) => r.type))
  for (const status of usedUnionStatuses) legend.push({ kind: 'union', value: status, label: unionLabels[status] ?? status })
  for (const type of usedRelationTypes) legend.push({ kind: 'relation', value: type, label: relationLabels[type] ?? type })
  if (people.some((p) => !!p.healthNote)) {
    legend.push({ kind: 'badge', value: 'health', label: '健康メモあり(ホバーで表示)' })
  }
  if (people.some((p) => !hasEnrichedInfo(p))) {
    legend.push({ kind: 'badge', value: 'nudge', label: '情報を追加できます' })
  }

  const rowCount = rows.length
  const diagramHeight = LAYOUT.margin * 2 + Math.max(rowCount - 1, 0) * LAYOUT.rowHeight + LAYOUT.symbolSize
  const legendHeight = legend.length > 0 ? LAYOUT.legendTopGap + Math.ceil(legend.length / 2) * LAYOUT.legendRowHeight + LAYOUT.margin / 2 : LAYOUT.margin / 2
  // 凡例は2列組み。ラベルの文字数が長い項目(健康メモ等)があっても列同士が重ならないよう、
  // 実際の最長ラベルから列幅を逆算する(短いラベルだけの時は詰めて、長い時だけ広げる)
  const legendMaxLabelLen = legend.length > 0 ? Math.max(...legend.map((item) => item.label.length)) : 0
  const legendColWidth = Math.max(160, 42 + legendMaxLabelLen * 11 + 16)
  const legendWidth = legend.length > 0 ? LAYOUT.margin * 2 + legendColWidth * Math.min(2, legend.length) : 0

  const width = Math.max(maxX + LAYOUT.margin, legendWidth, 320)
  const height = diagramHeight + legendHeight

  return {
    nodes: [...nodeById.values()],
    unionLines,
    childConnectors,
    relationLines,
    legend,
    width,
    height,
    diagramHeight,
    legendColWidth,
    viewBox: `0 0 ${width} ${height}`,
    errors,
  }
}

export function useGenogramLayout(data: GenogramData): GenogramLayoutResult {
  return computeGenogramLayout(data)
}
