import { requirePaletteUser } from '~/server/utils/palette'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { PALETTE_VIDEO_LIMITS } from '~/types/palette'
import type { PaletteVideoPlan } from '~/types/palette'

// 文章を、インスタのリール用のシーン（読み上げの文＋絵の説明）に分ける。DB には保存しない（画面が下書きとして持つ）。
// 読み上げは文章をそのまま読むのではなく、AI が聞いてわかる長さにまとめる（本人の判断）。
// 枚数は文章に合わせて AI が 3〜20 で決め、基本は 3〜6 に収める（本人の指定）。
const MAX_CHARS = PALETTE_VIDEO_LIMITS.articleChars
const { min: MIN_SCENES, max: MAX_SCENES } = PALETTE_VIDEO_LIMITS.scenes

const SYSTEM = `あなたはインスタグラムのリール（縦長の短い動画）の構成作家です。ユーザーが渡す文章を、「1枚の絵＋その絵の間に読み上げるナレーション」のシーンに分けます。絵は画像生成モデル FLUX で描き、ナレーションは音声合成で読み上げ、字幕にもなります。

シーンの数:
- 文章の量と話の区切りに合わせて ${MIN_SCENES}〜${MAX_SCENES} の範囲で決める。基本は 3〜6 に収める。7 以上にするのは、長い文章で話題がはっきり分かれているときだけ。
- ユーザーが「希望のシーン数」を書いていれば、その数にする。

ナレーション（narration）:
- 文章をそのまま読むのではなく、耳で聞いてわかるようにまとめ直す。文章の大事な事実・数字・結論は落とさない。文章に無いことは足さない。
- 全体で 150〜450 字（読み上げて 30〜90 秒）を目安にする。文章が短ければ短くてよい。
- 1シーンは 1〜3 文、40〜100 字。${PALETTE_VIDEO_LIMITS.narrationChars} 字は超えない。
- 話し言葉の「です・ます」調。記号・括弧・URL・箇条書き・絵文字は使わない。数字は読み間違えにくい書き方にする。
- 最初のシーンは見る人の手を止める一言から入り、最後のシーンは文章の結論かひとことのまとめで終える。

全シーン共通の設定（style）:
- 絵の見た目をシーン間でそろえるための共通の設定を、日本語 60〜160 字で書く。画風（写真風・水彩・アニメ調など、文章の雰囲気に合うもの）、色調、光。何度も出てくる人物がいれば、その外見（年齢・性別・髪型・服）も具体的に決めて書く。
- 人物は、国籍・人種の指定がなければ日本人として書く（「30代の日本人女性」のように）。

絵の説明（sceneJa）:
- そのシーンのナレーションに合う 1 枚の絵を、日本語 60〜160 字で具体的に書く（被写体、場所、構図、光、雰囲気）。共通の設定に書いたこと（画風・人物の外見）はくり返さなくてよい。
- 縦長（9:16）の画面に収まる構図にする。被写体は画面の上半分〜中央に置く（下のほうには字幕が重なる）。
- 絵の中に文字・看板・字幕・ロゴ・数字を描かせない。グラフや表も描かせない（数字の話は、それを象徴する場面で表す）。
- 画像生成モデルが苦手な題材（鏡・ガラスの映り込み、手元の細かい動作、複数人の細かい位置関係）は、崩れにくい構図に寄せる。
- 人物は、国籍・人種の指定がなければ日本人として書く。固有名詞の実在の人物・キャラクター・作品名は書かない（文章に実在の人物が出てくる場合も、似せずに一般的な人物として描く）。
- シーンごとに構図（寄り・引き・アングル）を変えて、続けて見ても単調にならないようにする。

タイトル（title）: 文章の内容がわかる 20 字以内の見出し。

出力は JSON だけ。説明やコードブロックは付けない。形式:
{"title":"…","style":"…","scenes":[{"narration":"…","sceneJa":"…"}]}`

export default defineEventHandler(async (event): Promise<PaletteVideoPlan> => {
  await requirePaletteUser(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{ article?: string; sceneCount?: number | null }>(event)
  const article = String(body?.article ?? '').trim()
  if (!article) throw createError({ statusCode: 400, message: '文章を入力してください' })
  if (article.length > MAX_CHARS) throw createError({ statusCode: 400, message: `文章が長すぎます（${MAX_CHARS}文字まで）` })
  const wanted = Number(body?.sceneCount)
  const sceneCount = Number.isInteger(wanted) && wanted >= MIN_SCENES && wanted <= MAX_SCENES ? wanted : null

  const content = sceneCount ? `希望のシーン数: ${sceneCount}\n\n文章:\n${article}` : `文章:\n${article}`
  const raw = await callClaudeText(anthropicApiKey as string, {
    system: SYSTEM,
    maxTokens: 6000,
    messages: [{ role: 'user', content }],
  })
  const parsed = parseJsonLoose<{ title?: unknown; style?: unknown; scenes?: unknown }>(raw)
  const scenes = (Array.isArray(parsed?.scenes) ? parsed!.scenes : [])
    .map((s: any) => ({
      narration: String(s?.narration ?? '').trim().slice(0, PALETTE_VIDEO_LIMITS.narrationChars),
      sceneJa: String(s?.sceneJa ?? '').trim().slice(0, 1000),
    }))
    .filter((s) => s.narration && s.sceneJa)
    .slice(0, MAX_SCENES)
  if (scenes.length < 1) throw createError({ statusCode: 502, message: 'シーンに分けられませんでした。もう一度試してください。' })
  return {
    title: String(parsed?.title ?? '').trim().slice(0, 120),
    style: String(parsed?.style ?? '').trim().slice(0, 1000),
    scenes,
  }
})
