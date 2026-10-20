// manabi（マナビー）の型。サーバーとページで共有する。

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
  /** 作った人の名前（任意の表示用の文字。空なら表示しない） */
  creatorName: string
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
  creatorName: string
  count: number
  createdAt: string
}

export const MANABI_CREATOR_NAME_MAX = 20

/** 問題の対象。大人向けが既定。博士向けは専門家・上級者の水準、子供向けは小学5〜6年生ぐらいの言葉・水準。表示順（左から） */
export const MANABI_AUDIENCES = ['doctor', 'adult', 'kids'] as const
export type ManabiAudience = (typeof MANABI_AUDIENCES)[number]
export const MANABI_AUDIENCE_LABELS: Record<ManabiAudience, string> = { doctor: '博士向け', adult: '大人向け', kids: '子供向け' }

export const MANABI_COUNTS = [5, 10, 20, 30] as const
export type ManabiCount = (typeof MANABI_COUNTS)[number]

/** イイねの「1人」を表す、端末が作るランダムID */
export const MANABI_LIKE_VOTER_PATTERN = /^[a-zA-Z0-9-]{16,64}$/
