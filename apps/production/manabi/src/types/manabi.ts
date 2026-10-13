// manabi（まなび）の型。サーバーとページで共有する。

export interface ManabiQuestion {
  q: string
  /** 選択肢は常に4つ。並びはサーバー側でシャッフル済み */
  choices: string[]
  /** 正解の選択肢の位置（0〜3） */
  answer: number
  explanation: string
}

export interface ManabiSet {
  id: string
  theme: string
  title: string
  level: string
  questions: ManabiQuestion[]
  createdAt: string
  /** 「みんなの問題」に載せるか。false ならリンクを知っている人だけが開ける */
  isPublic: boolean
}

/** 「みんなの問題」の一覧に出す1件。問題の中身は持たない */
export interface ManabiListItem {
  id: string
  theme: string
  title: string
  level: string
  count: number
  createdAt: string
}

export const MANABI_COUNTS = [10, 20, 30] as const
export type ManabiCount = (typeof MANABI_COUNTS)[number]
