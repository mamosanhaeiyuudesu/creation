# CLAUDE.md

このファイルは、Claude Code が `apps/ai-tools/` で作業する際のガイダンスを提供します。

**会話は日本語で行う。**

## コマンド

```bash
yarn dev         # ローカル開発サーバー起動（:3000）
yarn build       # 本番ビルド（Cloudflare Workers向け）
yarn start       # ビルド後のローカル確認
wrangler deploy  # Cloudflare Workersへデプロイ
wrangler secret put OPENAI_API_KEY  # 本番用APIキーの設定
```

ローカルの環境変数は `apps/ai-tools/.env` に `OPENAI_API_KEY=...` を記載する。

## アーキテクチャ

**Nuxt 3（srcDir: `src/`）+ Nitro（preset: `cloudflare_module`）+ Vuetify 3 + Tailwind CSS**

主要依存: `echarts`（ヒートマップ）、`marked`（Markdownパース）

### ページ一覧

| ルート | 概要 | 主要ファイル |
|--------|------|-------------|
| `/` | ツール一覧ハブ | `src/pages/index.vue` |
| `/ai-tools/snapreader` | 画像OCR・要約・AIチャット | `src/pages/ai-tools/snapreader/index.vue`, `src/server/api/snapreader/` |
| `/ai-tools/whisper` | 音声文字起こし（Whisper API）・要約・校正 | `src/pages/ai-tools/whisper/index.vue`, `src/server/api/whisper/`, `src/composables/useAudioRecorder.ts` |
| `/ai-tools/hagemashi` | AI励ましメッセージ生成 | `src/pages/ai-tools/hagemashi/index.vue`, `src/server/api/hagemashi/` |
| `/ai-tools/task` | Trello連携タスク管理（DOING/TODO/DONE） | `src/pages/ai-tools/task/index.vue` |
| `/deepheart` | カウンセリングチャット（独立した認証・D1） | `src/pages/deepheart/index.vue`, `src/server/api/deepheart/`, `src/components/deepheart/` |
| `/ai-tools/miyako` | 宮古島市議会議事録 — キーワード×会期ヒートマップ・AIパネル | `src/pages/ai-tools/miyako/index.vue`, `src/server/api/miyako/`, `src/components/miyako/session/`, `src/utils/miyako/` |
| `/ai-tools/miyako/member` | 議員分析 — 単語/カテゴリTF-IDFランキング | `src/pages/ai-tools/miyako/member.vue`, `src/components/miyako/member/`, `src/public/data/tfidf_*.csv` |

miyakoページはVuetifyではなくTailwind CSSを使用。

### サーバーAPI（`src/server/api/`）

- **OpenAI呼び出し**は `src/server/utils/openai.ts` の `callOpenAi()` に集約。
- APIルートはファイル名で動詞を表す（例: `summarize.post.ts`）。

| エンドポイント | 概要 |
|---|---|
| `POST /api/miyako/search` | キーワードでOpenAI file_search（Vector Store）を使って議事録を検索 |
| `POST /api/snapreader/transcript` | 画像からテキスト抽出 |
| `POST /api/snapreader/summary` | テキスト要約 |
| `POST /api/snapreader/chat` | 画像内容についてのAIチャット |
| `POST /api/snapreader/title` | タイトル生成 |
| `POST /api/snapreader/questions` | 質問生成 |
| `POST /api/whisper` | 音声ファイル文字起こし |
| `POST /api/whisper/summarize` | 文字起こしテキスト要約 |
| `POST /api/whisper/proofread` | ユーザー辞書を使った校正 |
| `POST /api/hagemashi/encourage` | 励ましメッセージ生成 |
| `POST /api/hagemashi/themes` | 励ましテーマ生成 |

### Cloudflare D1

`wrangler.toml` に1つのD1データベースが定義されている：

- `MIYAKO_DB` → `miyako-gijiroku`：宮古島市議会の sessions / bills / utterances テーブル
- `event.context.cloudflare.env.MIYAKO_DB` で取得
- `DEEPHEART_DB` → `deepheart-db`：deepheart 独自の users / sessions / messages / personalities。`src/server/utils/deepheart.ts` の `getDeepheartDb()` / `getDeepheartUser()` 経由でアクセス。Cookie 名は `deepheart-session`。

**ローカルdev時のフォールバック：** macOSのバージョン制約でローカルD1が使えないため、`src/server/utils/miyako-dev.ts` の `getDevDb()` が `cloudflare.env.MIYAKO_DB` の有無を確認し、なければ `miyako-sample.json`（プロジェクトルート）からデータを返す。

### 主要コンポーネント（`src/components/`）

- `HistoryTable.vue` — 汎用履歴テーブル
- `MiyakoWordCloud.client.vue` — クライアント専用ワードクラウド（スパイラルレイアウト）
- `miyako/MiyakoHeader.vue` — 会期/議員タブ切り替えヘッダー
- `miyako/member/MemberTable.vue` — 議員ランキングテーブル（カラーコード付き）
- `miyako/session/SessionHeatmap.vue` — EChartsヒートマップ（キーワード×会期）
- `miyako/session/SessionWordCloud.vue` — 会期別ワードクラウド
- `miyako/session/SessionAiPanel.vue` — AI議論解説パネル（トピック/結論/流れ）

### クライアントユーティリティ（`src/utils/miyako/`）

- `categories.ts` — 9カテゴリの分類定義（暮らし・福祉、医療、子ども・教育など）とSTOPWORDS
- `csv.ts` — CSVパース（`parseCsv()`）
- `heatColor.ts` — TF-IDFスコアからヒートマップ色を計算（#EEF0FF → #1A237E）

### 状態管理・Composables

- `useHistory(storageKey)` — localStorageに履歴を保存する汎用composable
- `useAudioRecorder()` — 音声録音・一時停止・再開・Whisper文字起こし

### データファイル

- `tfidf_words.csv` / `tfidf_categories.csv` — 議員別TF-IDFスコアの事前計算済みデータ
- `speakers_meta.json` — 議員メタ情報（性別・会派など）
- `src/server/data/miyako-file-ids.json` — 会期名→OpenAI Vector StoreファイルIDのマッピング

### コーディング規則

- Vue SFCは `<script setup lang="ts">`
- インデント2スペース
- JS/TS: camelCase、CSS: kebab-case
- コミットメッセージは日本語1行
