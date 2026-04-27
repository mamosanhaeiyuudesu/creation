# CLAUDE.md

このファイルは、Claude Code が `apps/ai-tools/` で作業する際のガイダンスを提供します。

**会話は日本語で行う。**

## コマンド

```bash
yarn dev         # ローカル開発サーバー起動（:3000）
yarn build       # 本番ビルド（Cloudflare Workers向け）
wrangler deploy  # Cloudflare Workersへデプロイ
```

ローカルの環境変数は `.env` に `OPENAI_API_KEY=...` を記載する。

## アーキテクチャ

**Nuxt 3（srcDir: `src/`）+ Nitro（preset: `cloudflare_module`）+ Vuetify 3 + Tailwind CSS**

- OpenAI呼び出しは `src/server/utils/openai.ts` の `callOpenAi()` に集約
- miyako ページのみ Tailwind CSS（Vuetify不使用）

## ページ一覧

| ルート | 概要 |
|--------|------|
| `/` | ツール一覧ハブ |
| `/ai-tools/snapreader` | 画像をアップロードしてOCR・要約・AIチャットができるツール |
| `/ai-tools/whisper` | マイク録音または音声ファイルで文字起こし・要約・校正 |
| `/ai-tools/hagemashi` | 状況を入力するとAIが励ましメッセージとテーマを生成 |
| `/ai-tools/task` | Trello連携のタスク管理ビュー（DOING/TODO/DONE） |
| `/deepheart` | カウンセリングチャット（ユーザー認証・会話履歴あり） |
| `/ai-tools/miyako` | 宮古島市議会議事録 — キーワード×会期ヒートマップ＋AI解説パネル |
| `/ai-tools/miyako/member` | 議員ごとのTF-IDFランキング（単語・カテゴリ別） |

## Cloudflare D1

- `MIYAKO_DB`（`miyako-gijiroku`）: sessions / bills / utterances
- `DEEPHEART_DB`（`deepheart-db`）: users / sessions / messages / personalities。`src/server/utils/deepheart.ts` の `getDeepheartDb()` 経由。Cookie名: `deepheart-session`
- **ローカルdev**: macOSの制約でD1が使えないため `src/server/utils/miyako-dev.ts` の `getDevDb()` が `miyako-sample.json` にフォールバック

## コーディング規則

- Vue SFCは `<script setup lang="ts">`、インデント2スペース
- JS/TS: camelCase、CSS: kebab-case
- コミットメッセージは日本語1行
