# キキガキ本番版 残作業メモ

最終更新: 2026-10-17

## 済んでいること

- [x] Firebase プロジェクト（`production-d9ad2`）／Google・メールリンクの有効化／承認済みドメインに本番ドメイン追加
- [x] D1 `kikigaki-db` 作成（`a7388a1c-f537-4c74-a623-55d78036131c`）＋ `001_init.sql` 適用（6テーブル）
- [x] Cloudflare Workers へデプロイ（GitHub Actions）。https://kikigaki.insightlens.jp/ が応答
- [x] シークレット登録: `NUXT_ANTHROPIC_API_KEY` / `NUXT_ENCRYPTION_KEY`
- [x] 暗号化鍵の控え（本人が保管済み。**失うと本番の議事録が復号できない**）

---

## 0. いまの変更を本番に反映する（2026-10-17 時点で未コミット）

- [ ] 管理画面・課金の判定・PDFの文字数の設定・退会・法務ページの本文をコミットして push
      （push で GitHub Actions がデプロイする。新しい表 `user_settings` / `user_grants` / `admin_audit` は
      ログイン時の ensureTables で自動で作られるので、D1 のマイグレーションは不要）

## 0.6 セキュリティの確認（2026-10-17 の点検で出たもの。本人の作業）

- [ ] Cloudflare と GitHub のアカウントに2段階認証がかかっているか確かめる
      （暗号化の鍵と D1 の両方に届く入口。ここが破られると全員の議事録が読める）
- [ ] `NUXT_ENCRYPTION_KEY` の控えがパスワード管理ソフトなどにあるか確かめる
      （Cloudflare からは取り出せない。失うと全員の議事録が読めなくなる。見つからなければ、
      いまの鍵が生きているうちに新しい鍵へ入れ替える作業ができる）
- [ ] Google Cloud で Firebase の API キーに使えるドメインの制限がかかっているか確かめる
- [ ] 済: 守りのヘッダー（埋め込み禁止など）・ファイル名の暗号化・プライバシーポリシーへの AI 側の保存期間の記載
      （2026-10-17 より前に作った議事録のファイル名は平文のまま残っている）
- [ ] いつか: スクリプトの読み込み元を絞る CSP（nonce が要る。ログイン・ドライブ・Stripe を全部試してから）

## 0.7 圧縮と保存容量（2026-10-17）

- 10/17 から、元の文章と議事録本体は gzip で縮めてから暗号化している（1件あたり約4分の1。ローカルで 97KB → 26KB）
- それより前の議事録は圧縮されないまま（読むのは問題ない）。**圧縮し直す機能は作らない**と本人が決定
  （鍵は本番のサーバーにしか無く、手元のコマンドではできないため）
- 管理画面の「保存容量（D1）」に使用量とあと何件入るかの目安が出る（無料プランは1データベースあたり 500MB。
  有料プランにしたら `src/server/api/admin/users/index.get.ts` の `D1_LIMIT_BYTES` を 10GB に直す）

## 0.5 承認制（2026-10-17 追加。モニター期間中の AI 代を抑えるため）

- URLを知っていれば誰でも登録できるので、**新しく登録した人は管理画面で承認するまで議事録づくり・AIの直しを使えない**
  （管理者は承認なし）。承認待ちの人には「ただいま利用の準備中です」と出る
- [ ] ときどき管理画面の「承認待ち ◯人」を見て、知っている人なら「承認する」を押す（通知は無い。管理画面だけ）
- [ ] 保険として Anthropic のコンソールで月の使用額の上限を設定しておく（アプリとは別の最後の歯止め）

## 1. 本番の動作確認（次にやること）

スマホで https://kikigaki.insightlens.jp/ を開いて一周する。

- [ ] Googleログインが通る
- [ ] いったんログアウトし、**同じメールアドレス**でメールのリンクからログインできる
- [ ] 両方でログインしたとき、議事録の一覧が同じに見える（＝同一ユーザーとして扱われている）
- [ ] 短い文章（貼り付け）から議事録ができる
- [ ] 確認画面で直せる／「AIに直してもらう」が効く
- [ ] PDFがダウンロードできる

うまくいかないときのログ: `cd apps/production/kikigaki && npx wrangler tail`

## 2. 法務ページ（お客さんに案内する前に）

- [x] 利用規約・プライバシーポリシーの本文（2026-10-17。作りの事実に合わせて記入）
- [x] 特定商取引法の表記（事業者名 prototyper・連絡先 prototyper@insightlens.jp。
      代表者の氏名・所在地・電話番号は「請求があれば開示」）
- [ ] 文面を専門家に一度見てもらう（任意だが推奨）
- [x] `legalDraft` を `false` に（2026-10-17。「この文面は雛形です」の表示を消した）
- [ ] **開示の請求が来たら、氏名・住所・電話番号を遅滞なく返せるようにしておく**（返せない体制での省略は認められない）
- [ ] 規約第11条で「サービスを終えるときは1か月以上前に告知し、PDFを保存できる期間を設ける」と約束している

## 2.5 管理画面（/admin）を本番で使えるようにする（2026-10-16 追加）

- [x] `NUXT_ADMIN_UIDS` を本番に登録（2026-10-17。`trUDGvWEhFdCo0P4jmrYPB9OYid2`＝ローカルと同じ ID。
      本番の D1 で確かめようとしたが wrangler の認証が 7403 で通らず、確認を飛ばして登録した。
      本番で /admin が 404 になったら ID が違うので、下のコマンドで調べ直して登録し直す）
- [ ] （ID が違ったときだけ）自分の users.id を調べる（最初にログインしたときの Firebase UID。メールで探す）:
      `npx wrangler d1 execute kikigaki-db --remote --command "SELECT id, email FROM users WHERE email = '自分のアドレス'"`
- [ ] （同上）`npx wrangler secret put NUXT_ADMIN_UIDS` にその id を入れる（複数ならカンマ区切り）。リポジトリには載せない
- [ ] 本番で左メニューに「管理画面」が出て、/admin が開けることを確かめる
      （管理者でない人には 404。表 `user_grants` / `admin_audit` はログイン時に自動で作られる）

## 3. Stripe（有料化の前まで。モニター期間中は不要）

- [ ] 商品と月額の価格を1つ作る（金額は `src/config/service.ts` の `priceLabel` と揃える）
- [ ] Customer Portal を有効化（解約・支払い方法の変更をここに任せている）
- [ ] webhook の宛先に `https://kikigaki.insightlens.jp/api/stripe/webhook` を登録し、
      `checkout.session.completed` / `customer.subscription.created|updated|deleted` / `invoice.payment_failed` を購読
- [ ] シークレット3つを登録:
      `wrangler secret put NUXT_STRIPE_SECRET_KEY` / `NUXT_STRIPE_WEBHOOK_SECRET` / `NUXT_STRIPE_PRICE_ID`
- [ ] **引き落としに失敗したときの設定**（2026-10-16 決定: 請求し直している間＝past_due は使えるままにする）
      Billing → Revenue recovery → Retries で自動の再請求（Smart Retries）を有効にし、
      「すべて失敗したら」を **サブスクリプションをキャンセル** にする（ここで canceled になり使えなくなる）
- [ ] **本人へのメール**: Billing → Customer emails で「支払いの失敗」「カードの期限切れが近い」
      「無料期間がもうすぐ終わる」のメールを有効にする（画面の案内とは別に、気づいてもらうため）
- [ ] 無料期間は `src/config/service.ts` の `trialDays`（30日）。初めて契約する人だけに付く（2回目以降は付かない）
- [ ] テストモードで 課金 → webhook受信 → 契約状態の反映 → 解約 まで一周
      （ローカルなら `stripe listen --forward-to localhost:3009/api/stripe/webhook`）

## 4. 有料化に切り替えるとき（2027年4月以降。日付では自動で切り替わらない）

**この作業をしない限り、ずっと無料のまま**（`NUXT_PUBLIC_MONITOR_MODE` は手で変えるフラグ）。

### 1か月ほど前
- [ ] 3. の Stripe の準備をテストモードで一周し終えておく
      （確かめること: 「1か月無料ではじめる」→ カード登録 → 左メニューが「無料期間中」→
      テスト用の時計（Stripe の Test clock）で30日進めて引き落とし → 失敗するカードで「支払い遅れ」の案内 →
      解約で使えなくなる）
- [ ] 金額を決める（いまの仮置きは `priceLabel` = 月額500円）。**変えるなら利用上限 `limits` も一緒に見直す**
      （AI代は1時間の会議で約70円。上限1.8ドル＝約290円の根拠は service.ts のコメント）
- [ ] 規約・特商法の金額と無料期間の書き方が、決めた内容と合っているか確かめる
      （`legal.price` / `legal.payment` / 規約第4条は service.ts の値から入る部分と、文章で書いた部分がある）
- [ ] 上の帯のお知らせを日付入りにする（`monitorNoticeTemplate` / `paidStartLabel`）
      れい:「2027年4月1日から月額500円（最初の1か月は無料）になります」
- [ ] 無料のままにしたい人（家族・お世話になった人）に、管理画面で「支払い不要」を付けておく

### 切り替えの日
- [ ] **承認制を外す**（`src/config/service.ts` の `approvalRequired` を `false`）。外さないと、新しい人は
      お金を払う前に管理画面での承認待ちで止まる。外す前に、承認待ちの人を承認するか確認する
- [ ] Stripe を本番の鍵に替える（テストモードの値のままだと、本当の請求が起きない）:
      本番モードで商品・価格・webhook・Customer Portal・再請求とメールの設定を作り直し、
      `wrangler secret put NUXT_STRIPE_SECRET_KEY` / `NUXT_STRIPE_WEBHOOK_SECRET` / `NUXT_STRIPE_PRICE_ID` を本番の値で入れ直す
- [ ] `wrangler.toml` の `[vars]` の `NUXT_PUBLIC_MONITOR_MODE` を `"false"` にして push
- [ ] 帯の文言を有料化後のもの（または非表示）にする
- [ ] 本番で、自分以外のアカウント（支払い不要を付けていないもの）で「1か月無料ではじめる」まで通るか確かめる
- [ ] 管理画面の「契約中」「支払い遅れ」の数を数日見て、webhook が届いているか確かめる
      （届かないとき: Stripe のダッシュボードの webhook の配信ログと `npx wrangler tail`）

## 5. いつかやること（急がない）

- [x] アカウント削除の導線（2026-10-17。左メニュー →「アカウントを削除する」。契約があれば先に即時解約）
- [ ] 退会を本番で一度試す（試し用のアカウントで。データが消え、ログアウトされ、もう一度ログインすると空から始まること）
- [ ] ユーザーごとの用語の欄（旧 ai-tools 版の用語集にあたるもの。人名・地名の表記の精度が上がる）
- [ ] 確認画面で元の文章を見られるようにする（右からせり出す欄の案）
- [ ] ローカルの `.env` の `NUXT_ENCRYPTION_KEY` はダミーのまま。
      ローカルで作ったデータと本番のデータは互いに読めない（意図した分離）
- [ ] GitHub Actions の Cloudflare API トークンに D1 の権限が無い。
      いまは `wrangler.toml` に `database_id` を直書きして回避しているので支障はないが、
      名前で D1 を引く操作をCIでやると `Authentication error [code: 10000]` になる
