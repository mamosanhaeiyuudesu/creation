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
NUXT_IPPON_PROVIDER=...   # ippon の3D生成プロバイダ（tripo|mock。未設定なら mock）
NUXT_TRIPO_API_KEY=...    # ippon で provider=tripo のときの Tripo AI 鍵（無ければ mock にフォールバック）
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
| `/kaki` | 柿の木 里親アプリ。里親は自分の木の詳細（成長写真・観察日記・病歴・応援コメント）を閲覧。`/kaki/admin` は農家用（木の登録編集・観察記録投稿・AI変換）。絵本トーンの専用レイアウト |
| `/momo` | 桃農家向け 注文管理アプリ。SNSの会話ログを貼り付け→AI(Claude)が注文情報を構造化抽出→確認・修正して保存。納品日順一覧・品種×サイズ選果集計・佐川e飛伝III取込CSV出力（宛先空欄）。桃色の専用レイアウト（ナビ非表示・直接URL） |
| `/ippon` | 什器・インテリア設計者向け Sketch2View。紙スケッチを撮影→前処理(クライアントCanvas)→Claude(vision)が形状を読み解き→3D生成→3Dビュー(model-viewer)＋公開共有リンク。目的はイメージ伝達で製作精度は非目的。3D生成は `ippon-provider.ts` で抽象化（provider=mock はマッシングGLBを手続き生成／tripo はTripo AI）。工房トーンの専用レイアウト（ナビ非表示・直接URL）。`/ippon/view/:token` はログイン不要の共有閲覧 |
| `/guesthouse` | ゲストハウス案内アプリ（フェーズ1「チェックイン案内チャット」）。ホスト（阪中さん）が宿ごとに事務案内（駐車場・鍵・Wi-Fi・ゴミ出し等）を登録し、共有リンク/QRをお客様に渡す。`/guesthouse/stay/:token` はログイン不要のお客様チャットで、Claudeが宿の案内情報だけを根拠に事務質問へ即答（「自動応答」ラベル）。観光相談・トラブルは正直に「阪中さんに確認します」と引き継ぐ（handoff）＝人間のフリはしない。多言語対応。里山トーンの専用レイアウト（ナビ非表示・直接URL） |

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
- `WHISPER_DB` 相乗り（kaki）: kaki_trees / kaki_observations / kaki_comments / kaki_health_events。既存 `users` に `role`（admin/foster）列を追加して認証に相乗り。写真はR2を使わず base64 data URL を D1 に保存（アップロード時にクライアント側で縮小・圧縮）。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/031_kaki.sql`
  - 農家（阪中さん）を管理者にする: `wrangler d1 execute whisper-db --remote --command "UPDATE users SET role='admin' WHERE username='<農家のユーザー名>'"`
- `WHISPER_DB` 相乗り（momo）: momo_orders / momo_order_items / momo_messages / momo_settings。既存 users/sessions 認証に相乗りし、注文は `user_id` でスコープ。AI抽出は `extract.post.ts` が `anthropic.ts` の callClaudeText を使用。テーブルは `ensureMomoTables()` で自動生成もされるが、正式には下記マイグレーションを適用。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/032_momo.sql`
- `WHISPER_DB` 相乗り（ippon）: ippon_projects / ippon_versions。既存 users/sessions 認証に相乗りし、案件は `user_id` でスコープ。共有リンクは `share_token` で公開（ログイン不要閲覧）。スケッチ・GLBは R2 を使わず data URL のまま TEXT 保存（kaki 方式）。テーブルは `ensureIpponTables()` で自動生成もされる。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/033_ippon.sql`
- `WHISPER_DB` 相乗り（guesthouse）: guesthouse_houses / guesthouse_facts。既存 users/sessions 認証に相乗りし、宿は `user_id` でスコープ。共有リンクは `share_token` で公開（ログイン不要のお客様チャット）。案内チャットはステートレス（会話履歴はクライアント保持でAPIに毎回渡す・DB非保存＝会話→日記はフェーズ2）。テーブルは `ensureGuesthouseTables()` で自動生成もされる。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/034_guesthouse.sql`
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
| `kaki.ts` | 柿アプリの認証（role判定）・アクセス制御・テーブル用意・行整形。AI変換は `ai-transform.post.ts` が `anthropic.ts` の `callClaudeText()` を利用 |
| `ippon.ts` | ippon の認証（user_idスコープ）・テーブル用意・案件/バージョン整形・共有トークン。スケッチ解釈は `interpret.post.ts` が `anthropic.ts` の `callClaudeVision()` を利用 |
| `ippon-provider.ts` | 3D生成プロバイダの抽象化（`MeshProvider`）。`getMeshProvider(config)` で mock/tripo を解決（鍵無しは mock にフォールバック） |
| `ippon-massing.ts` | Claude の読み取り寸法から grey マッシングモデル(GLB data URL)を手続き生成。mock プロバイダの本体 |
| `guesthouse.ts` | guesthouse の認証（user_idスコープ）・テーブル用意・宿/案内項目の整形・共有トークン・知識ベース組み立て。お客様チャットは `stay/[token]/chat.post.ts` が `anthropic.ts` の `callClaudeText()` を利用 |

## コーディング規則

- Vue SFCは `<script setup lang="ts">`、インデント2スペース
- JS/TS: camelCase、CSS: kebab-case
- コミットメッセージは日本語1行
