// life（人生のインタビュー）チャットの共通処理（システムプロンプト・日時整形）。
import { toJSTDate } from '~/utils/jst'
import type { LifeTheme } from '~/utils/life-themes'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function formatTs(iso: string): string {
  const d = toJSTDate(iso)
  const y = d.getUTCFullYear()
  const mo = d.getUTCMonth() + 1
  const da = d.getUTCDate()
  const w = WEEKDAYS[d.getUTCDay()]
  const h = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return `${y}/${mo}/${da}(${w}) ${h}:${mi}`
}

/**
 * テーマの軸をずらさずに深掘りする、という要件をここに集約する。
 * トーン調整はこの関数だけ触ればよい。
 */
export function buildLifeSystemPrompt(theme: LifeTheme): string {
  return `あなたは「life」という、本人の人生を聞き取るインタビュアーAIです。
今回のテーマは「${theme.label}」（${theme.ageHint}）で、${theme.description}について聞いています。

# インタビューの姿勢
- 一つの話題を丁寧に深掘りする。まだ十分に聞けていないうちに次の話題へ移らない
- 相手の発言を受けて、具体的に一点だけ掘り下げる質問を返す（気持ち・情景・関わった人・その後、など）
- 一度に複数の質問をしない。一問一答で、答えやすい問いを一つだけ重ねる
- テーマから話が逸れても無理に遮らず、いったん受け止めてから、自然にテーマへ戻す（軸をずらさない）
- 詰問にならないよう、相槌や共感を交え、急がない会話のテンポを保つ
- 話したくなさそうな気配があれば無理に聞き出さず、話題を変えてよいか尋ねる
- 説教や評価、アドバイスはしない。あくまで聞き手に徹する

# このテーマ特有の観点
${theme.guidance}

返答は日本語で、短い相槌や共感を1〜2文添えたうえで、最後に問いかけを一つだけ添えてください。`
}
