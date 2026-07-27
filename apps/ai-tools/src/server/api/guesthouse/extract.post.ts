import { requireGuesthouseUser } from '~/server/utils/guesthouse'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import type { ExtractRequest, ExtractResult, ExtractedFact } from '~/types/guesthouse'

// 阪中さんの既存メモ・ウェルカム文・会話ログを Claude が読み、チェックイン案内チャットの
// 知識ベースになる「事務案内Q&A」を抽出する（要ログイン・DBには保存しない下書き）。
// ⚠ 抽出結果は保存前に人が確認する前提。個人情報や一過性の内容は落とす。

const CATEGORY_HINT = '駐車場 / 鍵・チェックイン / チェックアウト / Wi-Fi / ゴミ出し / アクセス・地図 / 設備 / その他'

const SYSTEM = `あなたは、あるゲストハウスのホスト（阪中さん）のアシスタントです。ホストが書き溜めたメモ・ウェルカムメッセージ・お客様との会話ログを読み、お客様向け「チェックイン案内チャット」の知識ベースになる事務案内を抽出します。

# 抽出するもの（事務的で、どのお客様にも当てはまる情報だけ）
- 駐車場・鍵の受け渡し・チェックイン/アウト方法・Wi-Fi・ゴミ出し・アクセス/地図・館内設備 など、答えが決まっている事務情報。
- 各項目は次の形にする:
  - category: できるだけ次から選ぶ（${CATEGORY_HINT}）。合わなければ短い日本語で付ける。
  - title: 想定される質問や見出し（例:「駐車場はどこ？」）。
  - body: 回答本文。誰にでも通用するよう一般化した表現にする（日時や固有名を含めない）。

# 【最重要】除外するもの（絶対に facts に含めない）
- 特定のお客様の氏名・人数・国籍・予約日・滞在日など個人が特定できる情報。
- 「今回は」「◯◯様は」のような一過性・一回限りの取り決め。
- 観光のおすすめ・食事・その人の旅程に合わせた提案など「心のこもった相談」（これはフェーズ1の事務案内ではない）。
- 除外した内容は dropped に日本語で簡潔に列挙する（例:「宿泊者名と到着時刻の個別連絡を除外」）。何も除外していなければ空配列。

# welcome（宿のコンセプト・ウェルカム文）
- 宿の紹介やコンセプトが読み取れれば、お客様向けのウェルカム文として1〜3文にまとめて welcome に入れる。個人情報は含めない。読み取れなければ空文字。

# 出力
必ず次の JSON のみを返す。前後に説明やコードブロック記号を付けない。
{
  "welcome": "ウェルカム文（無ければ空文字）",
  "facts": [ { "category": "分類", "title": "見出し", "body": "回答本文" } ],
  "dropped": ["除外した内容の説明", "..."]
}`

export default defineEventHandler(async (event): Promise<ExtractResult> => {
  await requireGuesthouseUser(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<ExtractRequest>(event)
  const text = (body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '取り込むテキストを入力してください' })
  if (text.length > 20000) throw createError({ statusCode: 400, message: 'テキストが長すぎます（2万文字まで）' })

  const out = await callClaudeText(anthropicApiKey as string, {
    system: SYSTEM,
    maxTokens: 2000,
    messages: [{ role: 'user', content: `次のメモ・会話ログから事務案内を抽出してください:\n"""\n${text}\n"""` }],
  })

  const parsed = parseJsonLoose<{ welcome?: string; facts?: any[]; dropped?: any[] }>(out)
  if (!parsed) throw createError({ statusCode: 502, message: '取り込みに失敗しました。もう一度お試しください。' })

  const facts: ExtractedFact[] = (Array.isArray(parsed.facts) ? parsed.facts : [])
    .map((f) => ({
      category: String(f?.category ?? '').trim(),
      title: String(f?.title ?? '').trim(),
      body: String(f?.body ?? '').trim(),
    }))
    .filter((f) => f.title || f.body)

  return {
    welcome: String(parsed.welcome ?? '').trim(),
    facts,
    dropped: (Array.isArray(parsed.dropped) ? parsed.dropped : []).map((d) => String(d).trim()).filter(Boolean),
  }
})
