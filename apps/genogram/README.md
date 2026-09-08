# genogram

家族構成と感情的な関係性を入力すると、ジェノグラム(家系図+感情関係図)をSVGでその場に描画するツール。
自然文で家族構成を説明するとAI(Claude)がJSONを作成・更新する機能を持つため、
Cloudflare Workers(Nitro)上で動く。データはどこにも保存せず、AIへの一時的な問い合わせのみ行う。

## 使い方

1. 左上のテキスト欄に家族構成や感情的な関係性を自然文で入力して「送信」(Cmd/Ctrl+Enterでも送信可)
   → AIが下のJSON(フォーマットは後述)を作成・更新する。送信するとテキスト欄は空になる
2. JSONは直接編集することもできる(貼り付け・手打ちどちらも可)
3. 右側に自動でジェノグラムSVGが描画される(JSON入力から300ms後に再計算)
4. 「SVGをダウンロード」「PNGをダウンロード」で保存
5. 「共有リンクをコピー」でJSONをURLハッシュに埋め込んだリンクを発行できる(サーバー保存なし)

JSONは `localStorage` に自動保存され、リロード時に復元される。デフォルトのサンプルデータはない
(初回は空の状態から、テキストかJSONの入力で始める)。

## データフォーマット

```ts
type Gender = 'M' | 'F' | 'U'

interface Person {
  id: string
  name: string
  gender: Gender
  generation?: number // 省略時は unions.children から自動算出
  deceased?: boolean
  isSelf?: boolean // 二重線枠で強調。1人まで
  note?: string
}

type UnionStatus = 'married' | 'divorced' | 'separated' | 'distant' | 'conflict'

interface Union {
  partners: [string, string]
  status: UnionStatus
  children?: string[]
}

type RelationType = 'conflict' | 'cutoff' | 'enmeshed' | 'close' | 'distant'

interface Relation {
  from: string
  to: string
  type: RelationType
  label?: string
}

interface GenogramData {
  people: Person[]
  unions: Union[]
  relations: Relation[]
}
```

## 環境変数

AIによるテキスト解釈(`POST /api/interpret`)に Anthropic の Claude API を使う。
`apps/genogram/.env` に設定する:

```
NUXT_ANTHROPIC_API_KEY=...
```

本番(Cloudflare Workers)ではシークレットとして登録する:

```bash
wrangler secret put NUXT_ANTHROPIC_API_KEY
```

## ローカル開発

モノレポのルートから:

```bash
yarn dev:genogram   # http://localhost:3008
```

このワークスペース単体では:

```bash
cd apps/genogram
yarn dev
```

## ビルド・デプロイ(Cloudflare Workers)

```bash
yarn build:genogram   # モノレポルートから。apps/genogram/.output に出力
cd apps/genogram
wrangler deploy       # Cloudflare Workersへデプロイ
```

`wrangler dev` でCloudflare Workersランタイムのエミュレーション上で動作確認もできる
(`.env` のシークレットを読み込む)。

Nitroの `cloudflare_module` プリセットを使っているため、静的ホスティング(Vercel/Netlify等)には
そのままデプロイできない(AI解釈のAPIルートがサーバー実行を必要とするため)。

## 実装メモ

- レイアウト計算(世代の自動算出・クラスタ配置・バスライン)は `src/composables/useGenogramLayout.ts` に集約
- JSONの構造検証(id参照・必須項目)は `src/utils/validateGenogram.ts`(サーバー側のAI応答検証にも再利用)
- 循環参照(親子関係のループ)の検出は `useGenogramLayout.ts` 側で行う
- 描画は `src/components/GenogramSvg.vue` が担当し、`GenogramData` を受け取って内部でレイアウトを計算する
- AIによるテキスト→JSON変換は `src/server/api/interpret.post.ts`。現在のJSONと新しい説明文をClaudeに渡し、
  既存の人物・関係はidを再利用しつつ更新後のGenogramData全体を生成させる(ai-toolsの`server/utils/anthropic.ts`と
  同じ `callClaudeText`/`parseJsonLoose` パターンをこのアプリ用に複製している)
- ノードのドラッグによる手動微調整は未実装(将来的に `LayoutNode` の座標に手動オフセットを重ねる形で拡張可能)
