-- Fitbitダッシュボードの「アドバイス＆対話」継続スレッド。
-- 1ユーザー1スレッドで、アドバイス（kind='advice'、6時間スロット単位で自動投稿・重複防止）と
-- ユーザーとの対話（kind='chat'）を時系列で1本に保存する。再訪時は続きから表示。
-- 適用: wrangler d1 execute whisper-db --remote --command "$(cat src/server/db/029_fitbit_chat.sql)"

CREATE TABLE IF NOT EXISTS fitbit_chat_messages (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  role        TEXT NOT NULL,                 -- 'user' | 'assistant'
  kind        TEXT NOT NULL DEFAULT 'chat',  -- 'chat' | 'advice'
  headline    TEXT,                          -- advice の見出し（chat は NULL）
  content     TEXT NOT NULL,                 -- 本文（advice は body）
  advice_slot TEXT,                          -- advice 重複防止キー "YYYY-MM-DD#slot"（chat は NULL）
  created_at  INTEGER NOT NULL               -- epoch 秒
);

CREATE INDEX IF NOT EXISTS idx_fitbit_chat_user ON fitbit_chat_messages(user_id, created_at);
-- advice は (user, slot) で一意（chat 行は advice_slot=NULL。SQLite は NULL 同士を別扱いにするので重複可）
CREATE UNIQUE INDEX IF NOT EXISTS idx_fitbit_chat_advice ON fitbit_chat_messages(user_id, advice_slot);
