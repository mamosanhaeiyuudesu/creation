// タグの正規化。サーバー／クライアント共用の純粋関数。
// 画面の入力・保存・名前の変更のすべてでここを通す（表記の割れ・長すぎるタグ・重複を防ぐ）。

/** 1つのタグの最大文字数 */
export const MAX_TAG_LENGTH = 20
/** 1件の議事録に付けられるタグの数 */
export const MAX_TAGS_PER_RECORD = 10

/** 1つのタグを整える（前後の空白を削り、続いた空白を1つにし、長すぎれば切る）。空なら空文字 */
export function normalizeTag(raw: unknown): string {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TAG_LENGTH)
}

/** タグの並びを整える。空は落とし、重複は最初の1つだけ残し、上限を超えた分は捨てる */
export function normalizeTags(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : []
  const out: string[] = []
  for (const item of list) {
    const tag = normalizeTag(item)
    if (tag && !out.includes(tag)) out.push(tag)
    if (out.length >= MAX_TAGS_PER_RECORD) break
  }
  return out
}

/** タグの名前を変える（to が既にあれば1つにまとまる）。to が空なら外す */
export function renameTagIn(tags: string[], from: string, to: string): string[] {
  const target = normalizeTag(to)
  return normalizeTags(tags.map((t) => (t === from ? target : t)))
}

/** 議事録の一覧から、タグごとの件数を多い順に数える（同数なら名前順） */
export function countTags(records: { tags: string[] }[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of records) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ja'))
}
