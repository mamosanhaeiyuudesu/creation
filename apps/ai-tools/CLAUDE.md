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
NUXT_ENCRYPTION_KEY=...   # marriage コメント・Google Healthトークン暗号化（32文字以上推奨）
NUXT_FITBIT_CLIENT_ID=...      # Google Cloud の OAuth 2.0 クライアントID（fitbit連携用）
NUXT_FITBIT_CLIENT_SECRET=...  # 同上シークレット
NUXT_FITBIT_REDIRECT_URI=...   # 例: https://<host>/api/fitbit/callback
```

※ `/fitbit` のデータ源は **Google Health API**（旧 Fitbit Web API は2026年9月停止のため後継。サーバー間REST＋Google OAuth2）。認証情報名は `NUXT_FITBIT_*` のままだが中身はGoogle OAuthのもの。
※ ローカル dev では実API・OAuthは使わず `fitbit-dev.ts` の決定的スタブで動作。実データのパース検証は dev限定の `GET /api/fitbit/diag?token=<Playgroundのaccess_token>`。

## アーキテクチャ

**Nuxt 3（srcDir: `src/`）+ Nitro（preset: `cloudflare_module`）+ Vuetify 3 + Tailwind CSS**

- OpenAI呼び出しは `src/server/utils/openai.ts` の `callOpenAi()` に集約
- miyako ページのみ Tailwind CSS（Vuetify不使用）

## ページ一覧

ナビゲーションのコメントアウト状況が「現在メンテ中かどうか」の目安。**メンテ対象外のページは修正・改善不要**。

### アクティブ（ナビに表示中）

| ルート | 概要 |
|--------|------|
| `/whisper` | マイク録音または音声ファイルで文字起こし・要約・校正 |
| `/hagemashi` | 状況を入力するとAIがはげましメッセージとテーマを生成 |
| `/fitbit` | Fitbitヘルスダッシュボード（エナジー/睡眠スコア・歩数・心拍・HRV・SpO2等を1画面集約、睡眠は詳細分解） |
| `/task` | Trello連携のタスク管理ビュー（DOING/TODO/DONE） |
| `/office` | 勤怠管理（日付・打刻記録） |
| `/games` | ゲーム一覧（リンク集） |
| `/games/panel-de-pon` | SFC版パネルでポン（5ステージ・進捗保存） |
| `/miyako` | 宮古島市議会議事録 — キーワード×会期ヒートマップ＋AI解説パネル |
| `/miyako/keyword` | キーワード検索・議事録テキスト閲覧 |
| `/miyako/member` | 議員ごとのTF-IDFランキング（単語・カテゴリ別） |
| `/miyako/yearly` | 年別発言推移グラフ |
| `/japanese-mlb-player` | 日本人MLB選手スタッツ（打者・投手、FanGraphs/MLB Stats連携） |

### 現在メンテ対象外（ナビからコメントアウト済み・修正不要）

| ルート | 概要 |
|--------|------|
| `/` | ツール一覧ハブ |
| `/snapreader` | 画像をアップロードしてOCR・要約・AIチャットができるツール |
| `/marriage` | ふたりの日々を記録するカレンダー（ムード記録・コメント付き） |

## Cloudflare D1

- `WHISPER_DB`（`whisper-db`）: users / sessions / app-history / marriage records / fitbit_connections / fitbit_daily  
  `src/server/utils/auth.ts` の `getDb()` 経由。Cookie名: `app-session`
  - Fitbitは既存の users/sessions 認証に相乗り（`024_fitbit.sql`）。OAuthトークンは `encrypt.ts` で暗号化して保存
- `MLB_DB`（`mlb-db`）: MLB選手・試合データ  
  `src/server/tasks/mlb-sync.ts` の Cron（1時間ごと）で同期
- **ローカルdev**: macOSの制約でD1が使えないため `mlb-dev.ts` が静的JSONにフォールバック

## サーバーユーティリティ

| ファイル | 役割 |
|----------|------|
| `openai.ts` | `callOpenAi()` / `fetchOpenAi()` / `extractText()` 等、OpenAI API呼び出し共通処理 |
| `auth.ts` | WHISPER_DB経由の認証・セッション管理 |
| `mlbstats.ts` | MLB Stats API呼び出し |
| `fangraphs.ts` | FanGraphs API呼び出し |
| `mlb-dev.ts` | MLBローカル開発用スタブ |
| `encrypt.ts` | marriage コメント暗号化・Fitbitトークン暗号化（AES-GCM） |
| `fitbit.ts` | Google Health API 呼び出し・OAuth2トークン管理・ダッシュボード組み立て |
| `fitbit-score.ts` | エナジー/睡眠スコアの近似算出（公式APIに無いため独自算出） |
| `fitbit-advice.ts` | 今日のアドバイス生成（Claude）。継続スレッドへ6時間スロット単位で投稿 |
| `fitbit-chat.ts` | アドバイス＆相談チャットの応答生成（過去データを根拠にClaudeで回答） |
| `fitbit-thread.ts` | アドバイス＆対話の継続スレッド（fitbit_chat_messages）の読み書き |
| `fitbit-manual.ts` | 手動運動記録の消費カロリーAI推定＋D1 CRUD |
| `fitbit-dev.ts` | Fitbitローカル開発用スタブ（日付シードで決定的データ生成） |
| `questions.ts` | AI質問生成ユーティリティ |

## コーディング規則

- Vue SFCは `<script setup lang="ts">`、インデント2スペース
- JS/TS: camelCase、CSS: kebab-case
- コミットメッセージは日本語1行
