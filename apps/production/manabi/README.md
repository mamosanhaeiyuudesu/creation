# まなび（本番版）

テーマを1行書くとAI（Claude）が4択の問題セット（10/20/30問）を作り、URL（`/<10文字ID>`）で共有すると全員が同じ問題を解ける学びのドリル。 https://manabi.insightlens.jp/

`apps/ai-tools` の `/manabi`（旧 osarai）を独立させたもの（2026-10-13）。**ログイン・課金は持たない**（共有リンクをLINEで受けた人がそのまま解けることが価値のため。kikigaki 本番版との違い）。
旧 `https://<ai-tools>/manabi/**`・`/osarai/**` は ai-tools の routeRules で新ドメインの同じパスへ301する。

## 画面

| ルート | 内容 |
|---|---|
| `/` | テーマ・問題数・「みんなの問題に載せる」を決めて作る。最近の問題（端末内） |
| `/<id>` | 問題を解く。途中再開・結果で全問見返し・深掘りテーマの提案 |
| `/explore` | みんなの問題（公開にされたセットだけ。問題の中身は返さない） |
| `/print/<id>` | A4問題集（`window.print()` →「PDFに保存」） |

`/explore` と `/print` は静的ルートなので動的ルート `/[id]` より先に解決される（IDは英数10文字なので衝突しない）。

## 作りの前提

- 解答・点数はサーバーに送らない。端末の localStorage に途中経過・直近結果だけ（ドメインが変わったので旧ドメインの履歴は引き継がれない）。
- **AI代の歯止めは IP（ハッシュ）ごとに1日30セット**（`MANABI_DAILY_LIMIT`）とテーマ200字上限だけ。ログインが無いので他に歯止めは無い。公開サービスとして使われ方が変わったらここを見直す。
- 生成は2段（論点を決める→5問ずつ並列で作問）。選択肢の長さで正解が当たらないよう `correct_len` とサーバーの `pickDistractors()` で緩和している（`server/utils/manabi-ai.ts`）。作問プロンプトを触ったら正解が最長の問題の割合を測り直すこと。
- テーブルは `manabi_sets`（ai-tools 時代の `osarai_sets` から名前だけ変えた）。`ensureManabiTables()` が最初のアクセスで作る保険を持つ。D1 が無い環境（素の dev）ではプロセス内 Map に置く。

## ローカルで動かす

```bash
cp .env.example .env          # NUXT_ANTHROPIC_API_KEY を入れる
yarn dev:manabi               # :3010
yarn workspace manabi typecheck
```

**`yarn dev` 中に `yarn build` を実行しないこと**（`.nuxt` を共有しているため壊れる）。

## セットアップ（本番）

```bash
wrangler d1 create manabi-db           # 済み。database_id は wrangler.toml に書いてある
wrangler d1 execute manabi-db --remote --file src/server/db/001_init.sql
wrangler secret put NUXT_ANTHROPIC_API_KEY
```

デプロイは `.github/workflows/deploy-manabi.yml`（`apps/production/manabi/**` への push で Workers へ）。

### データ移行（2026-10-13 実施済み）

`whisper-db.osarai_sets` の11件（全件公開）を `manabi_sets` へコピーした。IDは同じなので共有済みリンクはそのまま開ける。
`ip_hash` は持ち越していない（空）。移行元の `osarai_sets` は残してある。
