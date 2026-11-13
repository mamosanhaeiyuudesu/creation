-- farm-simulator（収穫・出荷の見通し）の天気のキャッシュ。気象庁の公開データなので user_id では分けない。
-- 過去の観測は1か月＝1行（complete=1 になった月は取り直さない）。予報は1行を上書きする。
CREATE TABLE IF NOT EXISTS farm_simulator_weather_months (station TEXT NOT NULL, ym TEXT NOT NULL, data TEXT NOT NULL, complete INTEGER NOT NULL DEFAULT 0, fetched_at TEXT NOT NULL, PRIMARY KEY (station, ym));
CREATE TABLE IF NOT EXISTS farm_simulator_forecast (id TEXT PRIMARY KEY, data TEXT NOT NULL, fetched_at TEXT NOT NULL);
