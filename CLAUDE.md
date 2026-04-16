# CLAUDE.md

このファイルは Claude Code がこのモノレポで作業する際のガイダンスを提供します。

**会話は日本語で行う。**

## リポジトリ構成

```
apps/
├── ai-tools/    # AI ツール群（Nuxt 3 + Nitro + Cloudflare Workers）
└── homepages/   # 静的ホームページ群（Nuxt 3 + Tailwind CSS）
```

### どのディレクトリで作業するか

ユーザーの指示に以下のキーワードが含まれる場合は `apps/ai-tools/` で作業する：

- **miyako** — 宮古島市議会議事録ツール（ヒートマップ・AI解説・議員分析）
- **snapreader** — 画像OCR・要約・AIチャット
- **whisper** — 音声文字起こし・要約・校正
- **hagemashi** — AI励ましメッセージ生成
- **task** — Trello連携タスク管理
- **ai-tools 全般**（ルーティング、共通コンポーネント、サーバーAPI など）

ユーザーの指示に以下のキーワードが含まれる場合は `apps/homepages/` で作業する：

- **homepages** / **ホームページ** — 静的ランディングページ群
- **kaito** — セラピスト向けランディングページ（`/kaito`）
- **mamorin** — mamorin 個人ページ（`/mamorin`）
- **prototyper** — プロトタイパー向けページ（`/prototyper`）
- **ai-consultant** — AI コンサルタント向けページ（`/ai-consultant`）

## コマンド

```bash
yarn dev              # ai-tools（:3000）と homepages（:3001）を同時起動
yarn dev:tools        # ai-tools のみ起動
yarn dev:homepages    # homepages のみ起動
yarn build:tools      # ai-tools をビルド（Cloudflare Workers向け）
yarn build:homepages  # homepages をビルド（静的生成）
```

各アプリの詳細は `apps/ai-tools/CLAUDE.md` を参照。
