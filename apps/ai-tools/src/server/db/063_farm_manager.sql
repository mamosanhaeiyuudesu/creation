-- farm-manager（農家向け 経費・経営管理）
-- WHISPER_DB に相乗り。既存 users/sessions 認証を使い、すべて user_id でスコープする。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/063_farm_manager.sql
--
-- 既存Excel「10カ年収支計画表」の損益構造（A売上高 / B変動費 / C粗利益 / D固定費 / E営業利益 /
-- F営業外 / G経常利益 / H現金増減 / K期末現金残高）をそのまま写し取っている（仕様§0）。
-- 集計は必ず occurred_at（発生日＝納品日）で行う＝発生主義。掛け払い（ツケ）が主流のため
-- 支払日ベースだと経営の実態とずれる。

-- 勘定科目マスタ。仕様§2の全件を初回アクセス時に seedAccounts() がユーザーごとへ投入する。
-- user_id でスコープしてあるのは、Excelの運用ポイント①「発生している項目を追加する」を
-- アプリでも許すため（ユーザーが自分で足した科目は is_custom = 1）。
CREATE TABLE IF NOT EXISTS farm_manager_accounts (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  code                  TEXT NOT NULL,                    -- VAR001 / FIX001 / NOP001 / REV001 / FIN001
  name                  TEXT NOT NULL DEFAULT '',
  category              TEXT NOT NULL DEFAULT 'B_VARIABLE', -- A_REVENUE | B_VARIABLE | D_FIXED | F_NON_OPERATING | H_FINANCE
  is_depreciation       INTEGER NOT NULL DEFAULT 0,       -- 減価償却費＝H.現金増減額で足し戻す対象
  is_provisional_bucket INTEGER NOT NULL DEFAULT 0,       -- 仮置き用科目（VAR999 / FIX999）
  split_risk            INTEGER NOT NULL DEFAULT 0,       -- 用途で変動費/固定費が割れる科目（仕様§3-2）
  note                  TEXT NOT NULL DEFAULT '',
  is_custom             INTEGER NOT NULL DEFAULT 0,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  active                INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_manager_accounts_code ON farm_manager_accounts(user_id, code);

-- 取引（納品書・レシート1枚＝1行）。画像は R2 を使わず base64 data URL のまま TEXT 保存（kaki / ippon 方式）。
CREATE TABLE IF NOT EXISTS farm_manager_transactions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  image_url    TEXT NOT NULL DEFAULT '',                  -- data:image/jpeg;base64,...（クライアントで縮小済み）
  vendor_name  TEXT NOT NULL DEFAULT '',
  occurred_at  TEXT NOT NULL DEFAULT '',                  -- 発生日（納品日）YYYY-MM-DD ← 集計はこちら
  paid_at      TEXT,                                      -- 支払日。掛け払いは後日確定するので NULL 可
  payment_type TEXT NOT NULL DEFAULT 'CREDIT',            -- CASH | CREDIT（掛け）
  note         TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_farm_manager_tx_user ON farm_manager_transactions(user_id, occurred_at DESC);

-- 取引明細。1品目＝1行。ここに仕訳の結果（科目・変動/固定・確信度・仮置きフラグ）が乗る。
CREATE TABLE IF NOT EXISTS farm_manager_items (
  id                TEXT PRIMARY KEY,
  transaction_id    TEXT NOT NULL,
  user_id           TEXT NOT NULL,
  item_name         TEXT NOT NULL DEFAULT '',
  quantity          REAL,
  unit_price        REAL,
  amount            REAL NOT NULL DEFAULT 0,
  account_code      TEXT NOT NULL DEFAULT 'VAR999',
  cost_type         TEXT NOT NULL DEFAULT 'VARIABLE',     -- VARIABLE | FIXED | NON_OPERATING | FINANCE | REVENUE
  confidence_score  REAL NOT NULL DEFAULT 0,
  needs_confirmation INTEGER NOT NULL DEFAULT 0,          -- 確信度が閾値(0.7)未満 or 判定が割れる科目
  is_provisional    INTEGER NOT NULL DEFAULT 0,           -- 仮置き（その他経費に置いたまま）
  confirmed_by_user INTEGER NOT NULL DEFAULT 0,
  worker_id         TEXT,                                 -- 人件費(VAR001)のときの従事者
  reason            TEXT NOT NULL DEFAULT '',             -- AI or 学習ルールが書いた分類理由
  sort_order        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_farm_manager_items_tx ON farm_manager_items(transaction_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_farm_manager_items_user ON farm_manager_items(user_id, account_code);

-- 従事者（人件費の内訳管理用）。Excelでは家族従事者を個人名で管理している。
CREATE TABLE IF NOT EXISTS farm_manager_workers (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  name            TEXT NOT NULL DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT 'FAMILY',         -- FAMILY | EMPLOYEE | PART_TIME
  monthly_cost    REAL NOT NULL DEFAULT 0,                -- 月額。まとめ計上のボタンで使う
  active          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_farm_manager_workers_user ON farm_manager_workers(user_id);

-- 学習ルール（仕様§3-4）。ユーザーが一度確定した「取引先 × 品目」を次回から自動適用する。
CREATE TABLE IF NOT EXISTS farm_manager_rules (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  vendor_name_pattern TEXT NOT NULL DEFAULT '',
  item_name_pattern   TEXT NOT NULL DEFAULT '',
  account_code        TEXT NOT NULL DEFAULT '',
  cost_type           TEXT NOT NULL DEFAULT 'VARIABLE',
  hit_count           INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_manager_rules_key
  ON farm_manager_rules(user_id, vendor_name_pattern, item_name_pattern);

-- 農場の設定。面積は経費の「10aあたり」按分表示（仕様§7-1）、期首現金は J. 期首現金残高に使う。
CREATE TABLE IF NOT EXISTS farm_manager_settings (
  user_id          TEXT PRIMARY KEY,
  farm_name        TEXT NOT NULL DEFAULT '',
  cultivated_area_a REAL NOT NULL DEFAULT 0,              -- 栽培面積(a)
  opening_cash     REAL NOT NULL DEFAULT 0,               -- 年度はじめの現金
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
