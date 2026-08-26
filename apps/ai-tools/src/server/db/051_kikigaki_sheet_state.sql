-- キキガキ: Googleへ送信した結果の取りこぼしを追えるようにする列を追加。
--
-- Google API は混み合うと 503「The service is currently unavailable.」を返す。
-- 承認は一度きり（再送は409で弾く）ため、この一時的な失敗で
-- 「議事録一覧の1行だけ永久に欠ける」ことが実際に起きた。
--   sheet_appended: 議事録一覧へ行を足せたか（0 なら画面から追記し直せる）
--   warnings:       書き込めなかったぶんの説明（JSON配列）。開き直しても消えないよう保存する
--
-- ALTER を含むので再実行不可。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/051_kikigaki_sheet_state.sql

ALTER TABLE kikigaki_records ADD COLUMN sheet_appended INTEGER NOT NULL DEFAULT 0;
ALTER TABLE kikigaki_records ADD COLUMN warnings TEXT NOT NULL DEFAULT '';

-- 追加前に承認済みだった記録は、実際に追記できていたかを判別できない。
-- 「追記済み」として扱い、余計な再追記でシートに重複行が増えないようにする。
UPDATE kikigaki_records SET sheet_appended = 1 WHERE status = 'approved';
