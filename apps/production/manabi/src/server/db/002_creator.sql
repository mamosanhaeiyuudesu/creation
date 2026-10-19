-- 作った人の名前と、題名を変えられる本人の印。ensureManabiTables() が足りなければ自動で足すので、手で流さなくてもよい。
ALTER TABLE manabi_sets ADD COLUMN creator_name TEXT NOT NULL DEFAULT '';
ALTER TABLE manabi_sets ADD COLUMN owner_hash TEXT NOT NULL DEFAULT '';
