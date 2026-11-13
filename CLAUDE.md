# CLAUDE.md

このファイルは Claude Code がこのモノレポで作業する際のガイダンスを提供します。

**会話は日本語で行う。**

## リポジトリ構成

```
apps/
├── ai-tools/       # AI ツール群（Nuxt 4 + Nitro + Cloudflare Workers）
├── homepages/      # ホームページ一覧のポータル（開発用インデックス）
├── prototyper/     # 以下、1サイト = 1 Nuxt ワークスペース（静的生成）
├── shugorin/
├── kaito/
├── kaito2/        # kaito のリニューアル版（kaito.insightlens.jp）
├── sakubun/
├── hareruya/
├── data-vis/       # データ可視化の受託制作LP（data-vis.insightlens.jp。miyako を事例に紹介）
├── shimano-papa/   # 人生のインタビュー（自伝本づくり）のLP（shimano-papa.insightlens.jp）
├── shimano-papa-self/         # shimano-papa の入口別LP①自分のための本（jibun-no-hon.insightlens.jp）
├── shimano-papa-grandparents/ # 同②祖父母へ贈る本（sofubo-no-hon.insightlens.jp）
├── shimano-papa-husband/      # 同③夫へ贈る本（otto-no-hon.insightlens.jp）
├── interview/      # ライフインタビュー（しゅごりんの自伝インタビュー）のLP（interview.insightlens.jp）
├── ai-consultant/  # AI活用相談（1on1・10回10万円）のLP（ai-consultant.insightlens.jp）
├── genogram/       # ジェノグラム作成ツール（Cloudflare Workers。AIテキスト解釈の1APIルートのみ持つ）
└── production/     # 一般ユーザー向けの本番サービス（専用D1・専用ドメイン）
    ├── kikigaki/   # キキガキ本番版（Firebase Auth + Stripe + D1。Cloudflare Workers）
    └── manabi/     # まなび本番版（ログイン・課金なし。専用D1。Cloudflare Workers）
```

`apps/production/` 配下も yarn workspaces の対象（ルート `package.json` の `workspaces` に
`apps/production/*` を足してある）。ここに置くのは**一般ユーザーが自分で登録して使うサービス**で、
個人用ツール群（ai-tools）とは D1 もデプロイ先も分ける。

各ホームページは独立した Nuxt ワークスペースで、Tailwind は使わず
`src/assets/css/<name>.css` にページ固有のクラス接頭辞でスコープした素の CSS を書く方式。

## どのディレクトリで作業するか

`apps/ai-tools/` → キーワード: **miyako・whisper・hagemashi・task・kouba・deepheart・mlb・kaki・momo・ippon・guesthouse・life-analyzer・kiroku・keiko・palette（FLUX LoRA 画像生成）・旧キキガキ（ai-tools の `/kikigaki` と明示されたときだけ）・news・farm-manager・farm-simulator（収穫・出荷の見通し）・nikki・ai-manager（AI管理）・ai-tools 全般**

各ホームページ → 下表のキーワードのディレクトリ

`apps/production/manabi/` → キーワード: **まなび・manabi・manabi.insightlens.jp・学びドリル・osarai**（ai-tools の `/manabi` は撤去済み）

`apps/production/kikigaki/` → キーワード: **キキガキ・kikigaki・キキガキ本番版・kikigaki.insightlens.jp・課金・Stripe・ログイン(Firebase)**

⚠️ **「キキガキ」「kikigaki」と言われたら、基本的に `apps/production/kikigaki`（本番版）のこと**。
身内向けの旧版 `apps/ai-tools` の `/kikigaki`（ナビ上の表記も「キキガキ（旧）」）を触るのは、「ai-tools の」「旧」「/kikigaki ページ」
などと明示されたときだけ。本番版の作業で ai-tools 側を変更しないこと（コピー元として扱う）。

### ホームページ一覧

| キーワード | ポート | 概要 |
|---|---|---|
| homepages | 3001 | 各ホームページへのリンク一覧（ローカル開発用ポータル） |
| prototyper | 3002 | ヒアリング × 高速プロトタイピングの相談窓口（可視化はその一部） |
| shugorin | 3003 | カウンセリング & 感情フォーカス・セラピー（個人ページ） |
| kaito | 3004 | セラピスト「月ノ瀬 直」のランディングページ |
| sakubun | 3006 | 「心の作文」 |
| hareruya | 3007 | 晴レルヤ鍼灸院（内臓鍼灸・ソフトカイロ矯正／横浜市旭区若葉台） |
| data-vis | 3011 | データ可視化の受託制作LP（data-vis.insightlens.jp）。参考サイトは trust-bank.net。料金・問い合わせ先は `src/config/site.ts` に集約 |
| genogram | 3008 | ジェノグラム作成ツール（家族構成をAIに伝えるとJSONを作成・更新しSVG描画。AI解釈のみCloudflare Workers上のAPIルートを使う） |
| shimano-papa | 3012 | 人生のインタビュー（聞き手「島のパパ」がインタビューして自伝本にする）のLP（shimano-papa.insightlens.jp）。参考サイトは jinsei-interview.pages.dev。料金・note のURLは `src/config/site.ts` に集約。カウンセリング的な効果はメインで訴求しない（補足の枠だけ） |
| kaito2 | 3013 | 月ノ瀬 直のページのリニューアル版（kaito.insightlens.jp）。kaito の内容を要点に絞り直したもの。宮古ブルー（#00A3AF）＋サンセット（#FF6F61）、見出し=やさしさゴシック／本文=Noto Sans JP。料金・フォームURLは `src/config/site.ts` に集約 |
| jibun-no-hon | 3014 | shimano-papa-self。「自分のための本」LP（jibun-no-hon.insightlens.jp）。shimano-papa の派生で、入口ごとの導入文・FAQ・色だけが違う。体験者の声はこのLPだけ |
| sofubo-no-hon | 3015 | shimano-papa-grandparents。「祖父母へ贈る本」LP（sofubo-no-hon.insightlens.jp）。贈る側の不安に答える構成 |
| interview | 3017 | ライフインタビュー（聞き手しゅごりん）のLP（interview.insightlens.jp）。色は manabi（紙色・紺・赤）、フォント・構成は shimano-papa 準拠。未確定の問い合わせ先・実施方法・プロフィールは `src/config/site.ts` に集約（空なら自動で案内文） |
| ai-consultant | 3018 | AI活用相談のLP（ai-consultant.insightlens.jp）。個人でAIを仕事に使いたい人向けに、要望を事前に聞いて1on1で教える10回コース（10万円・1回60分）＋単発お試し60分5,000円。担当は prototyper と同じまもりん（問い合わせフォームも同じ）。interview と同じ構成で、アクセントだけ青緑。料金・問い合わせ先・実施方法・プロフィールは `src/config/site.ts` に集約 |
| otto-no-hon | 3016 | shimano-papa-husband。「夫へ贈る本」LP（otto-no-hon.insightlens.jp）。申し込みは妻、語り手は夫 |

### 本番サービス一覧

| キーワード | ポート | 概要 |
|---|---|---|
| kikigaki（本番） | 3009 | キキガキ本番版（`apps/production/kikigaki`）。会議の文章（テキスト）→議事録→PDF（音声の文字起こしは2026-10-13にやめた）。Firebase Auth（Google／メールのリンク）＋ Stripe の月額1プラン。**当面はモニター期間として無料で提供**（`src/config/service.ts` の `monitorMode`、環境変数 `NUXT_PUBLIC_MONITOR_MODE=false` で有料化）。詳細は `apps/production/kikigaki/README.md` |
| manabi | 3010 | まなび本番版（`apps/production/manabi`）。テーマ→AIが4択問題→URL共有。ログイン・課金なし。詳細は `apps/production/manabi/README.md` |

**shimano-papa の派生3LP（jibun / sofubo / otto）の注意点**: 料金・お試し・事業者情報は `src/config/site.ts` が shimano-papa 本体と同じ値のコピー。
料金などを変えるときは**本体＋3LPの4か所**をそろえる。規約・プライバシー・特商法は本体（shimano-papa.insightlens.jp）へリンクしていて、3LPにはページを持たない。

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
yarn dev:manabi       # まなび本番版を起動（:3010）／ yarn build:manabi でビルド
```

### URLを共有したときのサムネイル（OGP画像）

ai-tools の各ツールと、genogram・kaito・sakubun・shimano-papa・shugorin のサムネイル（1200x630）は
`scripts/og/` で作っている。中身は `scripts/og/targets.json`（1件＝1枚。タイトル・説明・絵文字か写真・ブランド色・出力先）、
見た目は `scripts/og/template.html` の共通テンプレート。直したら `node scripts/og/build.mjs [idの一部]` で作り直す
（headless Chrome で撮影。フォントをネットから読むのでつながった状態で）。

- **ai-tools はページごとに useHead を書かない**。`src/utils/og-pages.ts` の対応表（パスの前方一致）を
  `src/server/plugins/og-meta.ts` が HTML の head に差し込む。新しいツールを足したら、対応表と targets.json の両方に1件足す。
  ページ側で og:image を出しているもの（miyako・japanese-mlb-player）はプラグインが二重に入れない。
- 各ホームページは `pages/index.vue` の useHead に og:image を**絶対URL**で書く（相対URLだとSNSが読めない。hareruya が以前そうなっていた）。
- prototyper・data-vis・kaito2・hareruya・キキガキ・まなびは、それぞれ自前の画像を使っている（このスクリプトの対象外）。

### AI のプロンプトを変えたら AI管理も更新する

`/ai-manager` の対象ツール（キキガキ本番版・まなび・日記・miyako・ジェノグラム・palette）で、AI を呼ぶ箇所を足したとき、
またはプロンプト・モデル・オプションを変えたときは、スキル `ai-manager-update` で AI管理のデータを更新する。
データは git の履歴から作るので、**コミットしたあとに流す**（未コミットの変更は載らない）。
まだコミットしていないときは、コミット後に更新が要ることを伝える。

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
