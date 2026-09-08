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
  /** 生年(西暦)。名前の下に (1950-2020) のように表示する */
  birthYear?: number
  /** 没年(西暦)。指定すると自動的に故人(×印)として扱う */
  deathYear?: number
  /** 職業。名前の下に小さく表示する */
  occupation?: string
  /** 疾患・健康上の注記。記号の隅に「+」の印を出し、ホバー/タップで内容を表示する */
  healthNote?: string
  /** 記号の下に小さく表示する短い注記(その他の重要な出来事など) */
  note?: string
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
