import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { validateGenogramData } from '~/utils/validateGenogram'
import type { GenogramData } from '~/types/genogram'

// 自由なテキストの説明を、現在のGenogramData JSONへ反映(追加・更新)する。
// あくまで下書きの生成であり、DBには何も保存しない(データはブラウザのtextarea/localStorageのみで完結)。

const SYSTEM = `あなたはジェノグラム(家系図+感情関係図)作成ツールのアシスタントです。
ユーザーが自然な日本語で説明した家族構成や感情的な関係性を、以下のJSON形式(GenogramData)に変換・反映してください。

型定義:
- Person: { id: string(半角英数字・一意), name: string, gender: "M"|"F"|"U"(男性/女性/不明。性別が明言・推測できないときはU), generation?: number(省略可。世代が上がるほど大きい整数。祖父母=0, 親=1, 本人=2のように。unions.children による親子関係で世代が特定できるなら省略してよい), deceased?: boolean(没年が分からないが故人だと分かっている場合のみ), isSelf?: boolean(相談者本人。ユーザーが「私」「自分」「相談者」等と明示的に言った人物にのみtrueにする。誰が本人か明言されていなければ、全員falseのままにし勝手に推測しない。trueは最大1人まで), birthYear?: number(生年・西暦), deathYear?: number(没年・西暦。指定すると自動的に故人として扱われる), occupation?: string(職業), healthNote?: string(疾患・健康上の注記。例:"2型糖尿病","うつ病で通院中"), note?: string(その他の重要な出来事など短い注記) }
- Union: { partners: [id, id](夫婦・パートナーのidを2つ), status: "married"|"divorced"|"separated"|"distant"|"conflict", children?: string[](その夫婦の子のid配列), startYear?: number(結婚・関係開始の年・西暦), endYear?: number(離婚・別居など関係終了の年・西暦), note?: string(短い注記) }
- Relation: { from: id, to: id, type: "conflict"|"cutoff"|"enmeshed"|"close"|"distant", label?: string(関係を表す短い日本語、例:"疎遠","対立","絶縁","べったり") }
- GenogramData: { people: Person[], unions: Union[], relations: Relation[] }

ルール:
1. 「現在のJSON」に既にある人物・婚姻・関係は、ユーザーの新しい説明と矛盾しない限りそのまま保持する。削除するのはユーザーが明示的に「消して」「いなかったことに」等と言った場合だけ。
2. 説明に出てくる人物が既存データに既にいるなら、既存の id をそのまま再利用する(名前の表記ゆれや「お父さん」「長男」のような呼称も文脈から既存人物に結びつけ、重複して作らない)。
3. 新しい人物には他と衝突しない新しいid(ローマ字や連番)を割り振る。
4. 「仲が悪い」「絶縁」「べったり」「疎遠」「ぶつかる」のような感情表現は relations の type (conflict/cutoff/enmeshed/close/distant) に対応づけ、label に短い日本語を入れる。
5. 結婚・離婚・別居・疎遠・不仲などの夫婦の状態は unions の status に対応づける。
6. 生年・没年・年齢・職業・病気/持病・結婚/離婚した年など、ジェノグラムとして本来重要な情報が説明文の中にあれば、対応するフィールド(birthYear/deathYear/occupation/healthNote/startYear/endYear)に必ず反映する。年齢しか分からない場合は、説明文中や現在日時から西暦の生年を逆算してbirthYearに入れてよい。
7. 推測でむやみに人物や関係、上記6の詳細情報を作らない。説明されていないことは追加しない(空欄のままにする)。
8. 出力は説明文やコードブロック記号(\`\`\`)を一切付けず、GenogramData の JSON オブジェクトのみ。`

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

  const { data, errors } = validateGenogramData(parsed)
  if (!data) throw createError({ statusCode: 502, statusMessage: `AIが生成したデータが不正でした: ${errors[0] ?? '不明なエラー'}` })

  return { data }
})
