-- hagemashi_topic_cache テーブル（心・強み・アドバイス等の項目クリック時のAI分析結果をキャッシュ）
-- signature は入力データ（keyword+note+対象記録）のハッシュ。記録が変われば signature が変わり再生成される。
-- 実行: wrangler d1 execute whisper-db --file src/server/db/026_hagemashi_topic_cache.sql --remote

CREATE TABLE IF NOT EXISTS hagemashi_topic_cache (
  user_id    TEXT NOT NULL,
  cache_key  TEXT NOT NULL,          -- scope + ':' + keyword（例: kokoro:仕事の達成感）
  signature  TEXT NOT NULL,          -- 入力データのハッシュ（記録が変われば変わる）
  blocks     TEXT NOT NULL DEFAULT '[]',  -- 分析結果 blocks の JSON
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, cache_key)
);
