/**
 * miyako「直近の傾向」の AI 部分。会議録の本文から「具体的な話題」と、それを表す短い単語の候補を出させる。
 *
 * AI にやらせるのは語の切り出しだけで、回数は数えさせない（AI の言う回数は当てにならないため。
 * 数えるのは D1。miyako-trends.ts の countTermsBySession）。形態素解析を Worker でやらないのは
 * CPU 時間のため（43万字を Intl.Segmenter で分割すると手元で約96ms）。
 *
 * **語は2〜4字の単語にそろえる（カタカナ語だけ6字まで）**。最初は「名詞句」を出させていたが、会議録は
 * 正式名称で書かれるので「沖縄県消費生活センター宮古分室」のような長い語ばかりになり（平均7.8字）、
 * 他のタブ（年で見る・議員で見る＝形態素で平均2字）と見た目が揃わない、という指摘で2026-09-19に変えた。
 * **「2〜4文字で」と指示するだけでは AI は守らない**（実測: 22語中17語が長すぎた＝日本語の文字数を数えられない）。
 * そこで話題名（topic＝本文どおり・長くてよい）と短い単語（term）を別々に書かせ、term だけを使う
 * （実測: 使える語が22語中5語→14語。「日米共同訓練」→「共同訓練」、「うえのドイツ文化村」→「ドイツ文化村」）。
 * 短い語も本文にそのまま含まれるので数え方は変わらず、会議での短い呼び方も拾える。
 * 何の話かは右パネルの一文（note）で補う。
 *
 * 本文を分割して送るのは、定例会1回分（空白を詰めて約41.5万字）が約32万トークンあり、
 * このアカウントの gpt-4.1-mini の上限（1分あたり20万トークン）を1回で超えるため（実測）。
 * 分割すると後半の話題を読み落としにくくなる利点もある。
 */

const MODEL = 'gpt-4.1-mini'

/** 1回に送る文字数。約8万トークン＝1分あたり20万トークンの上限に2回ぶん収まる大きさ。 */
const CHUNK_CHARS = 110_000

/** 1つの分割から出させる語数。4分割なら22×4＝88語。5分割以上の長い会期は99語（D1 のバインド上限）で打ち切る。 */
const TERMS_PER_CHUNK = 22

/** レート上限（429）に当たったときのやり直し回数。 */
const MAX_ATTEMPTS = 6

const INSTRUCTIONS = `あなたは沖縄県宮古島市議会の会議録を読む編集者です。渡されるのは、ある会期の会議録の一部です（空白と改行は取り除いてあります）。
この部分で議員と市当局が実際に議論している具体的な話題を、最大${TERMS_PER_CHUNK}個選んでください。話題ごとに次の3つを書きます。

- topic: 話題の名前。本文どおりの表記で、長くてよい（例: 航空自衛隊宮古島分屯基地、日米共同訓練、うえのドイツ文化村）
- term: その話題を表す短い単語。ワードクラウドに大きく載せるので、漢字なら2〜4文字、カタカナ語なら6文字までの短い語にする。topic の一部か、本文に出てくる短い呼び方をそのまま使う（例: 分屯基地、共同訓練、文化村、南静園、宿泊税、クルーズ船）。「宮古島市」「沖縄県」は付けない
- note: その話題についてこの部分で何が議論されたかを、中学生にも分かる言葉で40字以内の一文で。議会・行政の専門用語は使わない

選ばないもの:
- 議会の手続きの言葉（議案、陳情、請願、答弁、質問、委員会、本会議、補正予算、一般質問、議長、市長、部長、課長、議員、休憩、再開、採決、可決、条例、改正 など）や、議案・条例・規則の名前（〜の一部変更、〜の一部改正、〜に関する条例、財産の取得、繰越明許費、陳情書、指定管理者の指定 など）。条例や議案が話題なら、その中身を表す語（例: 宿泊税、校舎改修）にする
- どの会期でも出てくる一般的な言葉（市民、本市、事業、予算、取り組み、状況、必要、課題、検討、対応、支援、推進、行政、計画、整備、確認 など）
- 人名
同じ話題の言い換えは1つにまとめる。`

const SCHEMA = {
  type: 'object',
  properties: {
    terms: {
      type: 'array',
      items: {
        type: 'object',
        properties: { topic: { type: 'string' }, term: { type: 'string' }, note: { type: 'string' } },
        required: ['topic', 'term', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: ['terms'],
  additionalProperties: false,
}

export interface TermCandidate {
  term: string
  note: string
}

/**
 * 議案・条例の名前や議事の手続きを表す語。指示で除外しても「陳情書」「議決内容の一部変更」
 * 「繰越明許費繰越計算書」「職員の給与に関する条例」が上位に来た（実測）ので、機械的にも落とす。
 */
const PROCEDURAL_TERM = /陳情|請願|議決|議案|繰越|専決|補正予算|一部変更|一部改正|財産の取得|会議規則|条例$|規則$/

/**
 * AI は英数字を半角で書くが、会議録は全角で書く（実測: 「生成ＡＩ」4回・「生成AI」0回。半角英字は
 * ページ区切りの印くらいしか無い）。本文と完全一致で数えるので、語の半角英数を全角にそろえる。
 */
const toFullWidth = (s: string) => s.replace(/[A-Za-z0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0))

/** 語の頭に付けてしまう自治体名（指示で外させても付いてくることがあるので機械的にも外す）。 */
const PLACE_PREFIX = /^(宮古島市|沖縄県|本市)/

/** 2〜4字、カタカナ語だけ6字まで（「サトウキビ」「人口ビジョン」は4字で切ると意味が崩れる）。 */
function isShortWord(term: string): boolean {
  if (term.length < 2) return false
  return term.length <= (/[ァ-ヶー]/.test(term) ? 6 : 4)
}

/**
 * 説明文の後始末。崩れた応答では、説明文の中に `}]}  Assistant has stopped speaking…` のような
 * 残骸が入り込んだ（実測）。JSON の閉じ括弧から後ろは捨て、それでも長すぎるものは説明なしにする。
 */
function cleanNote(note: string): string {
  const cut = note.split(/[{}\[\]]/)[0]!.trim()
  return cut.length > 80 ? '' : cut
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 429 の待ち時間。ヘッダー（retry-after-ms / retry-after）か、本文の「try again in 12.3s」から読む。 */
function retryDelayMs(res: Response, message: string): number {
  const ms = Number(res.headers.get('retry-after-ms'))
  if (ms > 0) return ms
  const sec = Number(res.headers.get('retry-after'))
  if (sec > 0) return sec * 1000
  const m = message.match(/try again in ([\d.]+)(ms|s)/)
  if (m) return m[2] === 'ms' ? Number(m[1]) : Number(m[1]) * 1000
  return 20_000
}

async function extractFromChunk(apiKey: string, chunk: string, spend: () => void): Promise<TermCandidate[]> {
  const body = JSON.stringify({
    model: MODEL,
    instructions: INSTRUCTIONS,
    input: chunk,
    temperature: 0.2,
    max_output_tokens: 3500, // 22話題×（話題名＋語＋40字の説明）で実測約1,200トークン。崩れて空白を出し続けたときの無駄を抑える
    text: { format: { type: 'json_schema', name: 'miyako_terms', strict: true, schema: SCHEMA } },
  })

  let broken = 0 // 読めない応答が返ってきた回数（429 の再試行とは別に数える）
  for (let attempt = 1; ; attempt++) {
    spend()
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
    })
    const data: any = await res.json().catch(() => null)
    const message = data?.error?.message ?? ''

    // 残高切れも 429 で返る（type=insufficient_quota）。待っても回復しないので、やり直さずに止める
    const outOfCredit = data?.error?.type === 'insufficient_quota'
    if ((res.status === 429 || res.status >= 500) && !outOfCredit && attempt < MAX_ATTEMPTS) {
      // 上限いっぱいまで待ち、少し余裕を足す（上限は1分あたりなので最長でも1分強で回復する）
      const wait = Math.min(Math.max(retryDelayMs(res, message), 3_000), 65_000) + 1_000
      console.log(`[miyako-trends] OpenAI ${res.status}、${Math.round(wait / 1000)}秒待って再試行（${attempt}回目）`)
      await sleep(wait)
      continue
    }
    if (outOfCredit) throw new Error(`OpenAI のクレジット残高がありません（${message}）`)
    if (!res.ok) throw new Error(`候補語の抽出に失敗（${res.status} ${message}）`.trim())

    const text: string =
      data?.output_text ??
      data?.output?.find((o: any) => o.type === 'message')?.content?.find((c: any) => c.type === 'output_text')?.text ??
      ''
    const terms = parseTerms(text)
    if (!terms.length && broken++ < 1) {
      // 空白や改行を出し続けて上限で切れる崩れ方が実際にあった（22語を書いたあと2000行以上の改行）。1回だけやり直す
      console.log(`[miyako-trends] 候補語が読めない応答（status=${data?.status}、${text.length}字）。やり直します`)
      continue
    }
    return terms
  }
}

/**
 * AI の応答から候補語を取り出す。JSON として壊れていても、最後まで書き切れている
 * {"term":…,"note":…} は拾う（途中で切れた応答を丸ごと捨てると、それまでの22語も失うため）。
 */
function parseTerms(text: string): TermCandidate[] {
  try {
    return (JSON.parse(text).terms ?? []) as TermCandidate[]
  } catch {
    const out: TermCandidate[] = []
    const str = '("(?:[^"\\\\]|\\\\.)*")'
    const obj = new RegExp(`\\{\\s*"topic"\\s*:\\s*${str}\\s*,\\s*"term"\\s*:\\s*${str}\\s*,\\s*"note"\\s*:\\s*${str}\\s*\\}`, 'g')
    for (const m of text.matchAll(obj)) {
      out.push({ term: JSON.parse(m[2]!), note: JSON.parse(m[3]!) })
    }
    return out
  }
}

/**
 * 本文全体から候補語を集める。分割ごとの候補を順番に交互に並べてから重複を除く
 * （上限で切るとき、前半の分割の語ばかりが残らないようにするため）。
 */
export async function extractTermCandidates(
  apiKey: string,
  text: string,
  opts: { maxTerms: number; spend: () => void }
): Promise<TermCandidate[]> {
  const parts = Math.max(1, Math.ceil(text.length / CHUNK_CHARS))
  const size = Math.ceil(text.length / parts)
  const perChunk: TermCandidate[][] = []
  for (let i = 0; i < parts; i++) {
    const found = await extractFromChunk(apiKey, text.slice(i * size, (i + 1) * size), opts.spend)
    console.log(`[miyako-trends] 候補語 ${i + 1}/${parts}: ${found.length}語`)
    perChunk.push(found)
  }

  const out = new Map<string, TermCandidate>()
  for (let i = 0; out.size < opts.maxTerms && perChunk.some((c) => i < c.length); i++) {
    for (const list of perChunk) {
      const c = list[i]
      if (!c) continue
      const term = toFullWidth(c.term.replace(/\s+/g, '').replace(PLACE_PREFIX, '')) // 本文は空白を詰めてあるので語もそろえる
      if (!isShortWord(term) || out.has(term) || PROCEDURAL_TERM.test(term) || /[{}\[\]"]/.test(term)) continue
      out.set(term, { term, note: cleanNote(c.note) })
      if (out.size >= opts.maxTerms) break
    }
  }
  return [...out.values()]
}
