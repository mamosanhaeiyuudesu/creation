/**
 * news の要約・重要度判定・潮流分類、および潮流ごとの考察生成。
 * Claude 呼び出しは既存の callClaudeText に任せる。
 */
import { callClaudeText } from '~/server/utils/anthropic'
import { NEWS_MODEL } from '~/utils/news-sources'
import { NEWS_CURRENTS, NEWS_FALLBACK_CURRENT, isKnownCurrent } from '~/utils/news-currents'
import type { RecentCurrentItem } from '~/server/utils/news'

export interface NewsSummary {
  titleJa: string
  summary: string
  importance: number
  reason: string
  /** NEWS_CURRENTS のid */
  current: string
}

const CURRENT_TAXONOMY = NEWS_CURRENTS.map((c) => `- ${c.id}: ${c.label}（${c.description}）`).join('\n')

const SYSTEM = `あなたはAI業界を追っている日本語のアナリストです。
渡された記事を読み、日本語で要約し、重要度を判定し、次の5つの大きな潮流のどれに最も強く関係するかを1つ選んでください。

潮流（"current" にはこのIDのいずれか1つだけを入れる。複数にまたがる内容は最も強く関係するものを選ぶ）:
${CURRENT_TAXONOMY}

重要度の基準（1〜5）:
1 = 些細な更新。個別の小機能、イベント告知、人事の話題
2 = 通常の製品アップデート。使う人には嬉しいが業界は動かない
3 = 注目に値する。新モデル・主要機能の刷新・目立つ提携や資金調達
4 = 業界構造に効く。競争環境や価格・提供形態が変わる、大型の提携や買収、規制対応
5 = 政策や産業の前提が変わる規模。法規制、国家レベルの合意、業界を再編する発表

判定で重視すること:
- 「誰が使えるようになったか」より「何が構造として変わったか」を見る
- 宣伝文句の大きさに引きずられない。金額や固有名詞の派手さは重要度ではない
- 情報が薄く判断材料が足りないときは、盛らずに低めに付けてよい

出力は次のJSONのみ。前置きやコードフェンスを付けないこと。
{"current": "上の5つのIDのいずれか", "titleJa": "日本語の見出し（30字程度）", "summary": "日本語の要約", "importance": 3, "reason": "その重要度にした理由（40字程度で1行）"}

summary は3〜5行。1行ずつ改行で区切り、各行は事実を1つずつ短く述べる。箇条書き記号は付けない。`

/** ```json ... ``` に包まれていても中身を取り出す。 */
function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const raw = (fenced ?? text).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('JSONが見つかりません')
  return JSON.parse(raw.slice(start, end + 1))
}

export async function summarizeArticle(
  apiKey: string,
  input: { title: string; url: string; sourceName: string; body: string; bodyIsFeedSummary: boolean }
): Promise<NewsSummary> {
  const note = input.bodyIsFeedSummary
    ? '（本文が取得できなかったため、以下はRSSの要約文です。情報が薄い前提で判断してください）'
    : ''

  const text = await callClaudeText(apiKey, {
    model: NEWS_MODEL,
    maxTokens: 1200,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `ソース: ${input.sourceName}
タイトル: ${input.title}
URL: ${input.url}
${note}

本文:
${input.body}`,
      },
    ],
  })

  const parsed = extractJson(text)
  const importance = Math.round(Number(parsed.importance))
  const current = String(parsed.current ?? '').trim()

  return {
    titleJa: String(parsed.titleJa ?? '').trim() || input.title,
    summary: String(parsed.summary ?? '').trim(),
    // 判定が壊れていたら 0 のままにせず、配信されない 2 に寄せる（誤って埋もれるより、ページには残す）
    importance: Number.isFinite(importance) ? Math.min(5, Math.max(1, importance)) : 2,
    reason: String(parsed.reason ?? '').trim(),
    // 5つのIDのどれでもなければ（ハルシネーション対策）汎用の潮流へ落とす
    current: isKnownCurrent(current) ? current : NEWS_FALLBACK_CURRENT,
  }
}

/**
 * 潮流ごとの「いまの考察」を書き直す。直近1ヶ月ぶんの見出し一覧を材料に、
 * 前回の考察があればそれを踏まえて更新する（毎回ゼロから書き直さない）。
 */
export async function synthesizeCurrentNarrative(
  apiKey: string,
  input: {
    currentLabel: string
    currentDescription: string
    previousNarrative: string
    recentItems: RecentCurrentItem[]
    todayItems: { titleJa: string; summary: string; importance: number }[]
  }
): Promise<string> {
  const recentList =
    input.recentItems.map((i) => `- ${i.digestDate} [重要度${i.importance}] ${i.titleJa}`).join('\n') ||
    '（過去1ヶ月の記録なし）'
  const todayList = input.todayItems
    .map((i) => `- [重要度${i.importance}] ${i.titleJa}\n  ${i.summary.split('\n').join(' ')}`)
    .join('\n')

  const system = `あなたはAI業界の「${input.currentLabel}」という潮流を継続的に追っている日本語のアナリストです。
この潮流の定義: ${input.currentDescription}

直近1ヶ月の関連ニュース一覧（見出しと重要度のみ）と、今日新しく入った記事の詳細をもとに、
この潮流が最近どちらに向かっているかを4〜6文の日本語でまとめてください。

書き方:
- 個別記事の紹介ではなく、月単位で見たときの方向性・勢い・転換点を述べる
- 今日の新着が方向性に影響するなら触れる。影響が小さければ無理に触れなくてよい
- 前回の考察がある場合は、全部書き直すのではなく「その後どう変わったか」を踏まえて更新する
- 断定しすぎず、材料が薄いところは薄いと分かるように書く
- 出力は考察本文のみ。見出し・前置き・箇条書き記号は付けない`

  const userContent = `${
    input.previousNarrative ? `前回の考察:\n${input.previousNarrative}\n\n` : ''
  }直近1ヶ月の一覧:\n${recentList}\n\n今日の新着:\n${todayList}`

  const text = await callClaudeText(apiKey, {
    model: NEWS_MODEL,
    maxTokens: 800,
    system,
    messages: [{ role: 'user', content: userContent }],
  })
  return text.trim()
}
