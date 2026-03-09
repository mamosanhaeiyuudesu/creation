# AI Tools (Nuxt 3)

複数の AI ツールを統合した Nuxt 3 アプリです。画像要約（SnapReader）と音声文字起こし（Whisper）を備えています。Cloudflare Workers へのデプロイ設定付き。

## セットアップ

- Node.js 18+ を想定。
- 依存インストール: `npm install`
- 環境変数: `.env` を作成し、ローカル用に `OPENAI_API_KEY=` を設定（テンプレは `.env.example`）。Cloudflare では `wrangler secret put OPENAI_API_KEY` でシークレット登録します。

## 開発

- ローカル起動: `npm run dev`
- PC（1024px以上）：ヘッダーにタブナビゲーション
- モバイル（1023px以下）：左上のハンバーガーメニューでツール選択

### SnapReader
- 画像をアップロードまたは撮影
-. `.env` に `OPENAI_API_KEY` をセット。
2. `npm run dev` で起動。
3. ホームページからツール（SnapReader / Whisper）を選択。

### SnapReader 確認
- 画像をアップロードまたはカメラで撮影。
- 「要約を依頼する」を押下。
- 全文書き起こし → 要約が表示されることを確認。

### Whisper 確認
- 「🎙️」ボタンで録音開始。
- 再度ボタンをクリックして文字起こし実行。
- 日本語テキストが表示され
### Whisper
- 音声を録音
- OpenAI の Whisper-1 で日本語に文字起こし
- API エンドポイント：`/api/whisper`

## 動作確認

1) `.env` に `OPENAI_API_KEY` をセット。  
2) `npm run dev` で起動。  
3) 画像をアップロードまたはカメラで撮影し、「要約を依頼する」を押下。  
4) 要約がカード内に表示されること、エラー時にメッセージが出ることを確認。

## Cloudflare Workers デプロイ

- Nitro は `preset: 'cloudflare'`。ビルドで `.output/` を生成し、Wrangler でデプロイします。
- シークレット登録: `wrangler secret put OPENAI_API_KEY`
- ビルド: `npm run build`
- デプロイ: `wrangler deploy`

`wrangler.toml` で `compatibility_date` や `name` は適宜変更可能です。`[vars]` には秘密鍵を置かず、シークレットで管理してください。
