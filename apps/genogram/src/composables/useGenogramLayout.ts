import type { GenogramData, Person, Union, Relation } from '~/types/genogram'
import {
  hasEnrichedInfo,
  belowNameLines,
  characteristicLines,
  displayName,
  CHARACTERISTIC_LINE_HEIGHT,
  CHARACTERISTIC_GAP_ABOVE_ICON,
} from '~/utils/personDisplay'

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
  /** 婚姻線から下ろし始めるx(婚姻線の中点)。ここから始めないと線が宙に浮く */
  startX: number
  /** 中央の子(生まれ順)へ向けて下ろす先のx。startXと違う場合は kneeY で横に折れる */
  dropX: number
  dropTopY: number
  /** startX から dropX へ横に折れる高さ。startX===dropX ならまっすぐ下りるので使われない */
  kneeY: number
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
  // 名前欄には「徹（父）」のように続柄を丸括弧で続けて表示するため、その分の文字数も見積もりに含める
  const nameWidth = displayName(person).length * LAYOUT.charWidth + LAYOUT.labelPadding
  // 生涯・特徴要約は名前より小さいフォントで表示するため、文字幅は控えめに見積もる
  const belowWidths = belowNameLines(person).map((line) => line.length * 8 + LAYOUT.labelPadding)
  const charWidths = characteristicLines(person).map((line) => line.length * 8 + LAYOUT.labelPadding)
  return Math.max(LAYOUT.symbolSize + 16, nameWidth, ...belowWidths, ...charWidths)
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
 *
 * 同じunionの子(きょうだい)も同様に必ず同じ世代なので、同じグループにまとめる。
 * これが無いと、片方の血筋がより深い相手と結婚した人だけが下の世代へ引っ張られ、
 * 実のきょうだいから切り離されて配偶者の兄弟の側に並んでしまう。
 */
function resolveGenerations(people: Person[], unions: Union[]) {
  const dsu = new DisjointSet()
  for (const p of people) dsu.find(p.id)
  for (const u of unions) {
    dsu.union(u.partners[0], u.partners[1])
    const kids = u.children ?? []
    const [firstKid] = kids
    if (firstKid !== undefined) {
      for (const kid of kids) dsu.union(firstKid, kid)
    }
  }

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
      if (parentGroup === childGroup) return // 近親婚など異常データは無視(循環自体は別途detectCycleで検出)
      if (!childGroupsOf.has(parentGroup)) childGroupsOf.set(parentGroup, new Set())
      childGroupsOf.get(parentGroup)!.add(childGroup)
      if (!parentGroupsOf.has(childGroup)) parentGroupsOf.set(childGroup, new Set())
      parentGroupsOf.get(childGroup)!.add(parentGroup)
    }
  })

  const groupGen = new Map<string, number>()

  // 明示的な世代指定を、そのグループの初期値にする(グループ内で最初に見つかった値を採用)
  for (const p of people) {
    if (p.generation === undefined) continue
    const group = dsu.find(p.id)
    if (!groupGen.has(group)) groupGen.set(group, p.generation)
  }
  // 親グループを持たないグループ(=データ上いちばん上の世代)は0を初期値にする
  for (const group of groupMembers.keys()) {
    if (!groupGen.has(group) && !parentGroupsOf.has(group)) groupGen.set(group, 0)
  }

  // 親→子は「親の世代+1」を子に伝える。夫婦それぞれの実家の血筋が合流する場合など、
  // 1つのグループ(例:結婚した夫婦)が複数の親グループを持つことがある。その場合は
  // より深い(値が大きい)方に合わせる ―― 浅い方の血筋が先に確定してしまうと、
  // 本来もっと下の世代にいるはずの人物が実の親と同じ段に引き上げられてしまうため。
  // 全ての親グループが確定してから子グループを確定させたいので、トポロジカル順(Kahn法)で処理する
  const indegree = new Map<string, number>()
  for (const group of groupMembers.keys()) indegree.set(group, parentGroupsOf.get(group)?.size ?? 0)

  const queue: string[] = []
  for (const group of groupMembers.keys()) {
    if (indegree.get(group) === 0) queue.push(group)
  }

  const topoOrder: string[] = []
  while (queue.length > 0) {
    const group = queue.shift()!
    topoOrder.push(group)
    if (!groupGen.has(group)) groupGen.set(group, 0)
    const gen = groupGen.get(group)!
    for (const childGroup of childGroupsOf.get(group) ?? []) {
      groupGen.set(childGroup, Math.max(groupGen.get(childGroup) ?? -Infinity, gen + 1))
      const remaining = (indegree.get(childGroup) ?? 1) - 1
      indegree.set(childGroup, remaining)
      if (remaining <= 0) queue.push(childGroup)
    }
  }

  // 孤立していた場合や、想定外の残留(indegreeが0にならなかった)場合の最終フォールバック
  for (const group of groupMembers.keys()) {
    if (!groupGen.has(group)) groupGen.set(group, 0)
  }

  // 上向きの調整: 親グループは「いちばん浅い子のすぐ1つ上」に引き下げる。
  // 上の下向きパスは親を持たないグループを一律0に置くため、片方の家系だけ世代数が多いと
  // もう片方の祖父母が実際より上の段(例: 相手方の曽祖父母と同じ段)に描かれてしまう。
  // 子側から見て常に「親は自分の1つ上」になるよう、トポロジカル順の逆順に詰め直す。
  // 明示的にgenerationが指定された人を含むグループは、その指定を尊重して動かさない。
  const pinned = new Set<string>()
  for (const p of people) {
    if (p.generation !== undefined) pinned.add(dsu.find(p.id))
  }
  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const group = topoOrder[i]!
    if (pinned.has(group)) continue
    const childGroups = childGroupsOf.get(group)
    if (!childGroups || childGroups.size === 0) continue
    let minChildGen = Infinity
    for (const childGroup of childGroups) {
      minChildGen = Math.min(minChildGen, groupGen.get(childGroup) ?? Infinity)
    }
    if (Number.isFinite(minChildGen)) groupGen.set(group, minChildGen - 1)
  }

  const genOf = new Map<string, number>()
  for (const [group, members] of groupMembers) {
    const gen = groupGen.get(group)!
    for (const m of members) genOf.set(m, gen)
  }

  return { genOf, parentUnionOfChild }
}

type Side = 'father' | 'mother'

/**
 * 本人(isSelf)の親unionを基準に、血のつながりだけを辿って全員に「父方/母方」を割り当てる
 * (配偶者には伝えない。配偶者は結婚で入ってきた側であって血筋ではないため)。
 *
 * 父方/母方の判定は親unionのパートナーの性別(M=父方, F=母方)で行う。両方Uなど性別で判定できない
 * 場合はパートナー配列の並び順(0番目=父方扱い)にフォールバックする。これは実際の性自認を主張する
 * ものではなく、画面の左右どちらの側に割り振るかの目印に過ぎない。
 *
 * 本人の親unionが特定できない(本人が居ない/親が不明)場合は空のまま返す＝並び順への影響なし。
 */
function resolveSide(people: Person[], unions: Union[]): Map<string, Side> {
  const sideOf = new Map<string, Side>()
  const self = people.find((p) => p.isSelf)
  if (!self) return sideOf
  const parentUnion = unions.find((u) => u.children?.includes(self.id))
  if (!parentUnion) return sideOf

  const [a, b] = parentUnion.partners
  const genderOf = new Map(people.map((p) => [p.id, p.gender]))
  let fatherId = a
  let motherId = b
  if (genderOf.get(a) === 'F' && genderOf.get(b) === 'M') {
    fatherId = b
    motherId = a
  }
  sideOf.set(fatherId, 'father')
  sideOf.set(motherId, 'mother')

  const queue: string[] = [fatherId, motherId]
  while (queue.length > 0) {
    const id = queue.shift()!
    const side = sideOf.get(id)!
    // 下へ: このidが親であるunionの子(きょうだい・甥姪・いとこ等)へ伝える。
    // 本人(self)は両側の合流点であり片側に属さないため、ここで伝播を止める。
    for (const u of unions) {
      if (!u.partners.includes(id)) continue
      for (const c of u.children ?? []) {
        if (c === self.id) continue
        if (!sideOf.has(c)) {
          sideOf.set(c, side)
          queue.push(c)
        }
      }
    }
    // 上へ: このidが子であるunionの親(祖先)へ伝える
    for (const u of unions) {
      if (!u.children?.includes(id)) continue
      for (const p of u.partners) {
        if (!sideOf.has(p)) {
          sideOf.set(p, side)
          queue.push(p)
        }
      }
    }
  }

  return sideOf
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
  const sideOf = resolveSide(people, unions)

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

  // 最上段(row0)の人物の特徴要約(記号の上に出す)は、行数によっては margin だけでは収まらず
  // SVGの外にはみ出すため、あらかじめ上の余白を広げておく
  // (row0にしか影響しない。他の行はそのすぐ上の行のノード群が余白代わりになるため不要)
  let topMarginExtra = 0
  for (const p of people) {
    if (rowIndexOf.get(genOf.get(p.id)!) !== 0) continue
    const lines = characteristicLines(p)
    if (lines.length === 0) continue
    const boxHeight = CHARACTERISTIC_LINE_HEIGHT * lines.length + 1
    const boxBottom = LAYOUT.margin - CHARACTERISTIC_GAP_ABOVE_ICON
    const boxTop = boxBottom - boxHeight
    if (boxTop < 0) topMarginExtra = Math.max(topMarginExtra, -boxTop)
  }

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
    const genderOf = new Map(people.map((p) => [p.id, p.gender]))
    for (const members of clusterMap.values()) {
      members.sort((a, b) => peopleOrderIndex.get(a)! - peopleOrderIndex.get(b)!)
      // 夫婦は男性を左・女性を右にするのがジェノグラムの慣習。2人ちょうどでM/Fが1人ずつの時だけ入れ替える
      // (単身者・同性カップル・再婚等で3人以上つながったクラスタは対象外＝入力順のまま変えない)
      if (members.length === 2) {
        const [idA, idB] = members as [string, string]
        if (genderOf.get(idA) === 'F' && genderOf.get(idB) === 'M') members.reverse()
      }
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

    // 父方/母方(sideOf)を最優先で並べる(父方=0, 不明=1, 母方=2)。ジェノグラムの慣習どおり
    // 父方は常に左半分、母方は常に右半分にまとまるようにするため、これは重心より優先する。
    // 同じ側の中では親の位置を基準に左→右へ並べ替える(重心ソート)。
    // 上の走査順だけだと、夫婦クラスタが「妻側の親」に先に拾われた場合に
    // 夫の実きょうだいが妻のきょうだいより後ろへ回され、遠くへ飛ばされてしまう。
    // 親unionの中点が左にある人ほど左に置くことで、それぞれのきょうだいが自分の親の真下に集まる。
    // 親がこの図にいないクラスタ(nullのもの)は重心を持たないので、同じ側の中では走査順のまま末尾に残る。
    const sideRankOf = (root: string): number => {
      for (const m of clusterMap.get(root) ?? []) {
        const side = sideOf.get(m)
        if (side === 'father') return 0
        if (side === 'mother') return 2
      }
      return 1
    }
    orderedClusterRoots.sort((a, b) => {
      const rankDiff = sideRankOf(a) - sideRankOf(b)
      if (rankDiff !== 0) return rankDiff
      const centerA = desiredCenterOf.get(a) ?? Infinity
      const centerB = desiredCenterOf.get(b) ?? Infinity
      return centerA - centerB
    })

    const y = LAYOUT.margin + topMarginExtra + rowIndex * LAYOUT.rowHeight + LAYOUT.symbolSize / 2
    let cursor: number = LAYOUT.margin

    // 結婚していない兄弟は1人ずつ独立したクラスタになるが、全員が同じ親unionを desiredCenter に持つ。
    // 1人ずつ順に詰めると全体が親の中心から右へずれてしまうため、同じ desiredCenter を持つ連続クラスタは
    // 「兄弟グループ」としてまとめ、グループ全体の幅で親の中心に合わせる
    const clusterBlocks: string[][] = []
    for (const root of orderedClusterRoots) {
      const desired = desiredCenterOf.get(root) ?? null
      const prevBlock = clusterBlocks[clusterBlocks.length - 1]
      const prevRoot = prevBlock?.[prevBlock.length - 1]
      if (prevBlock && prevRoot !== undefined && desired !== null && desiredCenterOf.get(prevRoot) === desired) {
        prevBlock.push(root)
      } else {
        clusterBlocks.push([root])
      }
    }

    for (const block of clusterBlocks) {
      const blockClusters = block.map((root) => {
        const members = clusterMap.get(root)!
        const widthById = new Map(members.map((id) => [id, slotWidthOf(people.find((p) => p.id === id)!)]))
        const clusterWidth = members.reduce((sum, id) => sum + widthById.get(id)!, 0) + (members.length - 1) * LAYOUT.partnerGap
        return { members, widthById, clusterWidth }
      })
      const totalWidth = blockClusters.reduce((sum, c) => sum + c.clusterWidth, 0) + (blockClusters.length - 1) * LAYOUT.clusterGap
      const desired = desiredCenterOf.get(block[0]!) ?? null
      let idealLeft = desired !== null ? desired - totalWidth / 2 : cursor

      // 兄弟が多い等でこの行が上の世代よりずっと横長になると、中央寄せしようとした結果
      // 左マージンより外に出てしまうことがある。その場合は諦めて詰めるのではなく、
      // 既に配置済みの上の世代(祖先)ごと右へずらして中央寄せを成立させる
      if (desired !== null && idealLeft < LAYOUT.margin && cursor <= LAYOUT.margin) {
        const shiftNeeded = LAYOUT.margin - idealLeft
        for (const node of nodeById.values()) node.x += shiftNeeded
        for (const ul of unionLines) {
          if (!ul) continue
          ul.x1 += shiftNeeded
          ul.x2 += shiftNeeded
          ul.midX += shiftNeeded
        }
        maxX += shiftNeeded
        idealLeft += shiftNeeded
      }

      let blockLeft = Math.max(cursor, idealLeft)

      for (const { members, widthById, clusterWidth } of blockClusters) {
        let memberCursor = blockLeft
        members.forEach((id) => {
          const w = widthById.get(id)!
          const person = people.find((p) => p.id === id)!
          const cx = memberCursor + w / 2
          nodeById.set(id, { person, x: cx, y, slotWidth: w, size: LAYOUT.symbolSize })
          maxX = Math.max(maxX, cx + w / 2)
          memberCursor += w + LAYOUT.partnerGap
        })
        blockLeft += clusterWidth + LAYOUT.clusterGap
      }
      cursor = blockLeft
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

  // 兄弟(比較対象)がいない孤立した祖先の行を、実際の子の位置の真上に揃え直す。
  // 上のメインループは上→下の順に配置するため、ある行にクラスタが1つしか無い(比較対象が無い)場合、
  // その時点ではマージン(左端)に置くしかない。しかしそのすぐ下の世代で「反対側の血筋」が
  // sideOf の並び替えにより右へ押し出されると、先に置いたこちらの行だけ追従できず、
  // 実際の子孫から見て不自然な位置(例: 父方の真上)に取り残されてしまう。
  // 全行の配置が終わったあとに、下の世代から上の世代へ順に「クラスタが1つだけの行」を
  // その行が持つunionの子の実際の位置の中央に合わせて横シフトする(兄弟がいないので重なりの心配はない)。
  for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex--) {
    const rowPeopleIds = (peopleByRow.get(rowIndex) ?? []).map((p) => p.id)
    if (rowPeopleIds.length === 0) continue
    const rootsInRow = new Set(rowPeopleIds.map((id) => dsu.find(id)))
    if (rootsInRow.size !== 1) continue

    const childXs: number[] = []
    unions.forEach((u) => {
      const [a, b] = u.partners
      if (!rowPeopleIds.includes(a) && !rowPeopleIds.includes(b)) return
      for (const c of u.children ?? []) {
        const cn = nodeById.get(c)
        if (cn) childXs.push(cn.x)
      }
    })
    if (childXs.length === 0) continue

    const targetCenter = childXs.reduce((sum, x) => sum + x, 0) / childXs.length
    const currentCenter = rowPeopleIds.reduce((sum, id) => sum + nodeById.get(id)!.x, 0) / rowPeopleIds.length
    let shift = targetCenter - currentCenter
    if (shift === 0) continue

    // マージンより外へ出そうな場合はそこで止める(重なる相手がいないので右へは自由に動かしてよいが、左端は守る)
    const minLeftEdge = Math.min(...rowPeopleIds.map((id) => {
      const n = nodeById.get(id)!
      return n.x - n.slotWidth / 2
    }))
    const minShift = LAYOUT.margin - minLeftEdge
    if (shift < minShift) shift = minShift
    if (Math.abs(shift) < 0.5) continue

    for (const id of rowPeopleIds) {
      const n = nodeById.get(id)!
      n.x += shift
      maxX = Math.max(maxX, n.x + n.slotWidth / 2)
    }
    unions.forEach((u, idx) => {
      const [a, b] = u.partners
      if (!rowPeopleIds.includes(a) && !rowPeopleIds.includes(b)) return
      const ul = unionLines[idx]
      if (!ul) return
      ul.x1 += shift
      ul.x2 += shift
      ul.midX += shift
    })
  }

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
    // 親からの縦線は、子の人数の真ん中(生まれ順)へ向けて下ろす(3人なら2番目、5人なら3番目)。
    // 偶数人の場合は中央2人の中間。単純な親の中点ではなく、視覚的に「兄弟の真ん中」に見えるようにする
    const n = childNodes.length
    const dropX = n % 2 === 1 ? childNodes[(n - 1) / 2]!.x : (childNodes[n / 2 - 1]!.x + childNodes[n / 2]!.x) / 2
    childConnectors.push({
      unionIndex: idx,
      startX: ul.midX,
      dropX,
      dropTopY: ul.midY,
      kneeY: ul.midY + rowGapY * (LAYOUT.busRatio / 2),
      busY,
      busX1: Math.min(dropX, ul.midX, ...xs),
      busX2: Math.max(dropX, ul.midX, ...xs),
      children: childNodes.map((n) => ({ id: n.person.id, x: n.x, topY: n.y - n.size / 2 })),
    })
  })

  // 同じ段で兄弟バスの横幅が重なると1本の長い線に見えてしまい、どの子がどの親の子か読めなくなる
  // (夫婦の一方が相手方の兄弟の間に配置されると必ず起きる)。重なる分だけ少しずつ下にずらす。
  const BUS_STAGGER_STEP = 14
  const busRowGroups = new Map<number, ChildConnector[]>()
  for (const cc of childConnectors) {
    const key = Math.round(cc.busY)
    if (!busRowGroups.has(key)) busRowGroups.set(key, [])
    busRowGroups.get(key)!.push(cc)
  }
  for (const group of busRowGroups.values()) {
    if (group.length < 2) continue
    group.sort((a, b) => a.busX1 - b.busX1)
    const settled: ChildConnector[] = []
    for (const cc of group) {
      // 子の記号の上端より下にはみ出さない範囲で、重なりが無くなる高さまで下げる
      const childTopY = Math.min(...cc.children.map((c) => c.topY))
      const maxBusY = childTopY - 8
      while (
        cc.busY + BUS_STAGGER_STEP <= maxBusY &&
        settled.some((o) => Math.abs(o.busY - cc.busY) < 1 && o.busX2 > cc.busX1 && cc.busX2 > o.busX1)
      ) {
        cc.busY += BUS_STAGGER_STEP
      }
      settled.push(cc)
    }
  }

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
    codependent: '共依存',
    close: '良好',
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
  const diagramHeight = LAYOUT.margin * 2 + topMarginExtra + Math.max(rowCount - 1, 0) * LAYOUT.rowHeight + LAYOUT.symbolSize
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
