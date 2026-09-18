/** miyako「直近の傾向」の型。サーバー（src/server/utils/miyako-trends*.ts）とページで共有する。 */

export type MiyakoSessionKind = '定例会' | '臨時会'

export type MiyakoSessionStatus = 'found' | 'indexed' | 'stored' | 'analyzed'

export interface MiyakoTrendTerm {
  term: string
  rank: number
  /** 今回の出現回数 */
  count: number
  /** 今回の10万字あたりの出現回数 */
  rate: number
  /** 過去3年の定例会の10万字あたりの出現回数 */
  baseRate: number
  /** 前回の定例会での出現回数 */
  prevCount: number
  buzz: number
  /** 何が議論されたか（AIの一文） */
  note: string
}

export interface MiyakoTrendSessionSummary {
  key: string
  label: string
  heldFrom: string
  heldTo: string
}

export interface MiyakoTrendCurrent extends MiyakoTrendSessionSummary {
  analyzedAt: string
  baseSessions: number
  prevLabel: string
  terms: MiyakoTrendTerm[]
}

export interface MiyakoTrendState {
  /** 分析済みの定例会（新しい順） */
  sessions: MiyakoTrendSessionSummary[]
  current: MiyakoTrendCurrent | null
}

export interface MiyakoTrendRunResult {
  /** 一覧ページで見つけた取り込み対象の会期の数 */
  listed: number
  /** この回で状態が進んだ会期（例: 令和8年第4回定例会: indexed→analyzed） */
  progressed: string[]
  /** 予算切れなどで次回に回した会期 */
  deferred: string[]
  errors: string[]
}
