export type Gender = 'M' | 'F' | 'U'

export interface Person {
  id: string
  name: string
  gender: Gender
  /** 省略時は unions.children の親子関係から自動算出する */
  generation?: number
  deceased?: boolean
  /** true なら二重線枠で強調。1人まで */
  isSelf?: boolean
  /** 記号の下に小さく表示する短い注記 */
  note?: string
}

export type UnionStatus = 'married' | 'divorced' | 'separated' | 'distant' | 'conflict'

export interface Union {
  partners: [string, string]
  status: UnionStatus
  children?: string[]
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
