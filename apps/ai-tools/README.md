# ai-tools

身内向けの AI ツール群をまとめた Nuxt 4 アプリ（Nitro `cloudflare_module` プリセットで Cloudflare Workers に載せる）。
whisper・hagemashi・kouba・nikki・kikigaki・news・farm-news・miyako・fitbit・kaki・momo・farm-manager・keiko・guesthouse・ゲームなど。

ページごとの仕様・設計判断・セットアップ手順は [CLAUDE.md](./CLAUDE.md) にまとめてある（こちらが正）。
ホーム画面のツール一覧は `src/utils/tools.ts`。

## ローカルで動かす

モノレポのルートから:

```bash
yarn install
yarn dev            # http://localhost:3000（= yarn dev:tools）
yarn build:tools    # 本番ビルド（Cloudflare Workers向け）
```

このワークスペース単体では `yarn dev` / `yarn build` / `yarn test`（`src/**/*.test.ts` の純TSロジックだけを vitest で実行）。

**`yarn dev` 中に `yarn build` を実行しないこと**（`.nuxt` を共有しているため壊れる。復旧手順はルートの `CLAUDE.md`）。

## 環境変数

`.env.example` をコピーして `.env` を作る。キーはすべて `NUXT_` 接頭辞付き（`NUXT_OPENAI_API_KEY`・`NUXT_ANTHROPIC_API_KEY` など）。
全項目の一覧と用途は [CLAUDE.md の「コマンド」節](./CLAUDE.md)。本番ではシークレットとして登録する:

```bash
wrangler secret put NUXT_ANTHROPIC_API_KEY
```

AI は OpenAI（whisper 文字起こし・miyako など、`server/utils/openai.ts`）と
Claude（`server/utils/anthropic.ts`。既定 `claude-sonnet-5-5`、news / farm-news の要約は `claude-haiku-5-5`）を使い分けている。

## デプロイ

`main` への push（`apps/ai-tools/**` の変更）で GitHub Actions（`.github/workflows/deploy-ai-tools.yml`）が
`yarn build:tools` → `wrangler deploy` する。手動なら:

```bash
yarn build:tools
cd apps/ai-tools && wrangler deploy
```

D1（`whisper-db` / `mlb-db`）や cron の設定は `wrangler.toml`。

## Claude Code リモートコントロール

スマホなど外部デバイスから Claude Code を操作したい場合、ローカル開発サーバーを外部公開できる。

1. **トンネルを張る**

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

   `https://xxxx.trycloudflare.com` のような一時 URL が発行される。

2. **Claude Code をリモートコントロールモードで起動**

   ```bash
   claude remote-control
   ```

> cloudflared 経由のホスト名を Vite に受け付けさせるには `nuxt.config.ts` の `vite.server.allowedHosts: true` が要る。
> 現在はコメントアウトしてあるので、使うときだけ戻す。
