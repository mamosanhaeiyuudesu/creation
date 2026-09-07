-- キキガキ: Googleドライブ連携の権限不足を自動検知できるようにする列を追加。
--
-- 2026-09-04以前にDocs/Sheets/Tasks/Calendarスコープで連携した行が
-- kikigaki_google_connections に残ったまま、2026-09-07のスコープ変更（drive.fileのみ）後に
-- フォルダだけ設定できてしまい、実際のアップロードは「Request had insufficient authentication
-- scopes.」で失敗し続ける、という事故が実際に起きた。
-- granted_scope にトークン取得時の実際のスコープ文字列を保存し、drive.fileが含まれているかを
-- getKikigakiGoogleStatus で判定して「再連携が必要」と案内できるようにする。
--
-- ALTER を含むので再実行不可。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/054_kikigaki_granted_scope.sql

ALTER TABLE kikigaki_google_connections ADD COLUMN granted_scope TEXT NOT NULL DEFAULT '';
