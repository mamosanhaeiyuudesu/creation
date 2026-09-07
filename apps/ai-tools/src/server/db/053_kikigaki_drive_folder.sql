-- キキガキ: GoogleドライブへPDFを保存する機能のための列を追加。
-- kikigaki_google_connections はもともと user_id 単位で1行なので、保存先フォルダもユーザーごとに1つ持つ。
--   drive_folder_id:    Drive APIへ渡すフォルダID（設定時にリンク/IDから抽出して保存）
--   drive_folder_input: ユーザーが実際に貼り付けた文字列（設定画面での表示用にそのまま保持）
--
-- ALTER を含むので再実行不可。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/053_kikigaki_drive_folder.sql

ALTER TABLE kikigaki_google_connections ADD COLUMN drive_folder_id TEXT NOT NULL DEFAULT '';
ALTER TABLE kikigaki_google_connections ADD COLUMN drive_folder_input TEXT NOT NULL DEFAULT '';
