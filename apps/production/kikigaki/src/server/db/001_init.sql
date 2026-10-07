-- キキガキ本番版の初期スキーマ。
--
--   wrangler d1 create kikigaki-db
--   wrangler d1 execute kikigaki-db --remote --file src/server/db/001_init.sql
--
-- 同じ内容を src/server/utils/db.ts の ensureTables() でも作る（マイグレーション未適用の環境向けの保険）。
-- 片方だけ直すと食い違うので、列を足すときは必ず両方を直すこと。
--
-- ※ `wrangler d1 execute --file` に流す SQL では `CASE ... END,` と書かないこと。
--   wrangler の SQL 分割が CASE を複合文の始まりと見なし、後続の文が全部つながって
--   SQLITE_TOOBIG になる（ai-tools のバックフィルで実際に踏んだ）。

-- 利用者。本体は Firebase Authentication 側にあるので、ここは最小限の控えだけ持つ。
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 同じメールアドレスで2行できないようにする（Google ログインとマジックリンクの統合は
-- Firebase 側の「1つのメールアドレスにつき1つのアカウント」で担保されるが、こちらでも二重に守る）。
-- email が空の行は対象外にする（空文字どうしが衝突するのを避けるため）。
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email <> '';

-- 議事録。1件＝1行。必ず user_id で絞って読むこと（他人の会議が見えると取り返しがつかない）。
-- title / transcript / minutes は encrypt.ts で暗号化して保存する
-- （会議には個人名や未確定の話が普通に含まれるため、DBを直接覗いても読めない状態にしておく）。
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  meeting_date TEXT NOT NULL DEFAULT '',
  audio_name TEXT NOT NULL DEFAULT '',
  transcript TEXT NOT NULL DEFAULT '',
  minutes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_records_user ON records (user_id, created_at DESC);

-- よく出る名前（用語辞書）。1ユーザー1行で、本文は「1行1語」のテキストをそのまま暗号化して持つ。
CREATE TABLE IF NOT EXISTS glossary (
  user_id TEXT PRIMARY KEY,
  body TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 契約状態。Stripe の webhook が唯一の書き込み元（画面からは書かない）。
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL DEFAULT '',
  stripe_subscription_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  current_period_end TEXT NOT NULL DEFAULT '',
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- webhook は customer.id しか持たないイベントも来るので、顧客IDから引けるようにする。
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions (stripe_customer_id);

-- 処理済みの Stripe イベント。同じイベントが複数回届いても二重処理しないための記録。
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT '',
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 月間の利用量。ym は JST の YYYY-MM（月の区切りを日本時間に合わせるため）。
CREATE TABLE IF NOT EXISTS usage_monthly (
  user_id TEXT NOT NULL,
  ym TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  records INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, ym)
);
