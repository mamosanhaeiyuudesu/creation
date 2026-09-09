import type { Person, Union, Relation } from './genogram'

export type GenogramSelection =
  | { kind: 'person'; person: Person }
  | { kind: 'union'; union: Union; index: number }
  | { kind: 'relation'; relation: Relation; index: number }
