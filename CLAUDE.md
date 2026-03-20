# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

**会話は日本語で行う。**

## コマンド

```bash
npm run dev      # ローカル開発サーバー起動
npm run build    # 本番ビルド（Cloudflare Workers向け）
npm run start    # ビルド後のローカル確認
wrangler deploy  # Cloudflare Workersへデプロイ
wrangler secret put OPENAI_API_KEY  # 本番用APIキーの設定
```

ローカルの環境変数は `.env` に `OPENAI_API_KEY=...` を記載する。

## アーキテクチャ

**Nuxt 3（srcDir: `src/`）+ Nitro（preset: `cloudflare_module`）+ Vuetify 3**

### ページ一覧

| ルート | 概要 |
|--------|------|
| `/` | ツール一覧ハブ |
| `/snapreader` | 画像OCR・要約・AIチャット |
| `/whisper` | 音声文字起こし（Whisper API） |
| `/miyako` | 宮古島市議会議事録のAI要約・分析 |
| `/kaito`, `/mamorin` | セラピスト向けマーケティングページ |

`/kaito` と `/mamorin` は `src/layouts/therapist.vue` を使い、Vuetifyのスタイルをリセットした独自デザインになっている。

### サーバーAPI（`src/server/api/`）

- **OpenAI呼び出し**は `src/server/utils/openai.ts` の `callOpenAi()` に集約。
- APIルートはファイル名で動詞を表す（例: `analyze.post.ts`）。
- D1バインディングは `event.context.cloudflare.env.MIYAKO_DB`（miyako）で取得する。

### Cloudflare D1

`wrangler.toml` に1つのD1データベースが定義されている：

- `MIYAKO_DB` → `miyako-gijiroku`：宮古島市議会の sessions / bills / utterances テーブル

**ローカルdev時のフォールバック：** macOSのバージョン制約でローカルD1が使えないため、`src/server/utils/miyako-dev.ts` の `getDevDb()` が `cloudflare.env.MIYAKO_DB` の有無を確認し、なければ `miyako-sample.json`（プロジェクトルート）からデータを返す。

### 状態管理・Composables

- `useHistory(storageKey)` — localStorageに履歴を保存する汎用composable

### コーディング規則

- Vue SFCは `<script setup lang="ts">`
- インデント2スペース
- JS/TS: camelCase、CSS: kebab-case
- コミットメッセージは日本語1行
