// 剣道 けいこ記録アプリ (keiko) の型定義。

export interface KeikoMember {
  id: string
  name: string
  sortOrder: number
}

export interface KeikoItem {
  id: string
  name: string
  sortOrder: number
  active: boolean
}

/** 花丸1件。存在する＝できた。 */
export interface KeikoRecord {
  memberId: string
  itemId: string
  date: string // YYYY-MM-DD
}

export interface KeikoState {
  members: KeikoMember[]
  items: KeikoItem[]
  records: KeikoRecord[]
}
