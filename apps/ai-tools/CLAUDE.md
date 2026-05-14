# CLAUDE.md

このファイルは、Claude Code が `apps/ai-tools/` で作業する際のガイダンスを提供します。

**会話は日本語で行う。**

## コマンド

```bash
yarn dev         # ローカル開発サーバー起動（:3000）
yarn build       # 本番ビルド（Cloudflare Workers向け）
wrangler deploy  # Cloudflare Workersへデプロイ
```

ローカルの環境変数は `.env` に記載する:

```
NUXT_OPENAI_API_KEY=...
NUXT_ANTHROPIC_API_KEY=...
NUXT_MIYAKO_VECTOR_STORE_ID=...
NUXT_ENCRYPTION_KEY=...   # marriage コメント暗号化（32文字以上推奨）
```

## アーキテクチャ

**Nuxt 3（srcDir: `src/`）+ Nitro（preset: `cloudflare_module`）+ Vuetify 3 + Tailwind CSS**

- OpenAI呼び出しは `src/server/utils/openai.ts` の `callOpenAi()` に集約
- miyako・keiko ページのみ Tailwind CSS（Vuetify不使用）

## ページ一覧

| ルート | 概要 |
|--------|------|
| `/` | ツール一覧ハブ |
| `/snapreader` | 画像をアップロードしてOCR・要約・AIチャットができるツール |
| `/whisper` | マイク録音または音声ファイルで文字起こし・要約・校正 |
| `/hagemashi` | 状況を入力するとAIが励ましメッセージとテーマを生成 |
| `/task` | Trello連携のタスク管理ビュー（DOING/TODO/DONE） |
| `/deepheart` | カウンセリングチャット（ユーザー認証・会話履歴あり） |
| `/miyako` | 宮古島市議会議事録 — キーワード×会期ヒートマップ＋AI解説パネル |
| `/miyako/keyword` | キーワード検索・議事録テキスト閲覧 |
| `/miyako/member` | 議員ごとのTF-IDFランキング（単語・カテゴリ別） |
| `/miyako/yearly` | 年別発言推移グラフ |
| `/japanese-mlb-player` | 日本人MLB選手スタッツ（打者・投手、FanGraphs/MLB Stats連携） |
| `/keiko` | 剣道の足さばきトレーナー（Canvas描画） |
| `/marriage` | ふたりの日々を記録するカレンダー（ムード記録・コメント付き） |

## Cloudflare D1

- `WHISPER_DB`（`whisper-db`）: users / sessions / app-history / marriage records  
  `src/server/utils/auth.ts` の `getDb()` 経由。Cookie名: `app-session`
- `MLB_DB`（`mlb-db`）: MLB選手・試合データ  
  `src/server/tasks/mlb-sync.ts` の Cron（1時間ごと）で同期
- `DEEPHEART_DB`（`deepheart-db`）: users / sessions / messages / personalities  
  `src/server/utils/deepheart.ts` の `getDeepheartDb()` 経由。Cookie名: `deepheart-session`
- **ローカルdev**: macOSの制約でD1が使えないため `mlb-dev.ts` が静的JSONにフォールバック

## サーバーユーティリティ

| ファイル | 役割 |
|----------|------|
| `openai.ts` | `callOpenAi()` / `fetchOpenAi()` / `extractText()` 等、OpenAI API呼び出し共通処理 |
| `auth.ts` | WHISPER_DB経由の認証・セッション管理 |
| `deepheart.ts` | DEEPHEART_DB操作 |
| `deepheart-insights.ts` | Deepheartのインサイト生成 |
| `mlbstats.ts` | MLB Stats API呼び出し |
| `fangraphs.ts` | FanGraphs API呼び出し |
| `mlb-dev.ts` | MLBローカル開発用スタブ |
| `encrypt.ts` | marriage コメント暗号化（AES-GCM） |
| `questions.ts` | AI質問生成ユーティリティ |

## コーディング規則

- Vue SFCは `<script setup lang="ts">`、インデント2スペース
- JS/TS: camelCase、CSS: kebab-case
- コミットメッセージは日本語1行
