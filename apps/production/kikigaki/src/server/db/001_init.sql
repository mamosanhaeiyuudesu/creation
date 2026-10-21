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
  last_login_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- 退会中の印。withdrawn_at が空でなければ退会中で、議事録などは残したまま使えない。
  -- delete_after が空＝お休み（期限なし。本人が戻る／消すまで預かる）。
  -- 入っている＝削除予約中で、その日を過ぎたら管理画面から消す（それまでは取り消せる）。
  -- 2026-10-21 に追加（既存のDBには ensureTables が列を足す）
  withdrawn_at TEXT NOT NULL DEFAULT '',
  delete_after TEXT NOT NULL DEFAULT ''
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
  -- まとめ方（meeting＝話し合い／talk＝聞き取り）。一覧で種類を出すため、minutes とは別に平文で持つ。
  -- 2026-10-18 に追加。既存のDBには ensureTables（server/utils/db.ts）が自動で列を足す
  mode TEXT NOT NULL DEFAULT 'meeting',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_records_user ON records (user_id, created_at DESC);

-- 議事録のタグ（一覧の表示と絞り込み用）。議事録本体の minutes にも同じものが入っているが、
-- 一覧のたびに minutes 全体を復号しなくて済むよう、ここに短く持つ。tags は暗号化した JSON 配列。
-- records に列を足す（ALTER）と本番で一度しか流せず扱いにくいので、表を分けた（2026-10-17）。
CREATE TABLE IF NOT EXISTS record_tags (
  record_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_record_tags_user ON record_tags (user_id);

-- 「AIで直す」を使った回数（議事録1件ごと）。直すたびに会議の全文をAIへ送るので上限を設けている。
CREATE TABLE IF NOT EXISTS record_revisions (
  record_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
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

-- 利用者ごとの設定（左メニューの設定欄で変える）。行が無い人は既定値（utils/userSettings.ts）を使う。
-- 2026-10-16 に追加。CREATE TABLE IF NOT EXISTS なので、このファイルを流し直しても既存の表は壊れない
-- （本番の D1 には、ログイン時の ensureTables() でも作られる）。
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  pdf_left_max_chars INTEGER NOT NULL DEFAULT 1000,
  pdf_right_max_chars INTEGER NOT NULL DEFAULT 1000,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 運営者が個別に付ける扱い（管理画面から変える）。いまは「支払い不要」だけ。
-- 管理者（環境変数 NUXT_ADMIN_UIDS）はここに行が無くても支払い不要として扱う。
CREATE TABLE IF NOT EXISTS user_grants (
  user_id TEXT PRIMARY KEY,
  free_access INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 承認制（SERVICE.approvalRequired）での承認済みの利用者。行があれば承認済み。管理画面から付け外しする。
-- 管理者は行が無くても承認済みとして扱う。
CREATE TABLE IF NOT EXISTS user_approvals (
  user_id TEXT PRIMARY KEY,
  approved_by TEXT NOT NULL DEFAULT '',
  approved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 管理画面での操作の記録（いつ・誰が・誰に・何をしたか）。消さずに溜める。
CREATE TABLE IF NOT EXISTS admin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit (created_at DESC);

-- 月間のAI利用量。ym は JST の YYYY-MM（月の区切りを日本時間に合わせるため）。
-- cost_units はAI代（1単位 = 10^-7 USD。単価は utils/usage.ts）。
CREATE TABLE IF NOT EXISTS ai_usage_monthly (
  user_id TEXT NOT NULL,
  ym TEXT NOT NULL,
  cost_units INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, ym)
);
