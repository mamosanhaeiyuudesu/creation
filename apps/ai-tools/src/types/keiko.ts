// 剣道 けいこ記録アプリ (keiko) の型定義。

export interface KeikoMember {
  id: string
  name: string
  sortOrder: number
}

/**
 * 項目の種類。
 * - reps  : 本数 × 1本あたりポイントで満点が決まり、その日の達成割合（％）で按分する（素振りなど）
 * - direct: 本数もポイントも割合も持たず、達成したときにポイントを直接入力する（稽古・大会など）
 */
export type KeikoItemKind = 'reps' | 'direct'

/**
 * 練習項目。メンバーごとに持つ（護と匡で別々の内容・本数・ポイントを設定できる）。
 * kind='reps' の満点 = repCount * pointPerRep（例: はや素振り 10本 × 2pt = 20pt）。
 * kind='direct' では repCount / pointPerRep は使わない。
 */
export interface KeikoItem {
  id: string
  memberId: string
  name: string
  kind: KeikoItemKind
  repCount: number
  pointPerRep: number
  sortOrder: number
  active: boolean
}

/**
 * その日の記録1件。行が存在する＝やった。
 * - kind='reps'   : rate（10〜100の10刻み％）を使う。獲得ポイントは round(満点 * rate / 100)
 * - kind='direct' : points に入力されたポイントをそのまま使う（rate は未使用）
 */
export interface KeikoRecord {
  memberId: string
  itemId: string
  date: string // YYYY-MM-DD
  rate: number
  points: number | null
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
