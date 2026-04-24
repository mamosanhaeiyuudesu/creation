-- MLB日本人選手 D1テーブル定義（v2: MLB Stats API対応、FanGraphs固有指標削除）
-- date カラムは TEXT NOT NULL。年度集計レコードは '' (空文字)、日次レコードは 'YYYY-MM-DD'。
--
-- セットアップ（初回 or 再作成）:
--   wrangler d1 execute mlb-db --remote --file src/server/db/mlb-schema.sql

DROP TABLE IF EXISTS mlb_batter_stats;
DROP TABLE IF EXISTS mlb_pitcher_stats;
DROP TABLE IF EXISTS mlb_players;

CREATE TABLE mlb_players (
  id TEXT PRIMARY KEY,
  name_ja TEXT NOT NULL,
  name_en TEXT NOT NULL,
  position TEXT NOT NULL CHECK(position IN ('pitcher', 'batter', 'both')),
  team TEXT NOT NULL,
  team_full TEXT NOT NULL,
  league TEXT NOT NULL CHECK(league IN ('AL', 'NL'))
);

CREATE TABLE mlb_batter_stats (
  player_id TEXT NOT NULL REFERENCES mlb_players(id),
  season INTEGER NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  avg REAL,
  obp REAL,
  ops REAL,
  bb_pct REAL,
  k_pct REAL,
  PRIMARY KEY (player_id, season, date)
);

CREATE TABLE mlb_pitcher_stats (
  player_id TEXT NOT NULL REFERENCES mlb_players(id),
  season INTEGER NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  era REAL,
  whip REAL,
  k_pct REAL,
  bb_pct REAL,
  PRIMARY KEY (player_id, season, date)
);

CREATE INDEX IF NOT EXISTS idx_batter_player_season ON mlb_batter_stats(player_id, season);
CREATE INDEX IF NOT EXISTS idx_pitcher_player_season ON mlb_pitcher_stats(player_id, season);
CREATE INDEX IF NOT EXISTS idx_batter_date ON mlb_batter_stats(player_id, season, date);
CREATE INDEX IF NOT EXISTS idx_pitcher_date ON mlb_pitcher_stats(player_id, season, date);
