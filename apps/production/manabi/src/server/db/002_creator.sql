-- 作成者の名前（表示用の文字だけ。本人確認はしない）。ensureManabiTables() も足りなければ自動で足すので、手で流さなくてもよい。
ALTER TABLE manabi_sets ADD COLUMN creator_name TEXT NOT NULL DEFAULT '';
