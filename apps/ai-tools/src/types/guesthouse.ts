// ゲストハウス案内アプリ (guesthouse) の型定義。
// フェーズ1「チェックイン案内チャット」。宿ごとの事務案内情報をホスト（阪中さん）が登録し、
// お客様は共有リンク（ログイン不要）で AI に事務的な質問を即答してもらう。

/** 事務案内の1項目（駐車場・鍵・Wi-Fi など）。AI の知識ベースになる。 */
export interface GuestFact {
  id: string
  category: string // 駐車場 / 鍵・チェックイン / Wi-Fi / ゴミ出し / アクセス など（自由入力）
  title: string // 想定質問や見出し（例:「駐車場はどこ？」）
  body: string // 回答本文
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
  facts: { category: string; title: string; body: string }[]
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
