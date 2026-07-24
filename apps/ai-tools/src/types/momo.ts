// 桃農家向け 注文管理アプリ (momo) の型定義。

export type OrderStatus = 'draft' | 'confirmed' | 'shipped'
export type Source = 'LINE' | 'Facebook' | 'Instagram' | 'other'
export type Size = '2L' | '3L' | '4L' | '5L'
export type Confidence = 'high' | 'medium' | 'low'
export type TimeSlot = '午前' | '午後' | '夕方' | '夜'

/** 保存済みの注文明細。 */
export interface OrderItem {
  id: string
  variety: string
  size: Size | null
  quantity: number
  unit: string
  ripeness: string | null
  notes: string
}

/** 貼り付けた会話ログ原文。 */
export interface OrderMessage {
  rawText: string
  source: Source
  extractedAt: string
}

/** 保存済みの注文（伝票）。 */
export interface Order {
  id: string
  customerName: string
  deliveryDate: string | null
  timeSlot: string | null
  status: OrderStatus
  createdAt: string
  items: OrderItem[]
  message: OrderMessage | null
}

// ── AI抽出の契約（仕様§4.2のスキーマ。Claudeが返すのでスネークケースのまま扱う）──

export interface ExtractedItem {
  variety: string | null
  size: string | null
  quantity: number | null
  unit: string | null
  ripeness: string | null
  notes: string | null
}

export interface Extraction {
  customer_name: string | null
  items: ExtractedItem[]
  delivery_date: string | null
  delivery_time_slot: string | null
  confidence: Record<string, Confidence>
  ambiguities: string[]
  raw_excerpt: string
}

/** ご依頼主（自分）情報。佐川CSVの依頼主欄に固定出力する。 */
export interface MomoSettings {
  senderName: string
  senderTel: string
  senderPostal: string
  senderAddress: string
}

// ── 確認・編集フォームの内部表現（空文字で「未指定」を表す。保存時に null へ寄せる）──

export interface EditorItem {
  variety: string
  size: string // '' | 2L | 3L | 4L | 5L
  quantity: number
  unit: string
  ripeness: string
  notes: string
}

export interface EditorForm {
  customerName: string
  deliveryDate: string // '' | YYYY-MM-DD
  timeSlot: string // '' | 午前 | 午後 | 夕方 | 夜
  status: OrderStatus
  source: Source
  items: EditorItem[]
}

/** 注文保存/更新リクエストのボディ。 */
export interface OrderInput {
  customerName: string
  deliveryDate: string | null
  timeSlot: string | null
  status: OrderStatus
  items: {
    variety: string
    size: Size | null
    quantity: number
    unit: string
    ripeness: string | null
    notes: string
  }[]
  message?: { rawText: string; source: Source } | null
}
