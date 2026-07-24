-- 桃農家向け 注文管理アプリ (momo)
-- WHISPER_DB に相乗り（既存の users/sessions で認証する）。注文は user_id でスコープ。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/032_momo.sql

-- 注文（伝票の親）
CREATE TABLE IF NOT EXISTS momo_orders (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,                     -- 所有ユーザー（農家）
  customer_name TEXT NOT NULL DEFAULT '',          -- 顧客名（顧客マスタは持たず文字列で直接保持）
  delivery_date TEXT,                              -- 納品日 (YYYY-MM-DD)。未確定なら NULL
  time_slot     TEXT,                              -- 午前 / 午後 / 夕方 / 夜 など。未指定なら NULL
  status        TEXT NOT NULL DEFAULT 'draft',     -- draft(下書き) / confirmed(確定) / shipped(出荷済)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_momo_orders_user ON momo_orders(user_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_momo_orders_status ON momo_orders(user_id, status);

-- 注文明細（サイズ混載は行を分ける）
CREATE TABLE IF NOT EXISTS momo_order_items (
  id       TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  variety  TEXT NOT NULL DEFAULT '',               -- 品種（白鳳・あかつき等）
  size     TEXT,                                   -- 2L / 3L / 4L / 5L。未指定なら NULL
  quantity INTEGER NOT NULL DEFAULT 1,
  unit     TEXT NOT NULL DEFAULT '箱',
  ripeness TEXT,                                   -- 硬さ（固め / 柔らかめ 等）
  notes    TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_momo_items_order ON momo_order_items(order_id);

-- 会話ログ原文（後から「なぜこの内容になったか」を追える）
CREATE TABLE IF NOT EXISTS momo_messages (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL,
  raw_text     TEXT NOT NULL DEFAULT '',           -- 貼り付けた会話ログ原文
  source       TEXT NOT NULL DEFAULT 'other',      -- LINE / Facebook / Instagram / other
  extracted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_momo_messages_order ON momo_messages(order_id);

-- ご依頼主（自分）情報。佐川CSVの依頼主欄に固定出力する。ユーザーごとに1行。
CREATE TABLE IF NOT EXISTS momo_settings (
  user_id        TEXT PRIMARY KEY,
  sender_name    TEXT NOT NULL DEFAULT '',
  sender_tel     TEXT NOT NULL DEFAULT '',
  sender_postal  TEXT NOT NULL DEFAULT '',
  sender_address TEXT NOT NULL DEFAULT '',
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
