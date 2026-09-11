export type Gender = 'M' | 'F' | 'U'

export interface Person {
  id: string
  name: string
  gender: Gender
  /** 省略時は unions.children の親子関係から自動算出する */
  generation?: number
  /** 明示的に故人と分かっていて没年が不明な場合に使う。没年があれば省略してよい(自動的に故人扱いになる) */
  deceased?: boolean
  /** true なら二重線枠で強調。1人まで */
  isSelf?: boolean
  /** 本人(isSelf)から見た続柄。例: "母","叔父","姪","祖父(父方)"。名前の下に小さく表示する */
  relation?: string
  /** 生年(西暦)。記号の中央に年齢、下に名前の次の行で 1950~2020 のように生涯を表示する */
  birthYear?: number
  /** 没年(西暦)。指定すると自動的に故人(×印+享年)として扱う */
  deathYear?: number
  /** 職業。note と合わせて記号の上に短い特徴要約として表示する */
  occupation?: string
  /** 疾患・健康上の注記。記号の隅に「+」の印を出し、ホバー/タップで内容を表示する */
  healthNote?: string
  /** 人物像(気づき・エピソード・関係性の背景など)。クリックした詳細パネルの中心的な項目。長文もOK */
  note?: string
  /**
   * 職業・人物像から AI が生成した20文字程度の特徴要約。記号の上に常時表示する。
   * occupation/note を編集して保存するたびに裏側で自動生成・更新する（詳細パネルには専用の入力欄を置かない）。
   */
  characteristicSummary?: string
}

export type UnionStatus = 'married' | 'divorced' | 'separated' | 'distant' | 'conflict'

export interface Union {
  partners: [string, string]
  status: UnionStatus
  children?: string[]
  /** 婚姻/関係が始まった年(西暦) */
  startYear?: number
  /** 離婚・別居など関係が終わった年(西暦) */
  endYear?: number
  /** 線の近くに小さく表示する短い注記 */
  note?: string
}

export type RelationType = 'conflict' | 'cutoff' | 'enmeshed' | 'close' | 'distant'

export interface Relation {
  from: string
  to: string
  type: RelationType
  label?: string
}

export interface GenogramData {
  people: Person[]
  unions: Union[]
  relations: Relation[]
}

export const GENDERS: Gender[] = ['M', 'F', 'U']
export const UNION_STATUSES: UnionStatus[] = ['married', 'divorced', 'separated', 'distant', 'conflict']
export const RELATION_TYPES: RelationType[] = ['conflict', 'cutoff', 'enmeshed', 'close', 'distant']

/**
 * 本人(isSelf)から見た続柄の選択肢。「祖父(父方)」のような父方/母方の区別は持たない
 * (左右どちら側かはレイアウト側が血縁を辿って自動的に決めるため、ラベルに含める必要が無い)。
 */
export const RELATION_OPTIONS = [
  '本人',
  '配偶者', '夫', '妻', 'パートナー',
  '父', '母',
  '息子', '娘',
  '兄', '姉', '弟', '妹',
  '祖父', '祖母', '曽祖父', '曽祖母',
  '孫',
  '伯父', '叔父', '伯母', '叔母',
  '甥', '姪',
  '従兄弟', '従姉妹',
  '養父', '養母', '継父', '継母',
  '義父', '義母', '義兄', '義姉', '義弟', '義妹',
  '友人', 'その他',
] as const
