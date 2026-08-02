// life-analyzer の Claude 呼び出しを集約する（guesthouse-ai.ts と同じ思想）。
// 「診断」ではなく「本人が自分で気づくための材料」を出すのが役割。断定・決めつけは避ける。
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { CORES_PER_SIDE, CORE_LABEL_MAX, EPISODES_PER_CORE, EPISODE_LABEL_MAX } from '~/types/life-analyzer'
import type { EpisodeSummary, LifeCore, LifeEpisode, Polarity } from '~/types/life-analyzer'

/** 文字数上限で切り詰める（超えたら末尾を…にする）。 */
function clampLabel(raw: unknown, max: number, fallback: string): string {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim() || fallback
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

// ── テキストの命名 ──────────────────────────────

const TITLE_SYSTEM = `あなたは、人が語った人生の記録に短い名前を付ける編集者です。
本人が後から履歴一覧で見返したときに「あのときの記録だ」とすぐ分かる、具体的で落ち着いた名前を付けます。
評価や決めつけ（「トラウマの記録」「輝かしい半生」など）はしません。内容の中心にあるものを、そのまま静かに名指しします。
出力は名前そのものだけ。かぎ括弧・説明・句点は付けません。`

/** 貼り付けられたテキストに18文字以内の名前を付ける。失敗時は日付ベースの名前にフォールバック。 */
export async function generateTitle(apiKey: string, text: string): Promise<string> {
  const head = text.slice(0, 6000)
  try {
    const out = await callClaudeText(apiKey, {
      system: TITLE_SYSTEM,
      maxTokens: 100,
      messages: [{ role: 'user', content: `次のテキストに、日本語18文字以内の名前を付けてください。\n\n"""\n${head}\n"""` }],
    })
    const title = out.replace(/^[「『"']|[」』"'。]$/g, '').trim()
    return title ? clampLabel(title, 18, '') : ''
  } catch {
    return ''
  }
}

// ── 光と影のコア分析 ──────────────────────────────

const ANALYZE_SYSTEM = `あなたは、人が語った人生の記録を読み、その人の「コア（核）」を影と光の両面から取り出す聴き手です。
目的は診断でも評価でもなく、本人が自分の人生を見つめ直し、内省を深めるための材料を差し出すことです。

姿勢:
- 影は欠点ではありません。その人が抱えてきた痛み・恐れ・繰り返してきたつまずき・生きづらさの根にあるものを、本人を責めない言葉で名指しします。
- 光も自慢ではありません。その人を支えてきた力・大切にしてきたもの・繰り返し現れる強さを、誇張せずに名指しします。
- 影と光は多くの場合ひと続きです。同じ性質の裏表になっている場合は、対応する影と光を同じ並び順（1番目どうし、2番目どうし）に置いてください。
- テキストに書かれていないことを創作しない。読み取れる範囲で書く。
- 「〜すべき」「〜が問題だ」といった説教・断定はしない。本人の言葉づかいや価値観を尊重する。

コアの選び方:
- 一度きりの出来事ではなく、人生の中で繰り返し現れているパターンを優先します。
- 5つの影、5つの光が互いに似すぎないよう、別々の側面を選びます。

出力の決まり:
- コアの見出し(label)は日本語${CORE_LABEL_MAX}文字以内。抽象語の羅列ではなく、その人の輪郭が見える一言にする。
- 各コアには、それを裏づける具体的な出来事を${EPISODES_PER_CORE}つ挙げる。出来事の見出し(label)は日本語${EPISODE_LABEL_MAX}文字以内で、テキストに実際に書かれている場面を指す。
- 必ず JSON のみを返す。前後に説明文やコードブロックの記号を付けない。`

interface RawCore {
  label?: string
  description?: string
  episodes?: { label?: string; detail?: string }[]
}
interface RawAnalysis {
  overview?: string
  shadows?: RawCore[]
  lights?: RawCore[]
}

/** AIの生出力を、キー付き・文字数を整えた LifeCore[] に変換する。 */
function shapeCores(raw: RawCore[] | undefined, polarity: Polarity): LifeCore[] {
  return (raw ?? []).slice(0, CORES_PER_SIDE).map((core, i) => {
    const key = `${polarity}-${i}`
    const episodes: LifeEpisode[] = (core.episodes ?? []).slice(0, EPISODES_PER_CORE).map((ep, j) => ({
      key: `${key}-${j}`,
      label: clampLabel(ep.label, EPISODE_LABEL_MAX, '（具体例なし）'),
      detail: String(ep.detail ?? '').trim(),
    }))
    return {
      key,
      polarity,
      label: clampLabel(core.label, CORE_LABEL_MAX, '（読み取れず）'),
      description: String(core.description ?? '').trim(),
      episodes,
    }
  })
}

/**
 * 人生のテキストから影5・光5のコアと、それぞれの具体的な出来事3つを抽出する。
 * 返す cores は shadow 5件 → light 5件の順。
 */
export async function analyzeCores(apiKey: string, sourceText: string): Promise<{ overview: string; cores: LifeCore[] }> {
  const out = await callClaudeText(apiKey, {
    system: ANALYZE_SYSTEM,
    maxTokens: 6000,
    messages: [
      {
        role: 'user',
        content: `次は、ある人の人生について語られた記録です。

"""
${sourceText}
"""

この人のコアとなる影を${CORES_PER_SIDE}つ、光を${CORES_PER_SIDE}つ選び、次のスキーマの JSON のみを返してください。

{
  "overview": "この人の人生全体を通して見えるものを3〜4文で。影と光のつながりに触れる",
  "shadows": [
    {
      "label": "影のコア（日本語${CORE_LABEL_MAX}文字以内）",
      "description": "そのコアがどういうものか、本人を責めない言葉で2〜3文",
      "episodes": [
        { "label": "具体的な出来事（日本語${EPISODE_LABEL_MAX}文字以内）", "detail": "その出来事がこのコアをどう裏づけるかを1〜2文" }
      ]
    }
  ],
  "lights": [ 同じ形式で${CORES_PER_SIDE}つ ]
}

shadows・lights はそれぞれちょうど${CORES_PER_SIDE}件、episodes はそれぞれちょうど${EPISODES_PER_CORE}件にしてください。`,
      },
    ],
  })

  const parsed = parseJsonLoose<RawAnalysis>(out)
  if (!parsed) throw createError({ statusCode: 502, message: '分析結果を読み取れませんでした。もう一度お試しください。' })

  const cores = [...shapeCores(parsed.shadows, 'shadow'), ...shapeCores(parsed.lights, 'light')]
  if (!cores.length) throw createError({ statusCode: 502, message: '分析結果が空でした。テキストの量を増やしてお試しください。' })

  return { overview: String(parsed.overview ?? '').trim(), cores }
}

// ── 出来事ノードのポップアップ要約 ──────────────────────────────

const EPISODE_SYSTEM = `あなたは、人が語った人生の記録を一緒に読み返す聴き手です。
指定された「コア」と「具体的な出来事」について、元のテキストの該当箇所を丁寧に読み直し、本人が内省を深められるようにまとめます。

姿勢:
- 元のテキストに書かれていることだけを使う。想像で埋めない。
- 出来事の経緯だけでなく、そのときの気持ちや、その後の選択への影響が読み取れるならそこに触れる。
- 助言・説教・励ましの押し売りはしない。決めつけない。「〜かもしれません」のように余白を残す。
- 影について書くときも、その人を責めない。影がその人を守ってきた面があるなら、それも書く。
- 問いかけは1つだけ。答えを誘導せず、本人が自分で考えたくなるものにする。
- 必ず JSON のみを返す。前後に説明文やコードブロックの記号を付けない。`

/** 出来事ノードのポップアップ用に、元テキストからその周辺を要約する。 */
export async function summarizeEpisode(
  apiKey: string,
  params: { sourceText: string; polarity: Polarity; coreLabel: string; coreDescription: string; episodeLabel: string; episodeDetail: string }
): Promise<EpisodeSummary> {
  const side = params.polarity === 'shadow' ? '影' : '光'
  const out = await callClaudeText(apiKey, {
    system: EPISODE_SYSTEM,
    maxTokens: 1500,
    messages: [
      {
        role: 'user',
        content: `元の記録:
"""
${params.sourceText}
"""

コア（${side}）: ${params.coreLabel}
コアの説明: ${params.coreDescription}
今回取り上げる出来事: ${params.episodeLabel}
その位置づけ: ${params.episodeDetail}

この出来事について、元の記録の該当箇所を読み直し、次のスキーマの JSON のみを返してください。

{
  "summary": "この出来事のまとめ（300字程度。何が起きて、本人がどう受け止め、それがコアとどうつながるか）",
  "quotes": ["根拠になった元の記録からの引用（そのまま・1〜3件・各60字程度まで）"],
  "question": "内省を深めるための問いかけ1つ（40字程度）"
}`,
      },
    ],
  })

  const parsed = parseJsonLoose<EpisodeSummary>(out)
  if (!parsed) throw createError({ statusCode: 502, message: '要約に失敗しました。もう一度お試しください。' })

  return {
    summary: String(parsed.summary ?? '').trim(),
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes.map((q) => String(q).trim()).filter(Boolean).slice(0, 3) : [],
    question: String(parsed.question ?? '').trim(),
  }
}
