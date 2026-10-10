# キキガキ（本番版）

会議の録音から議事録をつくるサービス。 https://kikigaki.insightlens.jp/

`apps/ai-tools` の `/kikigaki`（身内向けの道具）を、一般ユーザーが自分で登録して使える形に作り直したもの。
**ai-tools 側の `/kikigaki` はコピー元として扱い、変更しない。**

## 使う人

既存の議事録アプリを使いこなせていない、ITリテラシーが高くない個人事業主（主に農家）。
スマホでの利用を主、PCも使える形。画面を作るときの約束は3つ:

- 本文は17px以上。小さい字（14px）は注記にだけ使う
- 押せるものは高さ56px以上
- 1画面に置く操作は原則1つ。主役の色（緑）は1画面に1つだけ

専門用語（連携・スコープ・構造化・ステータス・トークン）は画面に出さない。
エラーは原因ではなく**次にすべきこと**を書く（「音が小さくて聞き取れませんでした。
スマホを話す人の近くに置いて、もう一度録音してください」）。

## 処理の流れ

```
録音ファイルをえらぶ
  → （ブラウザ）長い会議は10分ごと・16kHzモノラルWAVに分割、同時3本まで
  → POST /api/transcribe   OpenAI gpt-4o-transcribe ＋ よく出る名前（辞書）
  → cleanTranscript()      無音の幻覚・繰り返しループ・プロンプト漏れを落とす
  → POST /api/minutes      Claude が構造化して D1 に保存（暗号化）
  → /records/[id] で確認・修正（「AIで直す」もここ）
  → PDF（ブラウザで生成してダウンロード。サーバーにPDFは置かない）
```

## 画面

| ルート | 内容 |
|---|---|
| `/` | 未ログイン＝ログイン（Google／メールのリンク）。ログイン後＝大ボタン1つ＋これまでの議事録 |
| `/new` | 録音をえらぶ → まとめ中 → できたら `/records/[id]` へ |
| `/records/[id]` | 内容の確認・修正・PDF・削除 |
| `/settings` | 設定はポップアップ（`components/SettingsSheet.vue`）。このURLは開くとトップへ戻して設定を開く（Stripeの戻り先） |
| `/auth/finish` | メールのリンクから戻ってくる場所 |
| `/terms` `/privacy` `/legal` | 法務ページ（雛形。`/privacy` のURLは OAuth 同意画面から参照されるので変えない） |

## 作りの前提（触る前に読むこと）

- **認証は Firebase Authentication**（Googleログイン／メールのマジックリンク）。
  自前のセッションもトークンも持たない＝クライアントが ID トークンを `Authorization: Bearer` で送り、
  サーバーは毎リクエスト `jose` で検証するだけ（`src/server/utils/auth.ts`）。
  **サーバーへの呼び出しは必ず `useAuth()` の `authedFetch` を通すこと**（素の `$fetch` は401になる）。
  同一メールで Google とマジックリンクを使っても同じユーザーになるのは Firebase 側の
  「1つのメールアドレスにつき1つのアカウント」が担保し、`users.email` の UNIQUE でも二重に守っている。
- **議事録は必ず `user_id` で絞る**。ai-tools 版は身内で共有する前提で絞っていないので、
  あちらのSQLをそのまま持ってこないこと。
- **PDFはサーバーに保存しない**。保存するのは議事録のデータ（暗号化）だけで、
  PDFは開くたびにブラウザで作る。R2は持たない。
  Googleドライブ連携は **ブラウザから直接**（`composables/useDrive.ts`。権限は `drive.file` のみ、
  トークンはサーバーに渡さない・保存しない）。使うには `NUXT_PUBLIC_GOOGLE_CLIENT_ID` が要る。
- **モニター期間フラグ**は `src/config/service.ts` の `monitorMode` が既定値で、
  環境変数 `NUXT_PUBLIC_MONITOR_MODE=false` で有料モードへ切り替わる。
  判定は `src/utils/entitlement.ts`（純粋関数・テストあり）→ `src/server/utils/entitlement.ts`。
- **契約状態を書き込むのは Stripe の webhook だけ**。画面の操作では書き換えない。
  webhook は署名を検証し、イベントIDを `stripe_events` に記録して二重処理を防ぐ。
  失敗したら記録を消してから500を返す（消さないと再送が「処理済み」と判定されて永久に取りこぼす）。
- **利用上限**は `SERVICE.limits`。文字起こしの長さは **WAVのヘッダーから数える**ので
  ブラウザの申告に依存しない（圧縮音声のときだけ申告値を使い、サイズから見てありえない短さは丸める。
  `src/utils/audioLength.ts`）。
- **文字起こしの prompt は文章の形のまま渡すこと**。語の羅列にすると辞書がまったく効かない
  （ai-tools で実測済み）。漏れ対策は `stripPromptEcho()` 側で行う。
- 音声分割の数値（10分・16kHz・同時3本・20字/分）は ai-tools で事故を出して決めた値。
  軽い気持ちで変えないこと（`src/composables/useTranscribe.ts` の冒頭コメント参照）。
- Cron は使わない（Freeプランのcronはアカウント全体で5個までで、ai-tools が使い切っている）。

## ローカルで動かす

```bash
yarn dev:kikigaki     # :3009（ほかの dev が動いていると別のポートに逃げる）
yarn workspace kikigaki test       # 純TSロジックのテスト
yarn workspace kikigaki typecheck  # vue-tsc（エラー0を保つ）
```

`.env` は `.env.example` をコピーして作る。D1 は `nuxt dev` が miniflare のものを自動で用意するので、
ローカルではテーブル作成も不要（`ensureTables()` が最初のアクセスで作る）。

確認用の口（dev限定）:

```bash
curl 'http://localhost:3009/api/dev/db'                      # テーブル一覧
curl 'http://localhost:3009/api/dev/db?table=subscriptions'  # 中身
```

**`yarn dev` 中に `yarn build` を実行しないこと**（`.nuxt` を共有しているため壊れる。
復旧は dev停止 → `rm -rf .nuxt .output` → dev再起動）。

## セットアップ（本番）

### 1. Firebase

1. Firebase プロジェクトを作る
2. Authentication → Google と「メールリンク（パスワードなしでログイン）」を有効化
3. 承認済みドメインに `kikigaki.insightlens.jp` と `localhost` を追加
4. **公開ステータスを「本番環境」にする**（テストのままだとトークンが7日で失効する）
5. ウェブアプリの設定値を `NUXT_PUBLIC_FIREBASE_*` に入れる

### 2. D1

```bash
wrangler d1 create kikigaki-db
# 出力された database_id を wrangler.toml に書く
wrangler d1 execute kikigaki-db --remote --file src/server/db/001_init.sql
```

### 3. Stripe

1. 商品と月額の価格（1プランのみ）を作る → `NUXT_STRIPE_PRICE_ID`
2. Customer Portal を有効化（解約・支払い方法の変更はここに任せる）
3. webhook の宛先に `https://kikigaki.insightlens.jp/api/stripe/webhook` を登録し、
   `checkout.session.completed` / `customer.subscription.created|updated|deleted` /
   `invoice.payment_failed` を購読 → 署名シークレットを `NUXT_STRIPE_WEBHOOK_SECRET`

ローカルで一周させるとき:

```bash
stripe listen --forward-to localhost:3009/api/stripe/webhook   # 表示される whsec_... を .env へ
```

### 4. シークレット

```bash
wrangler secret put NUXT_OPENAI_API_KEY
wrangler secret put NUXT_ANTHROPIC_API_KEY
wrangler secret put NUXT_ENCRYPTION_KEY       # 32文字以上。ai-tools とは別の鍵
wrangler secret put NUXT_STRIPE_SECRET_KEY
wrangler secret put NUXT_STRIPE_WEBHOOK_SECRET
wrangler secret put NUXT_STRIPE_PRICE_ID
```

デプロイは main への push で GitHub Actions（`.github/workflows/deploy-kikigaki.yml`）が行う。
