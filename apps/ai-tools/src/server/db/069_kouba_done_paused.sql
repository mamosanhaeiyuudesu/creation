-- 工数管理ツール (kouba) に「タスクの完了」と「ジョブの稼働停止中」を追加する（2026-09-20）。
-- テーブル名は2026-09-15の改名前のまま＝ kouba_subtasks が現UI「タスク」、kouba_tasks が現UI「ジョブ」。
--   kouba_subtasks.done  … タスクの完了。チェックするとジョブ詳細モーダルの「完了済み」（折りたたみ）へ移る。時間は合計に残る
--   kouba_tasks.paused   … ジョブの稼働停止中。終わったというより「いずれまたやる」ものを板から畳んでおく印。時間は合計に残る
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/069_kouba_done_paused.sql（ALTER 含むので再実行不可）

ALTER TABLE kouba_subtasks ADD COLUMN done INTEGER NOT NULL DEFAULT 0;
ALTER TABLE kouba_tasks ADD COLUMN paused INTEGER NOT NULL DEFAULT 0;
