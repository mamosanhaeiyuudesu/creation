-- farm-simulation: 確定申告ベースの経営シミュレーション。
-- 実績（確定申告の数字）・前提条件・対応策を1ユーザー1行の JSON（暗号化）でまるごと持つ。
-- 画面側で戻る／進むを持つため、細かい行に分けずに状態ごと上書き保存する。決算書の画像・PDFは保存しない。
CREATE TABLE IF NOT EXISTS farm_simulation_state (
  user_id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
