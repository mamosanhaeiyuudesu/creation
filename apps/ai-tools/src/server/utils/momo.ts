// 桃農家向け 注文管理アプリ (momo) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、注文は user_id でスコープする。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import type { MomoSettings, Order, OrderItem, OrderMessage, Size } from '~/types/momo'

export interface MomoUser {
  id: string
  username: string
}

/** momo 用テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。 */
export async function ensureMomoTables(db: any): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS momo_orders (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, customer_name TEXT NOT NULL DEFAULT '',
      delivery_date TEXT, time_slot TEXT, status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS momo_order_items (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL, variety TEXT NOT NULL DEFAULT '',
      size TEXT, quantity INTEGER NOT NULL DEFAULT 1, unit TEXT NOT NULL DEFAULT '箱',
      ripeness TEXT, notes TEXT NOT NULL DEFAULT ''
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS momo_messages (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL, raw_text TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'other', extracted_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS momo_settings (
      user_id TEXT PRIMARY KEY, sender_name TEXT NOT NULL DEFAULT '',
      sender_tel TEXT NOT NULL DEFAULT '', sender_postal TEXT NOT NULL DEFAULT '',
      sender_address TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
}

/** ログイン必須。未ログインなら 401 を throw。 */
export async function requireMomoUser(event: any): Promise<MomoUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** DB が無い場合に 503 を throw して返す。 */
export function requireMomoDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  return db
}

// ── 正規化・整形 ──────────────────────────────

const VALID_SIZES: Size[] = ['2L', '3L', '4L', '5L']

/** サイズ文字列を 2L/3L/4L/5L に正規化。合致しなければ null。 */
export function normalizeSize(raw: unknown): Size | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim().toUpperCase().replace('Ｌ', 'L')
  return (VALID_SIZES as string[]).includes(v) ? (v as Size) : null
}

interface OrderRow {
  id: string
  customer_name: string
  delivery_date: string | null
  time_slot: string | null
  status: string
  created_at: string
}
interface ItemRow {
  id: string
  order_id: string
  variety: string
  size: string | null
  quantity: number
  unit: string
  ripeness: string | null
  notes: string
}
interface MessageRow {
  raw_text: string
  source: string
  extracted_at: string
}

export function shapeItem(row: ItemRow): OrderItem {
  return {
    id: row.id,
    variety: row.variety,
    size: normalizeSize(row.size),
    quantity: row.quantity,
    unit: row.unit,
    ripeness: row.ripeness,
    notes: row.notes,
  }
}

export function shapeOrder(row: OrderRow, items: ItemRow[], message: MessageRow | null): Order {
  const status = (['draft', 'confirmed', 'shipped'].includes(row.status) ? row.status : 'draft') as Order['status']
  return {
    id: row.id,
    customerName: row.customer_name,
    deliveryDate: row.delivery_date,
    timeSlot: row.time_slot,
    status,
    createdAt: row.created_at,
    items: items.map(shapeItem),
    message: message
      ? { rawText: message.raw_text, source: (message.source as OrderMessage['source']) ?? 'other', extractedAt: message.extracted_at }
      : null,
  }
}

/** 指定ユーザーの注文を明細・原文込みで取得。delivery_date 昇順（NULLは末尾）。 */
export async function loadOrders(db: any, userId: string): Promise<Order[]> {
  const orderRows = await db
    .prepare(
      `SELECT * FROM momo_orders WHERE user_id = ?
       ORDER BY (delivery_date IS NULL), delivery_date ASC, created_at ASC`
    )
    .bind(userId)
    .all<OrderRow>()
  const orders: OrderRow[] = orderRows?.results ?? []
  if (!orders.length) return []

  const ids = orders.map((o) => o.id)
  const placeholders = ids.map(() => '?').join(',')
  const itemRows = await db
    .prepare(`SELECT * FROM momo_order_items WHERE order_id IN (${placeholders})`)
    .bind(...ids)
    .all<ItemRow>()
  const msgRows = await db
    .prepare(`SELECT order_id, raw_text, source, extracted_at FROM momo_messages WHERE order_id IN (${placeholders})`)
    .bind(...ids)
    .all<MessageRow & { order_id: string }>()

  const itemsByOrder = new Map<string, ItemRow[]>()
  for (const it of itemRows?.results ?? []) {
    if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, [])
    itemsByOrder.get(it.order_id)!.push(it)
  }
  const msgByOrder = new Map<string, MessageRow>()
  for (const m of msgRows?.results ?? []) {
    if (!msgByOrder.has(m.order_id)) msgByOrder.set(m.order_id, m)
  }

  return orders.map((o) => shapeOrder(o, itemsByOrder.get(o.id) ?? [], msgByOrder.get(o.id) ?? null))
}

/** 単一注文を取得（所有者チェック込み）。無ければ null。 */
export async function loadOrder(db: any, userId: string, orderId: string): Promise<Order | null> {
  const row = await db
    .prepare('SELECT * FROM momo_orders WHERE id = ? AND user_id = ?')
    .bind(orderId, userId)
    .first<OrderRow>()
  if (!row) return null
  const itemRows = await db.prepare('SELECT * FROM momo_order_items WHERE order_id = ?').bind(orderId).all<ItemRow>()
  const msgRow = await db
    .prepare('SELECT raw_text, source, extracted_at FROM momo_messages WHERE order_id = ? ORDER BY extracted_at ASC LIMIT 1')
    .bind(orderId)
    .first<MessageRow>()
  return shapeOrder(row, itemRows?.results ?? [], msgRow ?? null)
}

// ── 設定（ご依頼主）──────────────────────────────

export async function loadSettings(db: any, userId: string): Promise<MomoSettings> {
  const row = await db
    .prepare('SELECT sender_name, sender_tel, sender_postal, sender_address FROM momo_settings WHERE user_id = ?')
    .bind(userId)
    .first<{ sender_name: string; sender_tel: string; sender_postal: string; sender_address: string }>()
  return {
    senderName: row?.sender_name ?? '',
    senderTel: row?.sender_tel ?? '',
    senderPostal: row?.sender_postal ?? '',
    senderAddress: row?.sender_address ?? '',
  }
}

// ── 佐川急便 e飛伝III CSV ──────────────────────────────

// アプリ内の時間帯 → 佐川のコード値。
// ⚠ e飛伝IIIの実際の取込テンプレートで正しいコード値を確認して調整すること（仕様§6）。
// 下記は一般的な e飛伝 の配達時間帯コードを想定した暫定値。
export const SAGAWA_TIME_CODE: Record<string, string> = {
  午前: '01', // 午前中
  午後: '14', // 14〜16時
  夕方: '16', // 16〜18時
  夜: '18', // 18〜20時
}

// CSVの列順（ヘッダなしが原則）。⚠ 実テンプレートの列位置に合わせて要確定（仕様§6）。
// 0:お届け先電話 1:お届け先郵便 2:お届け先住所 3:お届け先名称
// 4:ご依頼主電話 5:ご依頼主郵便 6:ご依頼主住所 7:ご依頼主名称
// 8:品名 9:個数 10:配達日(YYYYMMDD) 11:配達時間帯コード 12:備考
export const SAGAWA_HEADER = [
  'お届け先電話番号',
  'お届け先郵便番号',
  'お届け先住所',
  'お届け先名称',
  'ご依頼主電話番号',
  'ご依頼主郵便番号',
  'ご依頼主住所',
  'ご依頼主名称',
  '品名',
  '個数',
  '配達日',
  '配達時間帯',
  '備考',
]

function csvField(v: string): string {
  const s = String(v ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toYmd(date: string | null): string {
  return date ? date.replace(/-/g, '') : ''
}

function productName(item: OrderItem): string {
  return ['桃', item.variety, item.size].filter((x) => x && String(x).trim()).join(' ')
}

function itemRemark(item: OrderItem): string {
  return [item.ripeness, item.notes].filter((x) => x && String(x).trim()).join(' ')
}

/**
 * 確定/出荷済の注文を佐川取込CSVへ。宛先（電話・郵便・住所）は空欄でExcel補完前提。
 * 1明細=1行。UTF-8 BOM付きで返す（Excelで文字化けしない）。
 * withHeader=true のときだけ確認用にヘッダ行を付ける（取込時は原則ヘッダなし）。
 */
export function buildSagawaCsv(orders: Order[], settings: MomoSettings, withHeader = false): string {
  const rows: string[] = []
  if (withHeader) rows.push(SAGAWA_HEADER.map(csvField).join(','))

  for (const order of orders) {
    for (const item of order.items) {
      const cols = [
        '', // お届け先電話（Excelで補完）
        '', // お届け先郵便（Excelで補完）
        '', // お届け先住所（Excelで補完）
        order.customerName,
        settings.senderTel,
        settings.senderPostal,
        settings.senderAddress,
        settings.senderName,
        productName(item),
        String(item.quantity),
        toYmd(order.deliveryDate),
        order.timeSlot ? SAGAWA_TIME_CODE[order.timeSlot] ?? '' : '',
        itemRemark(item),
      ]
      rows.push(cols.map(csvField).join(','))
    }
  }
  return '﻿' + rows.join('\r\n') + '\r\n'
}

/** 今季の顧客名をユニークで（お届け先名称キーの台帳シート用）。UTF-8 BOM付き。 */
export function buildCustomerCsv(orders: Order[]): string {
  const seen = new Set<string>()
  const names: string[] = []
  for (const o of orders) {
    const name = o.customerName.trim()
    if (name && !seen.has(name)) {
      seen.add(name)
      names.push(name)
    }
  }
  names.sort((a, b) => a.localeCompare(b, 'ja'))
  const rows = ['お届け先名称', ...names.map(csvField)]
  return '﻿' + rows.join('\r\n') + '\r\n'
}
