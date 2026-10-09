# キキガキ本番版 残作業メモ

最終更新: 2026-10-09

## 済んでいること

- [x] Firebase プロジェクト（`production-d9ad2`）／Google・メールリンクの有効化／承認済みドメインに本番ドメイン追加
- [x] D1 `kikigaki-db` 作成（`a7388a1c-f537-4c74-a623-55d78036131c`）＋ `001_init.sql` 適用（6テーブル）
- [x] Cloudflare Workers へデプロイ（GitHub Actions）。https://kikigaki.insightlens.jp/ が応答
- [x] シークレット登録: `NUXT_OPENAI_API_KEY` / `NUXT_ANTHROPIC_API_KEY` / `NUXT_ENCRYPTION_KEY`
- [x] 暗号化鍵の控え（本人が保管済み。**失うと本番の議事録が復号できない**）

---

## 1. 本番の動作確認（次にやること）

スマホで https://kikigaki.insightlens.jp/ を開いて一周する。

- [ ] Googleログインが通る
- [ ] いったんログアウトし、**同じメールアドレス**でメールのリンクからログインできる
- [ ] 両方でログインしたとき、議事録の一覧が同じに見える（＝同一ユーザーとして扱われている）
- [ ] 短い録音（1〜2分）から議事録ができる
- [ ] 確認画面で直せる／「AIに直してもらう」が効く
- [ ] PDFがダウンロードできる

うまくいかないときのログ: `cd apps/production/kikigaki && npx wrangler tail`

## 2. 法務ページの本文（お客さんに案内する前に）

いまは「（後日記載）」と「この文面は雛形です」が出たまま公開されている。

- [ ] 利用規約（`src/pages/terms.vue` の `sections`）
- [ ] プライバシーポリシー（`src/pages/privacy.vue` の `sections`）
- [ ] 特定商取引法に基づく表記 → 値は `src/config/service.ts` の `legal`（事業者名・代表者・所在地・連絡先・返品等）
- [ ] 本文を入れ終えたら `src/config/service.ts` の `legalDraft` を `false` に

## 3. Stripe（有料化の前まで。モニター期間中は不要）

- [ ] 商品と月額の価格を1つ作る（金額は `src/config/service.ts` の `priceLabel` と揃える）
- [ ] Customer Portal を有効化（解約・支払い方法の変更をここに任せている）
- [ ] webhook の宛先に `https://kikigaki.insightlens.jp/api/stripe/webhook` を登録し、
      `checkout.session.completed` / `customer.subscription.created|updated|deleted` / `invoice.payment_failed` を購読
- [ ] シークレット3つを登録:
      `wrangler secret put NUXT_STRIPE_SECRET_KEY` / `NUXT_STRIPE_WEBHOOK_SECRET` / `NUXT_STRIPE_PRICE_ID`
- [ ] テストモードで 課金 → webhook受信 → 契約状態の反映 → 解約 まで一周
      （ローカルなら `stripe listen --forward-to localhost:3009/api/stripe/webhook`）

## 4. 有料化に切り替えるとき（2027年4月ごろの想定）

- [ ] `wrangler.toml` の `[vars]` の `NUXT_PUBLIC_MONITOR_MODE` を `"false"` にして push
- [ ] **金額を変えるなら利用上限も一緒に見直す**（`src/config/service.ts` の `limits`。
      AI代は1時間の会議で約70円。月額300円なら3時間/月が原価の目安）
- [ ] バナーの文言・有料化時期（`monitorNoticeTemplate` / `paidStartLabel`）を実態に合わせる

## 5. いつかやること（急がない）

- [ ] アカウント削除の導線（要件外で未実装。個人情報を預かる以上あったほうがよい。
      いまは議事録1件ごとの削除のみ）
- [ ] ローカルの `.env` の `NUXT_ENCRYPTION_KEY` はダミーのまま。
      ローカルで作ったデータと本番のデータは互いに読めない（意図した分離）
- [ ] GitHub Actions の Cloudflare API トークンに D1 の権限が無い。
      いまは `wrangler.toml` に `database_id` を直書きして回避しているので支障はないが、
      名前で D1 を引く操作をCIでやると `Authentication error [code: 10000]` になる
