# genogram

家族構成と感情的な関係性を入力すると、ジェノグラム(家系図+感情関係図)をSVGでその場に描画するツール。
自然文で家族構成を説明するとAI(Claude)がJSONを作成・更新する機能を持つため、
Cloudflare Workers(Nitro)上で動く。データはどこにも保存せず、AIへの一時的な問い合わせのみ行う。

## 使い方

画面全体がジェノグラムのプレビュー。上部の細いツールバーからポップアップで操作する。

1. 「AIに伝える」ポップアップのテキスト欄に家族構成や感情的な関係性を自然文で入力して「送信」
   (Cmd/Ctrl+Enterでも送信可)→ AIがJSON(フォーマットは後述)を作成・更新する。送信するとテキスト欄は空になる
2. 「JSONを見る」ポップアップでJSONを直接編集することもできる(貼り付け・手打ちどちらも可)。
   ここに「クリア」ボタンもある(確認後、本人・両親・祖父母だけの初期状態に戻す。空にはしない)
3. 図の人物・婚姻線・感情関係線はクリックすると詳細の確認・編集ができるポップアップが開く
   (ポップアップは Esc でも閉じられる)
4. 人物のポップアップ左下の「この人物を削除」で削除できる。確認ダイアログに、巻き添えで消える
   婚姻線・親子の線・関係線が列挙される。子のいる配偶者を削除した場合だけは、残された親と子の
   つながりを保つため婚姻線を残し、削除した側を「(配偶者不明)」に置き換える
   (その「(配偶者不明)」自体を削除すると、今度は婚姻線ごと消える)
5. 「SVGをダウンロード」「PNGをダウンロード」で保存
6. 「共有リンクをコピー」でJSONをURLハッシュに埋め込んだリンクを発行できる(サーバー保存なし)

JSONは `localStorage` に自動保存され、リロード時に復元される。初回表示時(保存データが無い場合)は
本人・両親・祖父母(祖父母4人)だけの3世代の下書きが自動的に入る。「クリア」もこの下書きに戻す動作で、
空にはならない。

## データフォーマット

```ts
type Gender = 'M' | 'F' | 'U'

interface Person {
  id: string
  name: string
  gender: Gender
  generation?: number // 省略時は unions.children から自動算出
  deceased?: boolean // 没年不明でも故人と分かっている場合
  isSelf?: boolean // 二重線枠で強調。1人まで
  birthYear?: number // 記号の中央に年齢(享年/満年齢)、記号の下に名前の次の行で 1950~2020 のように表示
  deathYear?: number // 指定すると自動的に故人(×印+享年)として扱う
  occupation?: string // note と合わせて記号の上に20文字程度の要約(職業・特徴)として表示
  healthNote?: string // 記号の隅に赤い「+」印。ホバー/タップで内容を表示
  note?: string // 人物像(気づき・エピソード・関係性の背景など)。詳細パネルでは「人物像」として最上部に表示する主要項目
}

type UnionStatus = 'married' | 'divorced' | 'separated' | 'distant' | 'conflict'

interface Union {
  partners: [string, string]
  status: UnionStatus
  children?: string[]
  startYear?: number // 婚姻/関係開始年。partnersの記号中央に(結婚年齢)として反映される
  endYear?: number // 離婚・別居など終了年
  note?: string
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

図に出す情報はあえて絞っている。人物の記号は上から順に「特徴の要約(職業・note、20文字程度)」→
「記号本体(中央に年齢。死亡していれば享年、生存なら満年齢。その下に(結婚年齢))」→「名前」→
「生涯(1950~2020のように)」の並び。婚姻線・感情関係線の種類は線のスタイル(実線/破線/ジグザグ/波線)だけで示し、
`note`・`label` などの文章はグラフには出さずクリックした詳細パネルでのみ見せる(長い文章でグラフが
横長・縦長になるのを避けるため)。線にカーソルを合わせるとラベルがツールチップで見られる。
`birthYear`/`deathYear`/`occupation`/`healthNote` のいずれも入っていない人物には、
図の隅に薄いグレーの点線「+」印が自動で付く。これは入力ミスではなく「まだ情報を追加できます」という合図で、
該当フィールドを埋めると消える。

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

- レイアウト計算(世代の自動算出・クラスタ配置・バスライン)は `src/composables/useGenogramLayout.ts` に集約。
  兄弟が複数人いる場合、親からの縦線は生まれ順で真ん中の子へ下ろす(偶数人なら中央2人の中間)。
  兄弟グループが上の世代より横長になり左マージンをはみ出す場合は、上の世代ごと右へずらして中央を合わせる
- 人物の年齢・生涯・特徴要約の算出/整形は `src/utils/personDisplay.ts` に集約(享年/満年齢・結婚年齢の計算含む)
- JSONの構造検証(id参照・必須項目)は `src/utils/validateGenogram.ts`(サーバー側のAI応答検証にも再利用)
- 循環参照(親子関係のループ)の検出は `useGenogramLayout.ts` 側で行う
- 描画は `src/components/GenogramSvg.vue` が担当し、`GenogramData` を受け取って内部でレイアウトを計算する。
  人物・婚姻線・感情関係線のクリックは `select` イベントで親(`index.vue`)へ伝え、`DetailPanel.vue` が
  編集フォームを表示する(保存すると裏でJSON全体を作り直して反映)
- `AiPopup.vue` / `JsonPopup.vue` / `DetailPanel.vue` はいずれも共通の `Modal.vue`(背景+カード)を土台にしている
- 初期表示・「クリア」で入る本人+両親+祖父母の下書きは `src/utils/defaultTemplate.ts`
- AIによるテキスト→JSON変換は `src/server/api/interpret.post.ts`。現在のJSONと新しい説明文をClaudeに渡し、
  既存の人物・関係はidを再利用しつつ更新後のGenogramData全体を生成させる(ai-toolsの`server/utils/anthropic.ts`と
  同じ `callClaudeText`/`parseJsonLoose` パターンをこのアプリ用に複製している)。AIがunions/relationsで
  参照したidをpeopleに追加し忘れた場合の自動補完(`fillMissingPeople`)も同ファイルにある
- ノードのドラッグによる手動微調整は未実装(将来的に `LayoutNode` の座標に手動オフセットを重ねる形で拡張可能)
