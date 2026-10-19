# creation

AI ツール群・各種ホームページ・本番サービスをまとめた yarn workspaces のモノレポ（Nuxt 4）。
Claude Code 向けの詳細ガイダンスは [CLAUDE.md](CLAUDE.md)、ai-tools の個別ツールは [apps/ai-tools/CLAUDE.md](apps/ai-tools/CLAUDE.md) を参照。

## 構成

| ディレクトリ | 内容 | dev ポート | 出力 / デプロイ先 |
|---|---|---|---|
| `apps/ai-tools` | 身内向け AI ツール群（miyako・whisper・hagemashi・task・kaki・momo・nikki など）。Nitro サーバー＋D1 | 3000 | Cloudflare Workers |
| `apps/homepages` | 各ホームページへのリンク一覧（ローカル開発用ポータル） | 3001 | 静的生成 |
| `apps/prototyper` | ヒアリング × 高速プロトタイピングの相談窓口 | 3002 | 静的生成 → Pages |
| `apps/shugorin` | カウンセリング & 感情フォーカス・セラピー | 3003 | 静的生成 → Workers |
| `apps/kaito` | セラピスト「月ノ瀬 直」のランディングページ | 3004 | 静的生成 → Pages |
| `apps/ai-consultant` | AI と人間の協調をテーマにしたコンサルタントページ | 3005 | 静的生成 → Pages |
| `apps/sakubun` | 「心の作文」 | 3006 | Cloudflare Workers |
| `apps/hareruya` | 晴レルヤ鍼灸院 | 3007 | 静的生成 → Workers |
| `apps/genogram` | ジェノグラム作成ツール（AI 解釈の API ルートのみ Workers 上） | 3008 | Cloudflare Workers |
| `apps/data-vis` | データ可視化の受託制作LP（data-vis.insightlens.jp） | 3011 | Cloudflare Workers |
| `apps/shimano-papa` | 人生のインタビュー（自伝本づくり）のLP（shimano-papa.insightlens.jp） | 3012 | Cloudflare Workers |
| `apps/production/kikigaki` | キキガキ本番版（Firebase Auth + Stripe + D1）。詳細は [README](apps/production/kikigaki/README.md) | 3009 | Cloudflare Workers |
| `apps/production/manabi` | まなび本番版（ログイン・課金なし。専用D1）。詳細は [README](apps/production/manabi/README.md) | 3010 | Cloudflare Workers |

> 「キキガキ」は2つある。身内向けは `apps/ai-tools` の `/kikigaki`、一般ユーザー向けは `apps/production/kikigaki`。

## 前提

- Node.js 22
- Yarn 4（Corepack）

```bash
corepack enable
yarn install
```

## 起動（開発）

```bash
yarn dev              # ai-tools のみ（http://localhost:3000）
yarn dev:all          # ai-tools と全ホームページ（3001〜3008・3011・3012）を同時起動
yarn dev:<name>       # 個別に起動
```

`<name>` は `homepages` `prototyper` `shugorin` `kaito` `ai-consultant` `sakubun` `hareruya` `genogram` `kikigaki` `manabi` `data-vis` `shimano-papa`。

| コマンド | URL |
|---|---|
| `yarn dev` / `yarn dev:tools` | http://localhost:3000 |
| `yarn dev:homepages` | http://localhost:3001 |
| `yarn dev:prototyper` | http://localhost:3002 |
| `yarn dev:shugorin` | http://localhost:3003 |
| `yarn dev:kaito` | http://localhost:3004 |
| `yarn dev:ai-consultant` | http://localhost:3005 |
| `yarn dev:sakubun` | http://localhost:3006 |
| `yarn dev:hareruya` | http://localhost:3007 |
| `yarn dev:genogram` | http://localhost:3008 |
| `yarn dev:kikigaki` | http://localhost:3009 |
| `yarn dev:manabi` | http://localhost:3010 |
| `yarn dev:data-vis` | http://localhost:3011 |
| `yarn dev:shimano-papa` | http://localhost:3012 |

`yarn dev:all` に `kikigaki`・`manabi` は含まれない。別ターミナルで `yarn dev:kikigaki` / `yarn dev:manabi` を起動する。

### 環境変数

AI を使うアプリ（ai-tools・sakubun・genogram・kikigaki・manabi）は各ディレクトリに `.env` が必要。
キーの一覧は [apps/ai-tools/CLAUDE.md](apps/ai-tools/CLAUDE.md)（ai-tools）、
`apps/production/kikigaki/.env.example`（キキガキ）・`apps/production/manabi/.env.example`（まなび）を参照。
静的なホームページ（homepages / prototyper / shugorin / kaito / ai-consultant / hareruya）は不要。

D1 はローカルでは `nuxt dev` が miniflare のものを自動で用意する。

## ビルド

```bash
yarn build:tools      # ai-tools（Cloudflare Workers 向け）
yarn build:<name>     # 各ホームページ（静的生成は apps/<name>/.output/public に出力）
yarn build:kikigaki   # キキガキ本番版
yarn build:manabi     # まなび本番版
```

静的生成したサイトの確認: `yarn workspace <name> preview`
（Workers 系の sakubun / genogram は `wrangler dev`）。

### ⚠️ dev 起動中に build を実行しない

dev と build は `.nuxt/` を共有しており、dev 中に build すると以降の編集のたびに
`Package import specifier "#internal/nuxt/paths" is not defined` が出る。

- build の前に dev を止める（`pkill -f nuxt`）
- 型チェックだけなら `npx vue-tsc --noEmit` は dev 中でも安全
- 壊れたら: dev 停止 → `rm -rf .nuxt .output node_modules/.vite` → dev 再起動

## デプロイ

`main` への push で GitHub Actions（[.github/workflows/](.github/workflows/)）が、
変更のあったアプリだけをビルドして Cloudflare にデプロイする。手動実行（`workflow_dispatch`）も可。
ルートの `package.json`・`yarn.lock` を変えると全アプリのワークフローが走る。
data-vis・shimano-papa・genogram はワークフローが無く、手動で `wrangler deploy` する。

手動で出すとき（ai-tools の例）:

```bash
yarn build:tools
cd apps/ai-tools && wrangler deploy
```

シークレットは `wrangler secret put <NAME>` で登録する。

## テスト・型チェック

```bash
yarn workspace kikigaki test
yarn workspace kikigaki typecheck
npx vue-tsc --noEmit        # 各アプリのディレクトリで
```
