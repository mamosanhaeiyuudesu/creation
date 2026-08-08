// ゲストハウス案内アプリ (guesthouse) の型定義。
// フェーズ1「チェックイン案内チャット」。宿ごとの事務案内情報をホスト（阪中さん）が登録し、
// お客様は共有リンク（ログイン不要）で AI に事務的な質問を即答してもらう。

/** 案内項目の種別。info=事務（AIが即答）/ tip=おすすめ素材（提案の下書きにのみ使う）。 */
export type FactType = 'info' | 'tip'

/** 事務案内の1項目（駐車場・鍵・Wi-Fi など）。AI の知識ベースになる。 */
export interface GuestFact {
  id: string
  category: string // 駐車場 / 鍵・チェックイン / Wi-Fi / ゴミ出し / アクセス など（自由入力）
  title: string // 想定質問や見出し（例:「駐車場はどこ？」）
  body: string // 回答本文
  type: FactType
}

/** 宿（柿畑の宿 / 高野口の宿 など）。ホストが所有する。 */
export interface House {
  id: string
  name: string
  welcome: string // ウェルカムメッセージ／宿のコンセプト（チャット冒頭に表示・AIの前提にもなる）
  shareToken: string
  createdAt: string
  updatedAt: string
  facts: GuestFact[]
}

/** 一覧用サマリ（案内本文は含めない）。 */
export interface HouseSummary {
  id: string
  name: string
  shareToken: string
  factCount: number
  updatedAt: string
}

/** 宿の作成・更新リクエストのボディ（案内項目は一括置換）。 */
export interface HouseInput {
  name: string
  welcome: string
  facts: { category: string; title: string; body: string; type: FactType }[]
}

/** お客様向けの公開情報（回答本文は返さず、案内できる話題の見出しだけ渡す）。 */
export interface StayInfo {
  name: string
  welcome: string
  categories: string[] // 案内できる話題の見出し（お客様に「何が聞けるか」を示す）
}

/** AI の返信種別。auto=事務即答（「自動応答」ラベル）/ handoff=阪中さんに引き継ぐ。 */
export type ReplyKind = 'auto' | 'handoff'

/** チャット1往復のメッセージ（Claude と同じ role 表現）。 */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** チャットAPIのリクエスト。messages は履歴（末尾がお客様の新しい質問）。 */
export interface ChatRequest {
  messages: ChatMessage[]
}

/** チャットAPIのレスポンス。 */
export interface ChatReply {
  kind: ReplyKind
  reply: string
}

// ── 既存データの AI 取り込み（貼り付けたメモ/会話ログから事務案内を抽出）──

/** 抽出リクエスト。text は阪中さんのメモ・ウェルカム文・会話ログの貼り付け原文。 */
export interface ExtractRequest {
  text: string
}

/** 抽出された案内項目の候補（保存前・人が確認する下書き）。 */
export interface ExtractedFact {
  category: string
  title: string
  body: string
}

/** 抽出結果。welcome は宿コンセプト候補、dropped は個人情報等で除外した内容の説明。 */
export interface ExtractResult {
  welcome: string
  facts: ExtractedFact[]
  dropped: string[]
}

// ── フェーズ2・3：会話の永続化 / 相談承認 / 日記 / 提案 / 傾向 ──

/** 会話メッセージの発言者。guest=お客様 / auto=AI自動応答 / host=阪中さん（承認済み）。 */
export type MessageRole = 'guest' | 'auto' | 'host'

/** 会話1メッセージ（スレッド表示・お客様/ホスト共通）。 */
export interface ThreadMessage {
  id: string
  role: MessageRole
  content: string
  kind: string // auto / handoff / reply など
  createdAt: string
}

/** お客様チャットのスレッド（初期読み込み・ポーリング）。 */
export interface StayThread {
  sessionId: string
  guestName: string
  messages: ThreadMessage[]
}

/** お客様チャット送信のリクエスト。sessionId 未指定なら新規作成する。 */
export interface StayChatRequest {
  sessionId?: string
  guestName?: string
  message: string
}

/** お客様チャット送信のレスポンス。 */
export interface StayChatReply {
  sessionId: string
  kind: ReplyKind
  reply: string
}

/** 相談（handoff）。AIが下書き→阪中さんが承認して回答する。 */
export type ConsultStatus = 'pending' | 'answered' | 'dismissed'
export interface Consult {
  id: string
  houseId: string
  houseName: string
  sessionId: string
  guestName: string
  question: string
  draft: string
  answer: string
  status: ConsultStatus
  createdAt: string
}

/** お客さん日記。content は自由記述（旅程・国籍/出身・印象・気づきなどを1つの文章にまとめる）。 */
export interface Diary {
  id: string
  houseId: string
  sessionId: string
  guestName: string
  content: string
  createdAt: string
}

/** お礼＆レビュー依頼の下書き（宿泊後）。 */
export interface FarewellDraft {
  thanks: string // お礼メッセージ（チャットに投稿できる）
  reviewRequest: string // レビュー依頼文（予約サイトに貼るコピー用）
}

/** 滞在セッションの状態。active=進行中 / closed=ホストがクローズ済み（再開可）。 */
export type SessionStatus = 'active' | 'closed'

/** ホストの会話一覧用サマリ。 */
export interface SessionSummary {
  id: string
  guestName: string
  messageCount: number
  hasDiary: boolean
  pendingConsults: number
  updatedAt: string
}

/** チャット一覧の1行（全宿横断・管理トップの進行中パネル/一覧ページ共通）。宿名と状態付き。 */
export interface SessionListItem {
  id: string
  houseId: string
  houseName: string
  guestName: string
  messageCount: number
  hasDiary: boolean
  pendingConsults: number
  status: SessionStatus
  updatedAt: string
}

/** 旅の情報（おすすめ素材）。ホスト共通で1か所に持つ。相談の下書きの素材に使う。 */
export interface Tip {
  id: string
  category: string // 高野山 / 観光 / 食事 / 近隣 など
  title: string
  body: string
}

/** 旅の情報の一括置換リクエスト。 */
export interface TipsInput {
  tips: { category: string; title: string; body: string }[]
}

/** 旅の情報の取り込み候補。mergeId が既存 tip の id なら「その項目に差分マージ（body は統合後の全文）」、null なら新規。 */
export interface ExtractedTip {
  mergeId: string | null
  category: string
  title: string
  body: string
}

/** 旅の情報の取り込み結果。 */
export interface TipExtractResult {
  items: ExtractedTip[]
  dropped: string[]
}

/** ホストが読む会話の詳細（メッセージ全文）。 */
export interface SessionDetail {
  id: string
  houseId: string
  houseName: string
  guestName: string
  status: string
  messages: ThreadMessage[]
  diary: Diary | null
  createdAt: string
  updatedAt: string
}

/** 傾向（学習ループ）。日記データからAIが抽出。 */
export interface TrendItem {
  title: string
  detail: string
}
export interface Trends {
  items: TrendItem[]
  basedOn: number // 集計に使った日記件数
  reviewsBasedOn: number // 集計に使ったレビュー・意見の件数
  computedAt: string | null // 最終計算時刻（未計算なら null）
  stale: boolean // 前回計算後に日記/レビューが変わり、「更新」で再計算できる状態か
}

// ── レビュー・意見（顧客の声。傾向分析の第2の入力源。ホスト共通・宿横断）──

/** レビュー・意見の1件。source=出典ラベル（Airbnb/アンケート等）、body=本文。 */
export interface Review {
  id: string
  source: string
  body: string
  createdAt: string
}

/** レビュー・意見の作成/更新リクエスト。 */
export interface ReviewInput {
  source: string
  body: string
}

/** 貼り付けテキストからAIが切り出したレビュー候補（保存前・人が確認する下書き）。 */
export interface ExtractedReview {
  body: string
}

/** レビュー・意見の取り込み結果。 */
export interface ReviewExtractResult {
  items: ExtractedReview[]
}

/** 傾向の更新（再計算）結果。updated=false は「日記に変化がなく再計算せずスキップ」した場合。 */
export interface TrendsRefreshResult extends Trends {
  updated: boolean
}
