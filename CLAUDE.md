# CLAUDE.md

このファイルは Claude Code がこのモノレポで作業する際のガイダンスを提供します。

**会話は日本語で行う。**

## リポジトリ構成

```
apps/
├── ai-tools/       # AI ツール群（Nuxt 3 + Nitro + Cloudflare Workers）
├── homepages/      # ホームページ一覧のポータル（開発用インデックス）
├── prototyper/     # 以下、1サイト = 1 Nuxt ワークスペース（静的生成）
├── mamorin/
├── kaito/
├── ai-consultant/
├── sakubun/
└── hareruya/
```

各ホームページは独立した Nuxt ワークスペースで、Tailwind は使わず
`src/assets/css/<name>.css` にページ固有のクラス接頭辞でスコープした素の CSS を書く方式。

## どのディレクトリで作業するか

`apps/ai-tools/` → キーワード: **miyako・whisper・hagemashi・task・deepheart・mlb・office・kaki・momo・ippon・guesthouse・life-analyzer・ai-tools 全般**

各ホームページ → 下表のキーワードのディレクトリ

### ホームページ一覧

| キーワード | ポート | 概要 |
|---|---|---|
| homepages | 3001 | 各ホームページへのリンク一覧（ローカル開発用ポータル） |
| prototyper | 3002 | ヒアリング × 高速プロトタイピングの相談窓口（可視化はその一部） |
| mamorin | 3003 | カウンセリング & 感情フォーカス・セラピー（個人ページ） |
| kaito | 3004 | セラピスト「月ノ瀬 直」のランディングページ |
| ai-consultant | 3005 | AIと人間の協調をテーマにしたコンサルタントページ |
| sakubun | 3006 | 「心の作文」 |
| hareruya | 3007 | 晴レルヤ鍼灸院（内臓鍼灸・ソフトカイロ矯正／横浜市旭区若葉台） |

**hareruya の注意点**: 未確定の掲載情報（料金・LINE URL・詳細住所・地図）は
`src/config/site.ts` に集約している。値が空/仮のときはページ側が自動で「準備中」表示に切り替わるため、
文言を直接書き換えるのではなくこのファイルを更新すること。
また、あはき法（広告規制）上、効果・効能を断定する表現は書かない。

## コマンド

```bash
yarn dev              # ai-tools（:3000）のみ起動
yarn dev:all          # 全アプリを同時起動
yarn dev:tools        # ai-tools のみ起動
yarn dev:<name>       # 個別のホームページを起動（例: yarn dev:hareruya → :3007）
yarn build:tools      # ai-tools をビルド（Cloudflare Workers向け）
yarn build:<name>     # 個別のホームページをビルド（静的生成）
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
