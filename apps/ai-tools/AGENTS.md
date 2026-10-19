# リポジトリ運用ガイドライン
日本語で回答して

詳しい仕様・設計判断・セットアップは `CLAUDE.md`（このディレクトリ）とモノレポルートの `CLAUDE.md` が正。ここは要点だけ。

## プロジェクト構成
- Nuxt 4（`srcDir: src/`）+ Nitro（preset: `cloudflare_module`）+ Tailwind CSS。
- 画面は `src/pages/<ツール名>/`、部品は `src/components/<ツール名>/`、状態は `src/composables/`。
- サーバールートは `src/server/api/<ツール名>/`、共通処理は `src/server/utils/`（OpenAI は `openai.ts`、Claude は `anthropic.ts`）。
- ホームのツール一覧は `src/utils/tools.ts`。
- `wrangler.toml` は Cloudflare Workers のデプロイ設定（D1・cron）。ビルド出力 `.output/` は生成物なので手で編集しない。

## コマンド（yarn workspaces。ルートから実行）
- `yarn install`: 依存関係をインストール。
- `yarn dev`: ai-tools の dev サーバーを起動（:3000）。
- `yarn build:tools`: Cloudflare Workers 向けの本番ビルド。**dev 起動中に実行しない**（`.nuxt` が壊れる）。
- `yarn workspace ai-tools test`: vitest（`src/**/*.test.ts` の純TSロジックのみ）。
- 型チェックは `npx vue-tsc --noEmit`（dev 中でも安全。既存エラーが多いので、触ったファイルの分だけ見る）。
- デプロイは `main` への push で GitHub Actions（`.github/workflows/deploy-ai-tools.yml`）。手動なら `wrangler deploy`。

## コーディングスタイルと命名規則
- `.vue` と `.ts` はインデント2スペース。
- Vue SFC は `<script setup lang="ts">`。
- JS/TS の変数と関数は camelCase、CSS クラスは kebab-case。
- API ルートは HTTP 動詞で命名する（例: `server/api/news/run.post.ts`）。

## コミットとプルリク
- コミットメッセージは短く1行（`feat:` / `fix:` などの接頭辞＋日本語）。
- PR には簡潔な説明・確認手順・UI 変更のスクリーンショットを含める。

## 設定とセキュリティ
- ローカルの秘密情報は `.env`（`.env.example` を参照）。キーは `NUXT_` 接頭辞付き（例: `NUXT_OPENAI_API_KEY`、`NUXT_ANTHROPIC_API_KEY`）。
- Cloudflare では `wrangler secret put NUXT_ANTHROPIC_API_KEY` のようにシークレットとして保存する（コミットしない）。
- `.nuxt/` や `.output/` などの生成フォルダはコミットしない。
