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
NUXT_GEMINI_API_KEY=...      # whisper文字起こしでGeminiを選んだ場合のGoogle AI Studio鍵（未設定だとGemini選択時にエラー）
NUXT_MIYAKO_VECTOR_STORE_ID=...
NUXT_IPPON_PROVIDER=...   # ippon の3D生成プロバイダ（tripo|mock。未設定なら mock）
NUXT_TRIPO_API_KEY=...    # ippon で provider=tripo のときの Tripo AI 鍵（無ければ mock にフォールバック）
NUXT_ENCRYPTION_KEY=...   # marriage コメント・Google Healthトークン暗号化（32文字以上推奨）
NUXT_FITBIT_CLIENT_ID=...      # Google Cloud の OAuth 2.0 クライアントID（fitbit連携用）
NUXT_FITBIT_CLIENT_SECRET=...  # 同上シークレット
NUXT_FITBIT_REDIRECT_URI=...   # 例: https://<host>/api/fitbit/callback
NUXT_LIFE_GOOGLE_CLIENT_ID=...      # Google Cloud の OAuth 2.0 クライアントID（life連携用。fitbitとは別クライアント）
NUXT_LIFE_GOOGLE_CLIENT_SECRET=...  # 同上シークレット
NUXT_LIFE_GOOGLE_REDIRECT_URI=...   # 例: https://<host>/api/life/google/callback
```

### life（人生のインタビュー）のGoogle連携セットアップ

fitbitとは別に、Google Cloud で新規に OAuth 2.0 クライアントを発行する（Sheets/Driveへの書き込み用で、
スコープが異なるため使い回さない）。

1. Google Cloud Console で対象プロジェクトの「Google Sheets API」「Google Drive API」を有効化
2. OAuth同意画面でスコープに `drive.file` を追加（アプリが作成したファイルにのみアクセスする最小権限）
3. OAuth 2.0 クライアントID（ウェブアプリケーション）を発行し、リダイレクトURIに
   `https://<host>/api/life/google/callback`（ローカルは `http://localhost:3000/api/life/google/callback`）を登録
4. `.env` に `NUXT_LIFE_GOOGLE_CLIENT_ID` / `NUXT_LIFE_GOOGLE_CLIENT_SECRET` / `NUXT_LIFE_GOOGLE_REDIRECT_URI` を設定
   （本番は `wrangler secret put` でシークレットを登録し、`NUXT_LIFE_GOOGLE_REDIRECT_URI` は `wrangler.toml` の `[vars]`）

※ 回答本文はD1に保存しない。連携ユーザーの「本人のGoogleドライブ」に作成した専用スプレッドシートへ
Sheets APIで直接読み書きする（`life-google.ts`）。D1が持つのはリフレッシュトークン（暗号化）とスプレッドシートIDの参照だけ。

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
| `/` | ツール一覧のホーム。全ツールを「日々の道具／誰かのために作ったアプリ／データを見る／休止中」の4カテゴリのカードで並べる（要ログイン等のタグ付き）。**ツールを増やしたら `src/pages/index.vue` の `sections` に足す**（ナビ `layouts/default.vue` の `tools` とは別管理）。公開URLのトップなので**カードの説明に個人名は書かない** |
| `/whisper` | マイク録音または音声ファイルで文字起こし・要約・校正。文字起こしモデルはWhisper(既定)/Geminiを設定メニューから切替可（`useTranscriptionModel`、選択はlocalStorage） |
| `/hagemashi` | 状況を入力するとAIがはげましメッセージとテーマを生成。記録の音声文字起こしは`/whisper`と同じく設定メニューでWhisper/Geminiを切替可。はげまし結果は**文章の上の「🔊 読み上げ」ボタンで音声再生**できる（OpenAI TTS。モデル/声/トーンの指示は `api/hagemashi/speech.post.ts` 先頭の定数に集約。mp3をそのまま返し、クライアントは Blob URL を `<audio>` で再生。同じ文章なら作り直さずキャッシュ。**iOS Safari は fetch を挟むと play() がブロックされる**ため、クリック直後に無音WAVを鳴らして `<audio>` を解錠してから src を差し替えている） |
| `/fitbit` | Fitbitヘルスダッシュボード（エナジー/睡眠スコア・歩数・心拍・HRV・SpO2等を1画面集約、睡眠は詳細分解） |
| `/task` | Trello連携のタスク管理ビュー（DOING/TODO/DONE）。**DOINGは「今日やること」と「今週中にやること」の2つに分けて表示**する（振り分けは期限だけで決まる＝期限が今日以前〈超過ぶんを含む〉なら今日、それ以外〈明日以降・期限なし〉は今週中。ページ側の `isDoingToday` / `doingGroupDefs` / `doingGroups`。PCは2段、スマホは2列。**グループをまたぐドラッグでは移らない**〈期限を変えると移る〉ので、「今日やること」欄の＋は期限を今日で埋めて追加する）。**カードごとの赤枠・ピンク枠などのハイライトは廃止**（期限の近さは並び順とグループ分け、PCの「残りNh／N日超過」の文字色で表す。手動の「重要」フラグも廃止済み）。ヘッダーの**今週の日別棒グラフ**（PC・スマホとも）と、**今日／明日の進捗**（PCのヘッダー行・スマホの2枚のカードとも）は**クリックするとその日の一覧（DOING＝期限がその日の未完了／DONE＝その日に完了）がポップアップ**する（`dayDetail` は日付を入れると開く）。日別棒グラフの右（スマホは日別グラフとは別のパネル）に**投稿カウンター**があり、インスタ・note の投稿数の**全期間の累計**を出す（表示期間には連動しない。記号は `TaskSnsIcon.vue` の線画＝ブランドロゴは使わない）。クリックで `TaskSnsModal.vue` のカレンダーが開き、日を選んで＋/−か直接入力で本数を入れる（変更のたび自動保存。状態は `useTaskSns.ts`、保存先は本番が `/api/task/sns`＝`task_sns_posts`、devは localStorage）。ヘッダーの「振り返る」で**その期間にどのボードへ時間を使ったかのAIフィードバック**を生成できる（既定は今日を含む週＝月〜日、`TaskRangeCalendar.vue` で任意の期間も選べる。文字数は1000/2000）。結果は履歴（`app-history` の `task/review`）に残り「振り返り履歴」から読み返せる。プロンプトと**お金に近い/ミッションに近い/投資/運用**という見方は `server/api/task/review.post.ts` に集約。集計対象は画面に読み込み済みのDONEデータなので、ヘッダーの表示期間の外を選ぶと0件になる（ダイアログに件数を出して気づけるようにしている）。**メール通知（定期メール）は廃止済み** |
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
| `/life` | 人生のインタビュー。ライフステージ別（幼少期・学童期・思春期・青年期・現在）のテーマカードから選び、AIインタビュアーとチャット形式で深掘りしていく。テーマの軸をずらさず一問一答で深掘りするトーンは `life-chat.ts` の `buildLifeSystemPrompt` に集約。**回答内容はD1に保存せず、本人のGoogleアカウントと連携（`drive.file`スコープのみ）して作成した専用スプレッドシートへテーマごとのタブ（日時・話者・発言）として直接書き込む**（運営者は内容を保存・閲覧しない）。連携解除してもスプレッドシート自体は本人のドライブに残る。ロジックは `life-google.ts`（OAuth・Sheets API）と `life-chat.ts`（プロンプト・整形）。生成りの紙トーンの専用レイアウト（ナビ非表示・直接URL） |
| `/kiroku` | 感情メモアプリ。開いたら即書けるテキストボックス1つの入力画面と、記録一覧（`/kiroku/notes`）だけ。**保存先は端末の localStorage のみ**（サーバー・D1・認証・API を一切使わない＝感情の記録が外に出ないことが前提）。**AIによる分析・要約・助言、感情のタグ付け、採点、連続日数（ストリーク）、催促通知は意図的に実装しない**（読み解きは人間同士のセッションに委ねる、というコンセプト）。達成感は「足跡」で与える＝保存時の控えめな「記録しました」、隅の「これまで N の気づき」、記録した日に印がつくカレンダー（書かなかった日は強調しない）。一覧では日付ごとに区切って表示・3行で省略しタップで全文・編集/削除（確認ダイアログ）・キーワード検索・日で絞り込み・まとめてコピー/.txt保存（セッションで一緒に読み返すため）。書きかけは下書きとして端末に残る。生成りの紙トーンの専用レイアウト（ナビ非表示・直接URL）、ダークモード対応（既定は端末設定）、PWA（`manifest-kiroku.json`）。ロジックは `composables/kiroku/` |
| `/keiko` | 剣道 けいこ記録アプリ（護さん家族向け）。**週/月/年の3モード**（既定は週）。**練習項目はメンバーごと**に設定し（護と匡で別の内容にできる）、項目には**2種類**ある（設定の「やること」ごとに選ぶ・`keiko_items.kind`）。①**本数×ポイント**（`reps`）＝「やること」＋「本数」＋「1本あたりのポイント」で満点が決まり、その日の達成割合で按分（例: はや素振り 10本 × 2pt ＝ 満点20pt）。②**達成時にポイントを直接入れる**（`direct`）＝本数も達成割合も持たず、できた日に獲得ポイントをそのまま入力する（稽古・大会など。既定シードにこの2つを入れてある）。**週表示**（月曜始まり）＝メンバーごとのカードに項目×曜日の表。セルをタップするとダイアログが出る（「記録を消す」で未記録に戻る）。`reps` の項目は**その日の評価を 100%（全部‼️）/50%（半分）/20%/10% と、決めた本数より多くやった日の 150%/200%/300% から選ぶ**（獲得＝`round(本数 × pt/本 × 評価% / 100)`。100超は満点を超えたポイントがそのまま入る。選択肢のボタンには各％で何ptになるかを併記）。**100% はダイアログのまん中に大きく1つ、残りはその下に3列で横並び**（いちばん押される「全部できた」を最短で押せるように）。段階を変えるときはページ側の `RATE_FULL` / `RATE_OPTIONS` / `RATE_LABELS` を編集する（サーバの `normalizeRate` は10刻みで**上限300**に丸めるので、300を超える段階を足すならそちらも直す）。`direct` の項目は**獲得ポイントを直接入力**する（よく使う値のプリセットあり。0点で参加もあり得るので0は「記録なし」にしない）。**セルに出すのは種類・％に関わらずその日の獲得ポイントだけ**（花丸💮は廃止。100%でもポイントを出す）。カード右上に**週合計ポイント**・表の最下段に日ごとのポイント。**月表示**＝拡大したカレンダー（月曜始まり）で、各日にメンバーごとの獲得ポイントだけを出す。**年表示**＝1〜12月×メンバーのポイント一覧＋年合計。ポイントは項目の**現在の設定から都度計算**（記録側は「行が存在する＝できた」のまま持たない）。ログイン必須（既存 users/sessions に相乗り、記録は user_id でスコープ）。期間の前後移動・「今週/今月/今年に戻る」あり。**記録のはじまりは2026年8月**（`types/keiko.ts` の `KEIKO_START_MONTH_KEY` / `KEIKO_START_DATE`＝画面とサーバーで同じ値を使う。はじまりを変えるときはここだけ直す）で、それより前へは戻れない＝「前の週/月/年」ボタンが無効になり、年表示も8月から並ぶ。はじまりの週だけ7月末にまたがるが、**その日は入力できない**＝セルは押せない見た目（`keiko-td--off`）でダイアログも開かず、**サーバー（`records/set.post.ts`）でもはじまりより前の日の保存を400で弾く**（古い画面が開きっぱなしでも7月以前に書き込めないようにするため。消すのは許す）。道場トーンの専用レイアウト（ナビ非表示・直接URL） |
| `/guesthouse` | ゲストハウス案内アプリ（阪中さん向け）。ホスト側は管理者(admin)専用＝mamorin/sakana のみ（kaki と同じ `users.role` 共用）。**`/guesthouse` は管理トップ（ダッシュボード）**＝左は「進行中のチャット」＋「対応待ちの相談（AI下書きを確認・修正・送信）」、右は「傾向」の2カラム（スマホは上下）。進行中パネルの「すべて見る」→ `/guesthouse/sessions`（全宿横断のチャット一覧・**進行中/クローズ済み/宿で絞り込み**）。チャットはホストが**クローズ/再開**でき（`guesthouse_sessions.status`＝active/closed。会話詳細と一覧から切替。クローズ済みでもお客様が新規発言すると自動で active に戻る＝取りこぼし防止）。傾向は全宿横断でユーザー単位にキャッシュ（`guesthouse_trends`）、材料は**お客さん日記**（`computeTrends`。レビュー・意見機能は廃止済み）。「更新」ボタンで再計算するが**指紋（日記id集合）が前回と同じなら再計算せずスキップ**。件数は「日記N件」で表示。管理トップの「顧客分析」タブから `/guesthouse/insights`（**顧客分析**＝日記＋聞き取りメモを**固定語彙**でAI構造化した中間データ `guesthouse_guest_profiles` を集計して見せる。①**旅程のなかの宿**＝前の滞在地→宿→次の行き先の Sankey（echarts。「大阪から入り大阪へ」の往復で循環エラーにならないよう列ごとに接頭辞を付けてノードを分ける）②**旅程のなかの位置**＝旅程全体の経由地を**通った順**に数えて「全10地点中8番目」を出し、**旅の前半/中盤/後半**の3つに丸めた内訳と位置の帯で見せる（`components/guesthouse/RoutePosition.vue`。高山市経由と大阪経由のように**経路が違っても「後半に高野山へ来る」傾向は読める**ようにするのが狙いで、あえて粗い3分割。位置の計算は `src/utils/guesthouse-route.ts`＝サーバ/クライアント共用の純粋関数に集約。`route` 配列のうち宿自身の要素だけは宿名の表記ゆれを避けるため予約語 `この宿`＝`ROUTE_SELF` で入り、表示時に宿名へ差し替える。番号は AI の `routeIndex` より `route` 内の `ROUTE_SELF` の位置を優先＝番号だけズレて静かに嘘にならないように）③**宿が占めた位置**＝拠点型/目的地型/通過型の内訳（さかなさんの「エリア数日の中で宿がどんな位置を占めるか」に答える軸。時間配分は日記から取れないが役割なら読める）④**満足度**＝側面ごとの言及数と根拠になった原文の引用（**点数は付けない**＝自由記述から数値を作ると根拠のない精度が出るため、件数と引用だけ）。**この宿／宿坊・ほかの宿／エリア・その他**の3タブで主語を分けて数える（既定は「この宿」。お客様がご自身で手配した高野山の宿坊の感想が混ざると**宿そのものの評価**が読めなくなるため、抽出の時点で `aspects[].subject` に主語を持たせている。主語が判断できない感想は `inn` に寄せず `other` 送りにする＝宿の評価を汚さない方を選ぶ）⑤関心の対象・エリア内の立ち寄り先・**ほかに泊まられた宿（宿坊など＝`shukuboStays`）**・宿が提供した体験・お客様ごとの読み取り結果（お客様カードには旅程の道のりと「全N地点中M番目・旅の後半」を出す））。各ページの説明は見出し横の「?」（`components/guesthouse/HelpTip.vue`）のポップアップに集約。登録系は `/guesthouse/houses`（宿ごとにコンセプト＋事務案内(info)＋共有リンク/QR。編集は `/guesthouse/[id]`＝案内の編集/会話ログ/お客さん日記の3タブ）、`/guesthouse/tips`（ホスト共通の旅の情報＝おすすめ素材）。**お客様チャット**：`/guesthouse/stay/:token` はログイン不要（宿ごと1リンク・session_id はお客様ブラウザ保持で滞在セッションを永続化）。**原則 AI が自分で答える**（auto）＝宿の質問は info を根拠に、観光・食事・周辺は一般知識＋**Web検索**(Claudeのweb_searchツール)で補う。人間のフリはしない。**本当に緊急・AIでは対応不能なものだけ**阪中さんへ引き継ぐ(handoff)→短い「すぐ取り次ぎます」を会話に残し、相談＋AI下書きが管理トップに出る→承認して送ると「阪中さん」ラベルでお客様スレッドへ（5秒ポーリング受信）。**この匙加減（緊急の線引き・Web検索の有無/回数・応答方針）は `guesthouse-policy.ts` に集約**（後で調整しやすいよう1か所に）。会話詳細(`/guesthouse/session/:id`)でお客さん日記（自由記述1本。自分で手入力もできるし、AIが**会話＋聞き取りメモ**から下書きも作れる。日記の `itinerary` は顧客分析の主材料なので、生成プロンプトが**エリア内でどこへ行きどう時間を使ったか・前後の導線・移動手段・宿発の体験**まで書くよう指示している＝阪中さんの入力の手間を増やさずに分析の材料を厚くする方針。すでに書かれている内容がある状態でAI生成すると、上書きかマージか確認する）・聞き取りメモ（阪中さんが対面などで直接聞いた内容を自由記述で書き留める。日記と違い1セッションに複数件持て、追加/編集/削除ができる。AI生成はなく手入力のみ）・お礼＆レビュー依頼の下書き。**実際の予約対応は今もBooking.com上で行っており、このアプリのチャット機能自体はまだ使われていない**ため、会話ログには「Booking.comの履歴を取り込む」機能がある＝コピペした原文を貼ると、メッセージ本文と日時（時刻＋日付区切り「YYYY年M月D日」/曜日1文字/「今日」）を**プログラムで機械的に**1件ずつへ分割し（`guesthouse-import.ts` の `parseBookingThread`）、**発言者（ゲスト/阪中さん）の分類だけAIに判定させ**（`classifyImportedMessages`）、確認・修正してから会話の続きとして保存する（`kind='import'`）。日記からAIが傾向抽出（学習ループ）。AI呼び出しは `guesthouse-ai.ts`。里山トーンの専用レイアウト（ナビ非表示・直接URL） |

### 現在メンテ対象外（ナビからコメントアウト済み・修正不要）

| ルート | 概要 |
|--------|------|
| `/snapreader` | 画像をアップロードしてOCR・要約・AIチャットができるツール |
| `/marriage` | ふたりの日々を記録するカレンダー（ムード記録・コメント付き） |

## Cloudflare D1

- `WHISPER_DB`（`whisper-db`）: users / sessions / app-history / marriage records / fitbit_connections / fitbit_daily  
  `src/server/utils/auth.ts` の `getDb()` 経由。Cookie名: `app-session`
  - Fitbitは既存の users/sessions 認証に相乗り（`024_fitbit.sql`）。OAuthトークンは `encrypt.ts` で暗号化して保存
  - **アカウントの新規作成はアプリからできない**（`/api/auth/register` は廃止）。招待制のため、発行は
    `node scripts/create-user.mjs <username> <password> [--admin] [--local]` で INSERT 文を作って D1 に流す
    （`password_hash` は PBKDF2 の独自形式で SQL だけでは作れないのでこのスクリプトを使う）。
    その代わり **パスワードの変更は本人ができる**（`POST /api/auth/password`＝ユーザー名＋現在のパスワードで本人確認。
    変更時に既存セッションを全削除して発行し直す＝他端末のログインは切れる）。入り口は2つ:
    ログイン前はログイン画面 `AuthModal.vue` の「パスワードを変更する」、ログイン中は各ページの
    ログアウトの隣／設定メニューの「パスワード変更」（`components/PasswordModal.vue`。ユーザー名はセッションから）
- `WHISPER_DB` 相乗り（hagemashi）: hagemashi_profiles / hagemashi_consult_messages / hagemashi_achievements / hagemashi_kokoro / hagemashi_moods / hagemashi_topic_cache / hagemashi_achieved / hagemashi_gratitude / **hagemashi_moments**（できごと＝記録から抜き出した出来事1件ずつ。タグ5種（達成/感謝/喜び＝ポジ、しんどさ/不安＝ネガ）・`impact` 1〜5・`who`・手編集の印 `edited` を持ち、ユーザーごと1行に JSON をまとめて暗号化保存。`processedIds` に抽出済みの記録idを持たせて差分実行の基準にする）。すべて既存 users/sessions 認証に相乗りし `user_id` でスコープ。**hagemashi_achievements（旧・達成リスト）は読み込み専用**で、hagemashi_moments への移行元としてのみ残している。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/047_hagemashi_moments.sql`
  - ※ マイグレーションの採番は 028・031・042 が重複しているので、新規追加時は `ls src/server/db/` で最大値を確認してから付ける
- `WHISPER_DB` 相乗り（kaki）: kaki_trees / kaki_observations / kaki_comments / kaki_health_events。既存 `users` に `role`（admin/foster）列を追加して認証に相乗り。写真はR2を使わず base64 data URL を D1 に保存（アップロード時にクライアント側で縮小・圧縮）。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/031_kaki.sql`
  - 農家（阪中さん）を管理者にする: `wrangler d1 execute whisper-db --remote --command "UPDATE users SET role='admin' WHERE username='<農家のユーザー名>'"`
- `WHISPER_DB` 相乗り（momo）: momo_orders / momo_order_items / momo_messages / momo_settings。既存 users/sessions 認証に相乗りし、注文は `user_id` でスコープ。AI抽出は `extract.post.ts` が `anthropic.ts` の callClaudeText を使用。テーブルは `ensureMomoTables()` で自動生成もされるが、正式には下記マイグレーションを適用。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/032_momo.sql`
- `WHISPER_DB` 相乗り（ippon）: ippon_projects / ippon_versions。既存 users/sessions 認証に相乗りし、案件は `user_id` でスコープ。共有リンクは `share_token` で公開（ログイン不要閲覧）。スケッチ・GLBは R2 を使わず data URL のまま TEXT 保存（kaki 方式）。テーブルは `ensureIpponTables()` で自動生成もされる。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/033_ippon.sql`
- `WHISPER_DB` 相乗り（guesthouse）: guesthouse_houses / guesthouse_facts（`type` 列は残るが実質 info専用）/ guesthouse_sessions / guesthouse_messages / guesthouse_consults / guesthouse_diaries（お客さん日記＝自由記述1本。`content` に本文をそのまま暗号化保存。`summary` 列は過去互換で残るだけの未使用列）/ guesthouse_hearing_notes（聞き取りメモ＝阪中さんが対面などで直接聞いた内容の自由記述。日記と違い1セッションに複数件持てる）/ guesthouse_tips（旅の情報＝ホスト共通・`user_id` スコープ）/ guesthouse_reviews（レビュー・意見＝顧客の声・傾向分析の第2入力源・`user_id` スコープ・body は暗号化）/ guesthouse_trends（傾向キャッシュ＝ユーザー単位で前回結果＋日記の指紋を1組保持）/ guesthouse_guest_profiles（顧客分析の中間データ＝日記1件を固定語彙でAI構造化した結果。ゲスト1組＝1行で `data` は暗号化。**主キーは session_id**＝日記は編集のたび DELETE→新UUIDで INSERT されるので diary_id を主キーにすると孤児行が溜まるため。`diary_id` が今の日記と違う／`vocab_version` が上がった、で再抽出を判定する。日記から必ず再生成できる純粋なキャッシュなので丸ごと消して作り直してよい）。既存 users/sessions 認証に相乗りし、宿は `user_id` でスコープ。ホスト側は admin 専用（`requireGuesthouseUser` が role=admin を要求。管理者は `UPDATE users SET role='admin' WHERE username IN ('mamorin','sakana')` 済み）。共有リンクは `share_token` で公開。お客様チャットはフェーズ2で永続化（滞在セッション・宿ごと1リンクのまま `session_id` はお客様ブラウザの localStorage 保持）。テーブルは `ensureGuesthouseTables()` で自動生成もされる。
  - 適用: `034_guesthouse.sql` → `035_guesthouse_phase2.sql`（facts へ `type` 追加＋会話/相談/日記。ALTER 含むので再実行不可）→ `036_guesthouse_tips.sql`（旅の情報の共通テーブル）→ `037_guesthouse_trends.sql`（傾向キャッシュ）→ `038_guesthouse_reviews.sql`（レビュー・意見＋傾向に reviews_based_on 列追加。ALTER 含むので再実行不可）→ `041_guesthouse_hearing_notes.sql`（聞き取りメモ）→ `043_guesthouse_guest_profiles.sql`（顧客分析の中間データ）を順に `wrangler d1 execute whisper-db --remote --file ...`
- `WHISPER_DB` 相乗り（life-analyzer）: life_documents（貼り付けたテキスト。本文・抜粋は暗号化）/ life_analyses（影5・光5のコア＝分析キャッシュ。`signature`＝対象テキストIDのソート連結がキー。結果JSONは暗号化）/ life_episode_summaries（出来事ノードのAI要約キャッシュ。analysis_id × node_key で一意）。既存 users/sessions 認証に相乗りし、すべて `user_id` でスコープ。テーブルは `ensureLifeTables()` で自動生成もされる。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/039_life_analyzer.sql`
- `WHISPER_DB` 相乗り（life）: life_google_connections（Google連携1件＝ユーザーごと1行。`refresh_token` は暗号化、`spreadsheet_id`/`spreadsheet_url` は本人のドライブに作成したスプレッドシートへの参照）/ life_oauth_states（fitbitと同じ理由でのOAuth一時state保管）。**回答本文・会話ログはここには一切保存しない**（本人のスプレッドシートが唯一の保存先）。テーブルは `ensureLifeGoogleTables()` で自動生成もされる。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/042_life.sql`
- `WHISPER_DB` 相乗り（task）: task_profiles（Trelloの接続情報。key/token は暗号化）/ **task_sns_posts**（投稿カウンター＝Instagram・note の投稿数を「日 × プラットフォーム」で1行。0件の日は行を持たない＝累計は SUM で出す）。既存 users/sessions 認証に相乗りし `user_id` でスコープ。テーブルは `ensureTaskSnsTables()`（`server/utils/task-sns.ts`）で自動生成もされる。**ローカルdevはD1が無いので localStorage に保存する**（プロフィール設定と同じ方式。`useTaskProfiles` / `useTaskSns` が `import.meta.dev` で分岐）。
  - 適用: `wrangler d1 execute whisper-db --remote --file src/server/db/048_task_sns.sql`
  - ※ task のメール通知は廃止したため `task_alerts` テーブルは未使用（消すなら `wrangler d1 execute whisper-db --remote --command "DROP TABLE IF EXISTS task_alerts"`）
- `WHISPER_DB` 相乗り（keiko）: keiko_members（メンバー。ユーザーごとに管理、既定値で護/匡/真啓をシード）/ keiko_items（練習項目。**`member_id` でメンバーごと**に持つ。`rep_count`＝本数・`point_per_rep`＝1本あたりのポイント・`active`列で表示/非表示）/ keiko_records（記録＝メンバー×項目×日で1件。行がある＝やった。`rate`＝`reps` 項目の達成度％（10〜100の10刻み）、`points`＝`direct` 項目で入力された獲得ポイント。`(member_id, item_id, date)` に一意制約。集計時に `keiko_items` と JOIN して `POINT_EXPR`（`kind='direct'` なら `COALESCE(points,0)`、それ以外は `ROUND(rep_count * point_per_rep * rate / 100.0)`）を SUM する。**`/ 100.0` と小数で書かないと SQLite の整数除算で rate<100 が全部 0 になる**）。既存 users/sessions 認証に相乗りし、すべて `user_id` でスコープ。テーブルは `ensureKeikoTables()` で自動生成もされる（列追加も `ALTER TABLE ... ADD COLUMN` を握りつぶしつつ実行）。
  - 適用: `042_keiko.sql` → `044_keiko_points.sql`（項目のメンバー分け＋本数/ポイント列）→ `045_keiko_rate.sql`（評価％列。既存記録は100%扱い）→ `046_keiko_direct.sql`（項目の種類＋直接ポイント列）を順に `wrangler d1 execute whisper-db --remote --file ...`（044〜046 は ALTER 含むので再実行不可）
  - 項目を `reps` → `direct` に変えると過去の記録は `rate` しか持たず0点になるため、`items/[id].patch.ts` が切り替え時にそのときの設定で計算した値を `points` へ焼き付ける
  - 項目がメンバー共通だった頃の行（`member_id` が空）は、初回アクセス時に `migrateSharedItemsToMembers()` がメンバーごとへ複製し、記録の `item_id` を付け替えてから旧行を消す
- `MLB_DB`（`mlb-db`）: MLB選手・試合データ  
  `src/server/tasks/mlb-sync.ts` の Cron（1時間ごと）で同期
- **ローカルdev**: macOSの制約でD1が使えないため `mlb-dev.ts` が静的JSONにフォールバック

## サーバーユーティリティ

| ファイル | 役割 |
|----------|------|
| `openai.ts` | `callOpenAi()` / `fetchOpenAi()` / `extractText()` 等、OpenAI API呼び出し共通処理 |
| `gemini.ts` | `getGeminiKey()`。whisper文字起こしでGeminiモデルを選んだ場合のAPI鍵取得のみ（呼び出し自体は `api/whisper/index.post.ts` に直書き、他プロバイダと同様の粒度） |
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
| `guesthouse-ai.ts` | guesthouse の Claude 呼び出し集約（お客様チャットの緊急判定 triage・通常応答 answer(Web検索対応)・緊急時の取り次ぎ返信・相談の下書き・お客さん日記生成・お礼/レビュー依頼下書き・傾向抽出・Booking.com取り込みメッセージの発言者分類 `classifyImportedMessages`・顧客分析の構造化抽出 `extractGuestProfile`＝固定語彙から外れたタグや原文にない引用を捨て、`routeIndex` を `route` 内の `ROUTE_SELF` の位置から取り直し、主語不明の感想を `other` へ寄せる正規化までここで行う） |
| `life-analyzer.ts` | life-analyzer の認証（user_idスコープ）・テーブル用意・テキスト/分析/要約の読み書き（本文と結果は `encrypt.ts` で暗号化）・分析キャッシュの署名（`analysisSignature`）・AIに渡す資料の組み立て（`buildSourceText`＝複数テキストを均等に上限まで） |
| `life-google.ts` | life の Google OAuth2（PKCE, スコープ `drive.file` のみ）・専用スプレッドシートの作成（初回連携時、テーマごとのタブ＋見出し行を用意）・テーマのタブへの会話ログの読み書き（`readThemeHistory`/`appendThemeRows`）。access_tokenは永続化せず都度リフレッシュする |
| `life-chat.ts` | life チャットのシステムプロンプト（`buildLifeSystemPrompt`＝テーマの軸をずらさず一問一答で深掘りする、という要件をここに集約。トーン調整はここだけ触ればよい）と日時整形 |
| `life-analyzer-ai.ts` | life-analyzer の Claude 呼び出し集約（テキストの命名・影5/光5のコア抽出・出来事ノードの要約）。**「診断」ではなく本人が気づくための材料**という姿勢をシステムプロンプトに集約しているので、トーン調整はここだけ触る |
| `guesthouse-insights.ts` | guesthouse **顧客分析の匙加減を集約**（滞在の型の判定基準・満足度の側面と関心の対象の**固定語彙**・感想の主語 `ASPECT_SUBJECTS`＝この宿/宿坊・ほかの宿/エリア・旅程の順番の書かせ方・抽出システムプロンプト・`VOCAB_VERSION`）。旅程の位置計算だけは表示側でも使うので `src/utils/guesthouse-route.ts`（純粋関数）に分けてある。AIに自由にタグを振らせると「食事/料理/ごはん」が別タグになり時系列で見ているものが語彙のブレになるため語彙を閉じている。**語彙や方針を変えたら `VOCAB_VERSION` を +1**（全プロファイルが作り直される）。分析軸の変更は基本ここだけ編集 |
| `guesthouse-policy.ts` | guesthouse お客様チャットの**匙加減を集約**（緊急=handoff の線引き `EMERGENCY_CRITERIA`・Web検索の有無/回数 `WEB_SEARCH`・triage/通常応答/緊急返信の各システムプロンプト）。方針変更は基本ここだけ編集 |
| `guesthouse-import.ts` | Booking.com等のメッセージ履歴のコピペ原文を**AIを使わずプログラムだけで**1件ずつのメッセージ＋日時に分割する（`parseBookingThread`）。時刻(HH:MM)行と、直後に続く日付区切り行（「YYYY年M月D日」/曜日1文字/「今日」「昨日」、無ければ同日）を機械的に読み解き、JSTの日時をDB規約(UTC)の `created_at` 文字列に変換する。発言者の分類はここでは行わない（`guesthouse-ai.ts` の `classifyImportedMessages` がAI担当） |
| `keiko.ts` | keiko の認証（user_idスコープ）・テーブル用意/列追加・メンバー/練習項目/評価記録の読み書き・**ポイント集計**（`POINT_EXPR` と `loadPointBuckets`＝メンバー×日 または メンバー×月で SUM。1件ずつ ROUND してから SUM＝クライアントの週集計と丸め方を揃えるため。計算式を変えるならページ側の `earnedPoints()` も同時に直す）・初回アクセス時の既定メンバー（護/匡/真啓）と既定項目のシード・旧データ（メンバー共通項目）の移行・記録のはじまりの判定（`isBeforeKeikoStart`） |

## コーディング規則

- Vue SFCは `<script setup lang="ts">`、インデント2スペース
- JS/TS: camelCase、CSS: kebab-case
- コミットメッセージは日本語1行
