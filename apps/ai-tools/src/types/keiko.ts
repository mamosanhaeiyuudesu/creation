// 剣道 けいこ記録アプリ (keiko) の型定義。

export interface KeikoMember {
  id: string
  name: string
  sortOrder: number
}

/**
 * 練習項目。メンバーごとに持つ（護と匡で別々の内容・本数・ポイントを設定できる）。
 * 1回できたときの獲得ポイント = repCount * pointPerRep（例: はや素振り 10本 × 2pt = 20pt）。
 */
export interface KeikoItem {
  id: string
  memberId: string
  name: string
  repCount: number
  pointPerRep: number
  sortOrder: number
  active: boolean
}

/**
 * その日の評価1件。行が存在する＝やった。
 * rate は 10〜100 の10刻み（％）。100 なら花丸、それ以外はその％だけできた扱いで、
 * 獲得ポイントは round(repCount * pointPerRep * rate / 100)。
 */
export interface KeikoRecord {
  memberId: string
  itemId: string
  date: string // YYYY-MM-DD
  rate: number
}

export interface KeikoState {
  members: KeikoMember[]
  items: KeikoItem[]
  records: KeikoRecord[]
}

/** 集計済みポイント1件。key は日別なら YYYY-MM-DD、月別なら YYYY-MM。 */
export interface KeikoPointBucket {
  memberId: string
  key: string
  points: number
}

export interface KeikoPoints {
  members: KeikoMember[]
  buckets: KeikoPointBucket[]
}
