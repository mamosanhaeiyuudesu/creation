-- nikki: 日ごとの添付写真（1日 NIKKI_PHOTO_MAX 枚まで）。
-- data は縮小済み画像の data URL を encrypt.ts で暗号化したもの。
CREATE TABLE IF NOT EXISTS nikki_photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  data TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nikki_photos_user_date ON nikki_photos (user_id, date, sort_order);
