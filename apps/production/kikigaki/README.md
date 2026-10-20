# キキガキ（本番版）

会議の文章（テキスト）から議事録をつくるサービス。音声の文字起こしは扱わない（2026-10-13 にやめた）。 https://kikigaki.insightlens.jp/

`apps/ai-tools` の `/kikigaki`（身内向けの道具）を、一般ユーザーが自分で登録して使える形に作り直したもの。
**ai-tools 側の `/kikigaki` はコピー元として扱い、変更しない。**

## 使う人

既存の議事録アプリを使いこなせていない、ITリテラシーが高くない個人事業主（主に農家）。
スマホでの利用を主、PCも使える形。画面を作るときの約束は3つ:

- 本文は17px以上。小さい字（14px）は注記にだけ使う
- 押せるものは高さ56px以上
- 1画面に置く操作は原則1つ。主役の色（緑）は1画面に1つだけ

専門用語（連携・スコープ・構造化・ステータス・トークン）は画面に出さない。
エラーは原因ではなく**次にすべきこと**を書く（「文章が長すぎて一度にまとめられません。
前半・後半に分けてお試しください」）。

## 処理の流れ

```
文章のファイル(.txt)をえらぶ／文章を貼り付ける
  → POST /api/minutes      Claude が構造化して D1 に保存（暗号化）
  → /records/[id] で確認・修正（「AIで直す」もここ）
  → PDF（ブラウザで生成してダウンロード。サーバーにPDFは置かない）
```

## 画面

| ルート | 内容 |
|---|---|
| `/` | 未ログイン＝ログイン（Google／メールのリンク）。ログイン後＝大ボタン1つ＋これまでの議事録。**お休み中の人には「おかえりなさい」（再開／すべて消す）** |
| `/new` | 文章をえらぶ・貼り付け → まとめ中 → できたら `/records/[id]` へ |
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
  **有料化の手順（Stripe の準備・事前のお知らせ・切り替えの日の作業）は `TODO.md` の「3」「4」にまとめてある。**
  判定は `src/utils/entitlement.ts`（純粋関数・テストあり）→ `src/server/utils/entitlement.ts`。
- **契約状態を書き込むのは Stripe の webhook だけ**。画面の操作では書き換えない。
  webhook は署名を検証し、イベントIDを `stripe_events` に記録して二重処理を防ぐ。
  失敗したら記録を消してから500を返す（消さないと再送が「処理済み」と判定されて永久に取りこぼす）。
- **利用上限はAI代のメーター**（`utils/usage.ts`）。件数ではなく、Claude の応答に付く使用トークン数から
  費用を求めて `ai_usage_monthly` に足す。上限は `SERVICE.limits.monthlyBudgetUsd`、画面には金額を出さず％だけ出す。
  Claude を呼ぶ口は `callClaudeText(event, …)` に一本化していて、呼ぶ前に上限を確かめ、呼んだあとに数える
  （**呼ぶ前に必ず `requireUser()` を通すこと**。通さないとエラーにして未計測のAI呼び出しを防ぐ）。
  モデルや単価を変えたら `PRICE_PER_MTOK` と上限も見直す。1件あたりの文章は5万字まで。
  D1 の古い `usage_monthly` / `record_revisions` / `glossary` テーブルと `records.audio_name` 列は残っていても使っていない。
- **退会は2種類**（`server/utils/account.ts`）。既定は「お休み」＝`users.withdrawn_at` / `retain_until` に日時を入れるだけで、
  議事録などは消さず **5年**（`utils/withdrawal.ts` の `RETENTION_YEARS`）預かる。契約は止める。
  もう1つは「すべて消す」＝従来どおり即時に全消去（Firebase のアカウントも消す）。
  - お休み中は `requireUser` が **403（`data.code: 'withdrawn'`）** で止める。通すのは `/api/me`・`/api/account/resume`・`DELETE /api/account` だけ
    （`requireUser(event, { allowWithdrawn: true })`）。新しい API を足すときは何もしなくてよい（既定で止まる）。
  - お休みでは **Firebase のアカウントを消さない**（uid が変わると再開したデータとつながらないため）。
    `ensureUser` の「同じメールなら既存の行を使う」救済は、お休み中の行には**使わない**（5年のあいだにメールの持ち主が変わりうる。uid が違えば 409）。
  - 5年を過ぎたデータは **管理画面から手動で消す**（Cron が使えないため。`purgeExpiredUser`。期限前は消せない）。管理画面の「お休み中」に期限切れの人数が出る。
  - 期限切れ前の通知メールは出せない（メール送信の仕組みが無い）。規約・プライバシーポリシーにもそう書いてある。
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
wrangler secret put NUXT_ANTHROPIC_API_KEY
wrangler secret put NUXT_ENCRYPTION_KEY       # 32文字以上。ai-tools とは別の鍵
wrangler secret put NUXT_STRIPE_SECRET_KEY
wrangler secret put NUXT_STRIPE_WEBHOOK_SECRET
wrangler secret put NUXT_STRIPE_PRICE_ID
```

デプロイは main への push で GitHub Actions（`.github/workflows/deploy-kikigaki.yml`）が行う。
