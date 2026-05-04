-- Migration: FIP（守備独立防御率）と BB/K を追加
-- wrangler d1 execute mlb-db --remote --file src/server/db/006_mlb_fip_bbk.sql

ALTER TABLE mlb_batter_stats ADD COLUMN bbk REAL;
ALTER TABLE mlb_pitcher_stats ADD COLUMN fip REAL;
ALTER TABLE mlb_pitcher_stats ADD COLUMN bbk REAL;
