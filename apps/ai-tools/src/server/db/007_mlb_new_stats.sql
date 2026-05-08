-- 打者: 三振数・四球数・塁打数を追加
ALTER TABLE mlb_batter_stats ADD COLUMN strikeouts INTEGER;
ALTER TABLE mlb_batter_stats ADD COLUMN walks INTEGER;
ALTER TABLE mlb_batter_stats ADD COLUMN total_bases INTEGER;

-- 投手: 失点（自責点でない総失点）を追加
ALTER TABLE mlb_pitcher_stats ADD COLUMN runs_allowed INTEGER;
