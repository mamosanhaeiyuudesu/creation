# CLAUDE.md

このファイルは Claude Code がこのモノレポで作業する際のガイダンスを提供します。

**会話は日本語で行う。**

## リポジトリ構成

```
apps/
├── ai-tools/    # AI ツール群（Nuxt 3 + Nitro + Cloudflare Workers）
└── homepages/   # 静的ホームページ群（Nuxt 3 + Tailwind CSS）
```

## どのディレクトリで作業するか

`apps/ai-tools/` → キーワード: **miyako・snapreader・whisper・hagemashi・task・deepheart・mlb・ai-tools 全般**

`apps/homepages/` → キーワード: **homepages・kaito・mamorin・prototyper・ai-consultant**

### homepages の各ページ概要

| キーワード | ルート | 概要 |
|---|---|---|
| mamorin | `/mamorin` | カウンセリング & 感情フォーカス・セラピー（個人ページ） |
| kaito | `/kaito` | セラピスト「月ノ瀬 海倭」のランディングページ |
| prototyper | `/prototyper` | データ可視化・プロトタイプ開発の相談窓口 |
| ai-consultant | `/ai-consultant` | AIと人間の協調をテーマにしたコンサルタントページ |

## コマンド

```bash
yarn dev              # ai-tools（:3000）と homepages（:3001）を同時起動
yarn dev:tools        # ai-tools のみ起動
yarn dev:homepages    # homepages のみ起動
yarn build:tools      # ai-tools をビルド（Cloudflare Workers向け）
yarn build:homepages  # homepages をビルド（静的生成）
```

各アプリの詳細は `apps/ai-tools/CLAUDE.md` を参照。
