// 議事録の項目（JSONのキー）と、画面・PDF・AIへの指示に出す日本語の名前の対応表。**名前はここだけに書く。**
//
// 以前は、確認画面・PDF・AIへの指示のそれぞれに日本語を直接書いていたので、同じ項目が場所ごとに
// 違う名前になっていた（例: 決定事項が、画面では「この会で決まったこと」、PDFでは「決まったこと」）。
// 名前を変えるときは、このファイルだけを直す。
//
// 種類（話し合い／聞き取り）で意味が変わる項目だけ、聞き取りの名前を別に持つ。
// 入力欄の案内文（placeholder）や補足の見出しなど、項目の名前ではない文言は、各画面に残している。

import type { MinutesMode } from '~/types/minutes'

export type LabelKey =
  | 'title'
  | 'date'
  | 'participants'
  | 'summary'
  | 'topics'
  | 'decisions'
  | 'discussions'
  | 'keyMessages'
  | 'taskCandidates'
  | 'eventCandidates'
  | 'unclearPoints'
  | 'tags'

/** 話し合い（既定）の名前 */
const MEETING_LABELS: Record<LabelKey, string> = {
  title: '会議の名前',
  date: '会議をした日',
  participants: '参加者',
  summary: '概要',
  topics: '話し合ったこと',
  decisions: '決まったこと',
  // 古い並び（layout 1）の会議だけが持つ。中身は「決まっていないこと」（以前は画面に「話し合ったこと」と出していた）
  discussions: '決まっていないこと',
  keyMessages: '伝えたかったこと',
  taskCandidates: 'やること',
  // 古い並び（layout 1）の会議だけが持つ（新しい並びでは「やること」に入れる）
  eventCandidates: '次の予定',
  unclearPoints: '不明点',
  tags: 'タグ',
}

/** 聞き取りで、話し合いと名前が違うもの */
const TALK_LABELS: Partial<Record<LabelKey, string>> = {
  title: 'タイトル',
  date: '話した日',
  participants: '話し手',
  topics: '話の内容',
}

/** 項目の日本語の名前。画面・PDF・AIへの指示は、すべてこれを使う */
export function minutesLabel(key: LabelKey, mode: MinutesMode = 'meeting'): string {
  return (mode === 'talk' ? TALK_LABELS[key] : undefined) ?? MEETING_LABELS[key]
}
