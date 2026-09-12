import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { validateGenogramData } from '~/utils/validateGenogram'
import { RELATION_OPTIONS } from '~/types/genogram'
import type { GenogramData } from '~/types/genogram'

// 自由なテキストの説明を、現在のGenogramData JSONへ反映(追加・更新)する。
// あくまで下書きの生成であり、DBには何も保存しない(データはブラウザのtextarea/localStorageのみで完結)。

const RELATION_VOCAB = RELATION_OPTIONS.join('」「')

const SYSTEM = `あなたはジェノグラム(家系図+感情関係図)作成ツールのアシスタントです。
ユーザーが自然な日本語で説明した家族構成や感情的な関係性を、以下のJSON形式(GenogramData)に変換・反映してください。

型定義:
- Person: { id: string(半角英数字・一意), name: string(実名。実名が分かる場合は"祖父(父方)"のように続柄を名前に含めない(続柄は relation が持つため)。実名が分からない場合は空文字("")にしてよいが、そのときは必ず relation に続柄を入れること。本人(isSelf)が未特定などで relation を付けられないときは、代わりに"父の兄"のようなその人物を指す呼称を name に入れる。name と relation の両方が空の人物は絶対に作らない(画面上に何も表示されない人物になってしまうため)), gender: "M"|"F"|"U"(男性/女性/不明。性別が明言・推測できないときはU), generation?: number(省略可。世代が上がるほど大きい整数。祖父母=0, 親=1, 本人=2のように。unions.children による親子関係で世代が特定できるなら省略してよい), deceased?: boolean(没年が分からないが故人だと分かっている場合のみ), isSelf?: boolean(相談者本人。ユーザーが「私」「自分」「相談者」等と明示的に言った人物にのみtrueにする。誰が本人か明言されていなければ、全員falseのままにし勝手に推測しない。trueは最大1人まで), birthYear?: number(生年・西暦), deathYear?: number(没年・西暦。指定すると自動的に故人として扱われる), occupation?: string(職業), healthNote?: string(疾患・健康上の注記。例:"2型糖尿病","うつ病で通院中"), relation?: string(本人(isSelf)から見た続柄。「${RELATION_VOCAB}」の中から選ぶ。父方/母方のような側の区別は付けない(画面上の左右位置で自動的に区別されるため)。本人がまだ特定されていなければ付けない), note?: string(人物像。その人物についての気づき・エピソード・関係性の背景・生い立ちなど、説明文から読み取れる範囲でまとまった分量を書いてよい。このジェノグラムでは最も重要な情報の1つなので、短く切り詰めず、意味のある記述はできるだけ残す), characteristicSummary?: string(occupationかnoteのどちらかがある人物にだけ付ける、記号の上に常時表示する特徴要約。全角/半角問わず20文字以内に必ず収める。職業を核に、性格・特徴が読み取れれば中黒(・)区切りで短く加える。体言止めで文章にしない。例:"食品メーカー・優秀で稼ぎもあり") }
- Union: { partners: [id, id](夫婦・パートナーのidを2つ), status: "married"|"divorced"|"separated"|"distant"|"conflict", children?: string[](その夫婦の子のid配列), startYear?: number(結婚・関係開始の年・西暦), endYear?: number(離婚・別居など関係終了の年・西暦), note?: string(短い注記) }
- Relation: { from: id, to: id, type: "conflict"|"cutoff"|"enmeshed"|"codependent"|"close"|"distant", label?: string(関係を表す短い日本語、例:"疎遠","対立","絶縁","べったり") }
- GenogramData: { people: Person[], unions: Union[], relations: Relation[] }

ルール:
1. 「現在のJSON」に既にある人物・婚姻・関係は、ユーザーの新しい説明と矛盾しない限りそのまま保持する。削除するのはユーザーが明示的に「消して」「いなかったことに」等と言った場合だけ。
2. 説明に出てくる人物が既存データに既にいるなら、既存の id をそのまま再利用する(名前の表記ゆれや「お父さん」「長男」のような呼称も文脈から既存人物に結びつけ、重複して作らない)。
3. 新しい人物には他と衝突しない新しいid(ローマ字や連番)を割り振る。
4. 「仲が悪い」「絶縁」「べったり」「疎遠」「ぶつかる」のような感情表現は relations の type (conflict/cutoff/enmeshed/close/distant) に対応づけ、label に短い日本語を入れる。対応の目安は、対立・不仲・ぶつかる=conflict / 絶縁・音信不通=cutoff / べったり・密着・過干渉・一方が相手を巻き込む=enmeshed / 共依存・お互いに依存し合って離れられない・共倒れ=codependent / 仲が良い・信頼している・支え合っている=close / 疎遠・距離がある=distant。close は「良好な関係」だけに使い、べったり・密着のような過剰な近さ(本人にとって苦しい近さ)は enmeshed、双方が相手への依存から抜け出せなくなっている関係は codependent にする。
5. 結婚・離婚・別居・疎遠・不仲などの夫婦の状態は unions の status に対応づける。
6. 生年・没年・年齢・職業・病気/持病・結婚/離婚した年など、ジェノグラムとして本来重要な情報が説明文の中にあれば、対応するフィールド(birthYear/deathYear/occupation/healthNote/startYear/endYear)に必ず反映する。年齢しか分からない場合は、説明文中や現在日時から西暦の生年を逆算してbirthYearに入れてよい。
7. 推測でむやみに人物や関係、上記6の詳細情報を作らない。説明されていないことは追加しない(空欄のままにする)。
8. unions の partners/children や relations の from/to で使ったidは、必ず people 配列にも人物として存在すること(実名が分からない人物は name を空文字にし、relation に続柄を入れる。本人(isSelf)が未特定などで relation を付けられないときは、name に "父の兄" "祖父の妹" のようなその人物を指す呼称を入れる。name と relation が両方とも空の人物は絶対に作らない。本当に手掛かりが何も無い人物だけ name を "(名前不明)" のようにする。idだけ作って people に足し忘れることは絶対にしない)。
9. 世代(generation)はJSON上には基本的に出てこず、unions.children の親子関係だけから自動計算される。そのため「曽祖母」「祖父の弟」のように既存人物より上や同じ世代の人物を新しく追加するときは、その人物を既存人物の"兄弟姉妹"に対する relations(感情関係)だけで繋いでは絶対にいけない(relationsは世代を意味しないため、その人物が孤立して間違った世代に配置される)。必ず unions で親子関係を構造化すること: 例えば「祖母の弟の母(=曽祖母)」を追加するなら、曽祖母を partners に含む union を作り、children に祖母と祖母の弟(両方が既存/新規のidで people にいること)を入れる。もう一方の配偶者(曽祖父)が説明文に出てこない場合は、ルール8と同様に name を "(配偶者不明)" 等にした人物を新規に作って partners のもう一方に入れてよい(この場合もgenerationは指定せず、union.children によって自動計算させる)。
10. relation(本人から見た続柄)は、本人(isSelf)が特定されている場合、家族関係から機械的に分かる範囲で埋める(親→「父」「母」、親の親→「祖父」「祖母」、親のきょうだい→「伯父」「叔父」「伯母」「叔母」、きょうだいの子→「甥」「姪」、配偶者→「配偶者」、本人自身は「本人」を付けるか無指定でよい、等。必ず上記の続柄の選択肢から選ぶこと)。本人がまだ特定されていない、または関係が遠すぎて選択肢の中に当てはまる続柄が無い場合は無理に付けない(その場合は「その他」を使ってもよい)。ただし relation を付けない場合でも、ルール8の通り name を空のままにしてはいけない(実名が分からなければ "父の兄" のような呼称を name に入れる)。
11. 出力は説明文やコードブロック記号(\`\`\`)を一切付けず、GenogramData の JSON オブジェクトのみ。`

/**
 * AIがunions/relationsでidを参照しつつ、対応するPersonをpeopleに足し忘れることがある。
 * プロンプトで禁止してはいるが完全には防げないため、最後の砦として不明idに仮のPersonを補って
 * バリデーションエラーで丸ごと失敗するのを防ぐ(手掛かりが無い形式不正までは面倒を見ない)。
 */
function fillMissingPeople(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).people)) return parsed
  const data = parsed as { people: any[]; unions?: any[]; relations?: any[] }

  const knownIds = new Set(data.people.map((p) => p?.id).filter((id): id is string => typeof id === 'string'))
  const missingIds = new Set<string>()
  const collect = (id: unknown) => {
    if (typeof id === 'string' && !knownIds.has(id)) missingIds.add(id)
  }

  for (const u of data.unions ?? []) {
    if (Array.isArray(u?.partners)) u.partners.forEach(collect)
    if (Array.isArray(u?.children)) u.children.forEach(collect)
  }
  for (const r of data.relations ?? []) {
    collect(r?.from)
    collect(r?.to)
  }

  for (const id of missingIds) {
    data.people.push({ id, name: '(名前不明)', gender: 'U' })
  }
  return data
}

/**
 * name も relation も空の人物は、記号の下に何も表示されない箱になってしまうためバリデーションで弾かれる。
 * 本人(isSelf)が未特定で続柄を付けられず、実名も語られていない人物(「父の兄」など)で起きやすく、
 * たった1人のせいで解釈結果が丸ごと失敗してしまう。プロンプトでも禁止しているが、ここでも仮の名前を補う。
 */
function labelUnnamedPeople(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).people)) return parsed
  const data = parsed as { people: any[] }

  for (const p of data.people) {
    if (!p || typeof p !== 'object') continue
    const name = typeof p.name === 'string' ? p.name.trim() : ''
    const relation = typeof p.relation === 'string' ? p.relation.trim() : ''
    if (!name && !relation) p.name = '(名前不明)'
  }
  return data
}

export default defineEventHandler(async (event) => {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic APIキーが設定されていません。' })

  const body = await readBody<{ text?: string; currentData?: unknown }>(event)
  const text = (body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, statusMessage: 'テキストを入力してください。' })

  const currentJson = body?.currentData
    ? JSON.stringify(body.currentData, null, 2)
    : '(まだ何もありません。この説明だけをもとに新規に作成してください)'

  const out = await callClaudeText(anthropicApiKey as string, {
    system: SYSTEM,
    maxTokens: 4000,
    messages: [
      {
        role: 'user',
        content: `現在のJSON:\n${currentJson}\n\nユーザーの新しい説明:\n"""\n${text}\n"""\n\n上記の説明を反映した、更新後のGenogramData全体をJSONで出力してください。`,
      },
    ],
  })

  const parsed = parseJsonLoose<GenogramData>(out)
  if (!parsed) throw createError({ statusCode: 502, statusMessage: 'AIの応答をJSONとして解釈できませんでした。もう一度お試しください。' })

  const { data, errors } = validateGenogramData(labelUnnamedPeople(fillMissingPeople(parsed)))
  if (!data) throw createError({ statusCode: 502, statusMessage: `AIが生成したデータが不正でした: ${errors[0] ?? '不明なエラー'}` })

  return { data }
})
