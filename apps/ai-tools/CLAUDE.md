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
| `/life-analyzer` | 人生の影と光。自分について語られたテキストを貼り付けて保存（名前はAIが命名）→ 履歴から1件でも複数件でも選んで分析 → **影5つ（左）・光5つ（右）のコア**（日本語15文字以内）を cytoscape の図に出す。各コアの外側にそれを裏づける具体的な出来事が3つ並び、クリックすると元テキストを読み返したAI要約＋引用＋問いかけのポップアップが出る（1度作ったら `life_episode_summaries` にキャッシュ）。図の配置は意味を持つので力学レイアウトではなく **preset（決め打ち座標）**。コアをクリックするとその周りへ寄る。分析は対象テキストの組み合わせ（signature）でキャッシュし、「分析し直す」だけ AI を呼び直す。本文・分析結果は `encrypt.ts` で暗号化保存。夜明け前トーンの専用レイアウト（ナビ非表示・直接URL） |
| `/guesthouse` | ゲストハウス案内アプリ（阪中さん向け）。ホスト側は管理者(admin)専用＝mamorin/sakana のみ（kaki と同じ `users.role` 共用）。**`/guesthouse` は管理トップ（ダッシュボード）**＝左は「進行中のチャット」＋「対応待ちの相談（AI下書きを確認・修正・送信）」、右は「傾向」の2カラム（スマホは上下）。進行中パネルの「すべて見る」→ `/guesthouse/sessions`（全宿横断のチャット一覧・**進行中/クローズ済み/宿で絞り込み**）。チャットはホストが**クローズ/再開**でき（`guesthouse_sessions.status`＝active/closed。会話詳細と一覧から切替。クローズ済みでもお客様が新規発言すると自動で active に戻る＝取りこぼし防止）。傾向は全宿横断でユーザー単位にキャッシュ（`guesthouse_trends`）、材料は**お客さん日記＋レビュー・意見を統合**（`computeTrends`）。「更新」ボタンで再計算するが**指紋（日記id集合＋レビューid・updated_at）が前回と同じなら再計算せずスキップ**。件数は「日記N件＋レビューM件」で表示。各ページの説明は見出し横の「?」（`components/guesthouse/HelpTip.vue`）のポップアップに集約。登録系は `/guesthouse/houses`（宿ごとにコンセプト＋事務案内(info)＋共有リンク/QR。編集は `/guesthouse/[id]`＝案内の編集/会話ログ/お客さん日記の3タブ）、`/guesthouse/tips`（ホスト共通の旅の情報＝おすすめ素材）、`/guesthouse/reviews`（レビュー・意見＝口コミ/アンケート等を出典ラベル付きで登録。手動追加＋貼り付けAI取込で1件ずつ切り分け。body は暗号化保存）。**お客様チャット**：`/guesthouse/stay/:token` はログイン不要（宿ごと1リンク・session_id はお客様ブラウザ保持で滞在セッションを永続化）。**原則 AI が自分で答える**（auto）＝宿の質問は info を根拠に、観光・食事・周辺は一般知識＋**Web検索**(Claudeのweb_searchツール)で補う。人間のフリはしない。**本当に緊急・AIでは対応不能なものだけ**阪中さんへ引き継ぐ(handoff)→短い「すぐ取り次ぎます」を会話に残し、相談＋AI下書きが管理トップに出る→承認して送ると「阪中さん」ラベルでお客様スレッドへ（5秒ポーリング受信）。**この匙加減（緊急の線引き・Web検索の有無/回数・応答方針）は `guesthouse-policy.ts` に集約**（後で調整しやすいよう1か所に）。会話詳細(`/guesthouse/session/:id`)でお客さん日記の自動生成・お礼＆レビュー依頼の下書き。日記からAIが傾向抽出（学習ループ）。AI呼び出しは `guesthouse-ai.ts`。里山トーンの専用レイアウト（ナビ非表示・直接URL） |

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
- `WHISPER_DB` 相乗り（guesthouse）: guesthouse_houses / guesthouse_facts（`type` 列は残るが実質 info専用）/ guesthouse_sessions / guesthouse_messages / guesthouse_consults / guesthouse_diaries / guesthouse_tips（旅の情報＝ホスト共通・`user_id` スコープ）/ guesthouse_reviews（レビュー・意見＝顧客の声・傾向分析の第2入力源・`user_id` スコープ・body は暗号化）/ guesthouse_trends（傾向キャッシュ＝ユーザー単位で前回結果＋日記/レビューの指紋を1組保持）。既存 users/sessions 認証に相乗りし、宿は `user_id` でスコープ。ホスト側は admin 専用（`requireGuesthouseUser` が role=admin を要求。管理者は `UPDATE users SET role='admin' WHERE username IN ('mamorin','sakana')` 済み）。共有リンクは `share_token` で公開。お客様チャットはフェーズ2で永続化（滞在セッション・宿ごと1リンクのまま `session_id` はお客様ブラウザの localStorage 保持）。テーブルは `ensureGuesthouseTables()` で自動生成もされる。
  - 適用: `034_guesthouse.sql` → `035_guesthouse_phase2.sql`（facts へ `type` 追加＋会話/相談/日記。ALTER 含むので再実行不可）→ `036_guesthouse_tips.sql`（旅の情報の共通テーブル）→ `037_guesthouse_trends.sql`（傾向キャッシュ）→ `038_guesthouse_reviews.sql`（レビュー・意見＋傾向に reviews_based_on 列追加。ALTER 含むので再実行不可）を順に `wrangler d1 execute whisper-db --remote --file ...`
- `WHISPER_DB` 相乗り（life-analyzer）: life_documents（貼り付けたテキスト。本文・抜粋は暗号化）/ life_analyses（影5・光5のコア＝分析キャッシュ。`signature`＝対象テキストIDのソート連結がキー。結果JSONは暗号化）/ life_episode_summaries（出来事ノードのAI要約キャッシュ。analysis_id × node_key で一意）。既存 users/sessions 認証に相乗りし、すべて `user_id` でスコープ。テーブルは `ensureLifeTables()` で自動生成もされる。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/039_life_analyzer.sql`
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
| `guesthouse.ts` | guesthouse の認証（admin判定・user_idスコープ）・テーブル用意・宿/案内項目(info/tip)の整形・共有トークン・知識ベース組み立て・滞在セッション/メッセージ/相談/日記の読み書き |
| `guesthouse-ai.ts` | guesthouse の Claude 呼び出し集約（お客様チャットの緊急判定 triage・通常応答 answer(Web検索対応)・緊急時の取り次ぎ返信・相談の下書き・お客さん日記生成・お礼/レビュー依頼下書き・傾向抽出） |
| `life-analyzer.ts` | life-analyzer の認証（user_idスコープ）・テーブル用意・テキスト/分析/要約の読み書き（本文と結果は `encrypt.ts` で暗号化）・分析キャッシュの署名（`analysisSignature`）・AIに渡す資料の組み立て（`buildSourceText`＝複数テキストを均等に上限まで） |
| `life-analyzer-ai.ts` | life-analyzer の Claude 呼び出し集約（テキストの命名・影5/光5のコア抽出・出来事ノードの要約）。**「診断」ではなく本人が気づくための材料**という姿勢をシステムプロンプトに集約しているので、トーン調整はここだけ触る |
| `guesthouse-policy.ts` | guesthouse お客様チャットの**匙加減を集約**（緊急=handoff の線引き `EMERGENCY_CRITERIA`・Web検索の有無/回数 `WEB_SEARCH`・triage/通常応答/緊急返信の各システムプロンプト）。方針変更は基本ここだけ編集 |

## コーディング規則

- Vue SFCは `<script setup lang="ts">`、インデント2スペース
- JS/TS: camelCase、CSS: kebab-case
- コミットメッセージは日本語1行
