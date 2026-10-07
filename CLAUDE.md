# CLAUDE.md

このファイルは Claude Code がこのモノレポで作業する際のガイダンスを提供します。

**会話は日本語で行う。**

## リポジトリ構成

```
apps/
├── ai-tools/       # AI ツール群（Nuxt 3 + Nitro + Cloudflare Workers）
├── homepages/      # ホームページ一覧のポータル（開発用インデックス）
├── prototyper/     # 以下、1サイト = 1 Nuxt ワークスペース（静的生成）
├── shugorin/
├── kaito/
├── ai-consultant/
├── sakubun/
├── hareruya/
├── genogram/       # ジェノグラム作成ツール（Cloudflare Workers。AIテキスト解釈の1APIルートのみ持つ）
└── production/     # 一般ユーザー向けの本番サービス（認証・課金を持つ）
    └── kikigaki/   # キキガキ本番版（Firebase Auth + Stripe + D1。Cloudflare Workers）
```

`apps/production/` 配下も yarn workspaces の対象（ルート `package.json` の `workspaces` に
`apps/production/*` を足してある）。ここに置くのは**一般ユーザーが自分で登録して使うサービス**で、
個人用ツール群（ai-tools）とは D1 もデプロイ先も分ける。

各ホームページは独立した Nuxt ワークスペースで、Tailwind は使わず
`src/assets/css/<name>.css` にページ固有のクラス接頭辞でスコープした素の CSS を書く方式。

## どのディレクトリで作業するか

`apps/ai-tools/` → キーワード: **miyako・whisper・hagemashi・task・kouba・deepheart・mlb・office・kaki・momo・ippon・guesthouse・life-analyzer・kiroku・keiko・kikigaki・news・farm-manager・nikki・ai-tools 全般**

各ホームページ → 下表のキーワードのディレクトリ

`apps/production/kikigaki/` → キーワード: **キキガキ本番版・kikigaki.insightlens.jp・課金・Stripe・ログイン(Firebase)**

⚠️ **「キキガキ」には2つある**。身内向けの `apps/ai-tools`（`/kikigaki`）と、一般ユーザー向けの
`apps/production/kikigaki`（本番サービス）。**どちらの話かを必ず確かめること**。本番版の作業で
ai-tools 側を変更しないこと（コピー元として扱う）。

### ホームページ一覧

| キーワード | ポート | 概要 |
|---|---|---|
| homepages | 3001 | 各ホームページへのリンク一覧（ローカル開発用ポータル） |
| prototyper | 3002 | ヒアリング × 高速プロトタイピングの相談窓口（可視化はその一部） |
| shugorin | 3003 | カウンセリング & 感情フォーカス・セラピー（個人ページ） |
| kaito | 3004 | セラピスト「月ノ瀬 直」のランディングページ |
| ai-consultant | 3005 | AIと人間の協調をテーマにしたコンサルタントページ |
| sakubun | 3006 | 「心の作文」 |
| hareruya | 3007 | 晴レルヤ鍼灸院（内臓鍼灸・ソフトカイロ矯正／横浜市旭区若葉台） |
| genogram | 3008 | ジェノグラム作成ツール（家族構成をAIに伝えるとJSONを作成・更新しSVG描画。AI解釈のみCloudflare Workers上のAPIルートを使う） |

### 本番サービス一覧

| キーワード | ポート | 概要 |
|---|---|---|
| kikigaki（本番） | 3009 | キキガキ本番版（`apps/production/kikigaki`）。会議の録音→議事録→PDF。Firebase Auth（Google／メールのリンク）＋ Stripe の月額1プラン。**当面はモニター期間として無料で提供**（`src/config/service.ts` の `monitorMode`、環境変数 `NUXT_PUBLIC_MONITOR_MODE=false` で有料化）。詳細は `apps/production/kikigaki/README.md` |

**hareruya の注意点**: 未確定の掲載情報（料金・LINE URL・詳細住所・地図）は
`src/config/site.ts` に集約している。値が空/仮のときはページ側が自動で案内文
（「LINEにてご案内」など）に切り替わるため、文言を直接書き換えるのではなくこのファイルを更新すること。
なお「準備中」という表示はサイト全体で使わない方針。
また、あはき法（広告規制）上、効果・効能を断定する表現は書かない。

## コマンド

```bash
yarn dev              # ai-tools（:3000）のみ起動
yarn dev:all          # 全アプリを同時起動
yarn dev:tools        # ai-tools のみ起動
yarn dev:<name>       # 個別のホームページを起動（例: yarn dev:hareruya → :3007）
yarn dev:kikigaki     # キキガキ本番版を起動（:3009。apps/production/kikigaki）
yarn build:tools      # ai-tools をビルド（Cloudflare Workers向け）
yarn build:<name>     # 個別のホームページをビルド（静的生成）
yarn build:kikigaki   # キキガキ本番版をビルド（Cloudflare Workers向け）
```

### ⚠️ dev 起動中に build を実行しないこと

`yarn dev` が動いている間に `yarn build` を走らせると Nuxt が壊れ、**以降ファイルを編集するたびに**
次のエラーが出るようになる:

```
Package import specifier "#internal/nuxt/paths" is not defined in package .../package.json
imported from .../.nuxt/dist/server/server.mjs
```

dev と build は `.nuxt/` を共有している。dev 中の `.nuxt/dist/server/server.mjs` は
`vite-node.mjs` を再エクスポートするだけのスタブだが、build がこれを本番バンドルで上書きし、
その中の `#internal/nuxt/paths`（Nitro がビルド時にしか解決できないエイリアス）を
dev が読めずに落ちる。

- ビルドする前に dev を止める（`pkill -f nuxt`。他人の dev が動いていないか `pgrep -fl "nuxt dev"` で確認）
- 型チェックだけなら `npx vue-tsc --noEmit` は `.nuxt` を壊さないので dev 中でも安全
- **復旧**: dev停止 → `rm -rf .nuxt .output node_modules/.vite` → dev再起動

各アプリの詳細は `apps/ai-tools/CLAUDE.md` を参照。
