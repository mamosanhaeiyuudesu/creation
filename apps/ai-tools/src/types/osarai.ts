// osarai（おさらい）の型。サーバーとページで共有する。

export interface OsaraiQuestion {
  q: string
  /** 選択肢は常に4つ。並びはサーバー側でシャッフル済み */
  choices: string[]
  /** 正解の選択肢の位置（0〜3） */
  answer: number
  explanation: string
}

export interface OsaraiSet {
  id: string
  theme: string
  title: string
  level: string
  questions: OsaraiQuestion[]
  createdAt: string
}

export const OSARAI_COUNTS = [10, 20, 30] as const
export type OsaraiCount = (typeof OSARAI_COUNTS)[number]
