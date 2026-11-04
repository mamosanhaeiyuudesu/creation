-- palette「記事 → 動画」: 動画の下書き（シーン・設定を data に JSON で）と、シーンごとの読み上げ音声（mp3 を base64 で）。
-- D1 の exec() は改行を文区切りとして扱うため、CREATE TABLE は1行で書く（複数行だと静かに失敗する）。
CREATE TABLE IF NOT EXISTS palette_videos (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_palette_videos_user ON palette_videos (user_id, updated_at);
CREATE TABLE IF NOT EXISTS palette_video_audio (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, video_id TEXT NOT NULL, data TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_palette_video_audio_video ON palette_video_audio (video_id);
