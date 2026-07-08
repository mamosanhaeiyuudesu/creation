-- Fitbit(Google Health) OAuth の一時state保管。
-- コールバックはGoogleからの別サイト遷移でセッションCookieが届かないため、
-- connect時にstate→(user_id, PKCE verifier)をここに保存し、callbackでstateから復元する。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/025_fitbit_oauth.sql

CREATE TABLE IF NOT EXISTS fitbit_oauth_states (
  state      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  verifier   TEXT NOT NULL,
  created_at INTEGER
);
