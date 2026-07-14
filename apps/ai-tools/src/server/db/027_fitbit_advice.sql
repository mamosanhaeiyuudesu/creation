-- Fitbitダッシュボードの「今日のアドバイス」カード（AI生成）のキャッシュ。
-- 1日を6時間刻み4スロット（0-6/6-12/12-18/18-24時, JST。過去日は-1固定で1日1本）に区切り、
-- 同じ(user_id, date, slot)ならAIを呼ばず再利用する。prompt_versionはプロンプト変更時の一括無効化用。
-- 適用: wrangler d1 execute whisper-db --remote --command "$(cat src/server/db/027_fitbit_advice.sql)"
-- （--file はこのプロジェクトのAPIトークンで import 権限エラーになるため --command を使う）

CREATE TABLE IF NOT EXISTS fitbit_advice (
  user_id        TEXT NOT NULL,
  date           TEXT NOT NULL,
  slot           INTEGER NOT NULL,
  prompt_version TEXT NOT NULL,
  headline       TEXT NOT NULL,
  body           TEXT NOT NULL,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, date, slot)
);
