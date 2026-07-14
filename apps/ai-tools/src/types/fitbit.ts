// Fitbit ヘルスダッシュボードの型定義。
// サーバー側（Fitbit Web API 取得・スコア算出）とフロント（描画）で共有する。

/** 睡眠ステージ種別（Fitbit の stages に準拠） */
export type SleepStage = 'deep' | 'light' | 'rem' | 'wake'

/** 時系列サンプル（分単位オフセット or 時刻文字列） */
export interface TimePoint {
  /** 睡眠開始からの経過分、または当日0時からの経過分 */
  t: number
  v: number
}

/** スコア（0-100）と内訳。エナジー・睡眠の両方で使う共通形。 */
export interface ScoreDetail {
  /** 0-100。ベースライン未確立時は null */
  score: number | null
  /** "良好" / "普通" / "要休養" 等のラベル */
  label: string
  /** 内訳（各要素の寄与点） */
  contributions: { key: string; label: string; value: number; max: number }[]
  /** ベースライン算出に使った日数が足りない場合の注記 */
  provisional: boolean
}

/** 睡眠ステージの合計（分）と割合（%） */
export interface StageBreakdown {
  minutes: number
  pct: number
}

/** 睡眠詳細 */
export interface SleepDetail {
  date: string
  score: ScoreDetail
  /** 就寝〜起床の全期間（分、中途覚醒を含む） */
  totalMinutes: number
  /** 実際に眠っていた時間（分、中途覚醒を除く＝totalMinutes − stages.wake.minutes） */
  asleepMinutes: number
  /** 就寝・起床時刻（"23:41" 形式、JST） */
  bedtime: string
  waketime: string
  efficiency: number
  awakeCount: number
  stages: Record<SleepStage, StageBreakdown>
  /** ステージ帯タイムライン */
  timeline: { stage: SleepStage; start: number; duration: number }[]
}

/** トレンド1点 */
export interface TrendPoint {
  date: string
  value: number | null
}

/** 1件の運動セッション（ウォーキング・サイクリング等） */
export interface ActivitySession {
  /** Google Health API の exerciseType（例: "WALKING"） */
  type: string
  /** 日本語ラベル（例: "ウォーキング"） */
  label: string
  icon: string
  /** 開始・終了時刻（"HH:MM" 形式、JST） */
  start: string
  end: string
  durationMin: number
  caloriesKcal: number
  /** 距離（km）。取得できない種目では null */
  distanceKm: number | null
}

/** ダッシュボード1日分 */
export interface DashboardData {
  date: string
  energyScore: ScoreDetail
  sleepScore: ScoreDetail
  steps: { value: number; goal: number }
  /** 歩数の時間別内訳（1時間刻み、詳細シート用） */
  stepsSeries: TimePoint[]
  distanceKm: number
  /** 移動距離の時間別内訳（1時間刻み・km、詳細シート用） */
  distanceSeries: TimePoint[]
  /** 消費カロリー（active kcal） */
  caloriesKcal: number
  /** 消費カロリーの時間別内訳（1時間刻み・kcal、詳細シート用。日次合計を按分した推計値） */
  caloriesSeries: TimePoint[]
  restingHeartRate: number
  /** 日中心拍の折れ線（5分刻み、詳細シート用） */
  heartRateSeries: TimePoint[]
  /** 心拍変動（rmssd, ms） */
  hrv: number
  /** SpO2 サマリ */
  spo2: { avg: number; min: number; max: number }
  /** 呼吸数（回/分） */
  breathingRate: number
  /** 皮膚温の基準からの変化（℃） */
  skinTempDelta: number
  /** 睡眠サマリ（詳細は sleep エンドポイントで取得） */
  sleep: {
    /** 就寝〜起床の全期間（分、中途覚醒を含む） */
    totalMinutes: number
    /** 実際に眠っていた時間（分、中途覚醒を除く） */
    asleepMinutes: number
    bedtime: string
    waketime: string
  }
  /** 当日の運動セッション（開始時刻順） */
  activities: ActivitySession[]
  /** 各メトリクスの直近7日推移（ダッシュボードのスパークライン用） */
  trends: Record<string, { date: string; value: number | null }[]>
}

/** 各メトリクスの n 日トレンド */
export interface TrendData {
  metric: string
  days: { date: string; value: number | null }[]
}

/** サーバー内部で扱う1日分の生メトリクス（Fitbit API 由来 or dev スタブ由来） */
export interface RawDay {
  date: string
  steps: number
  stepsSeries: TimePoint[]
  distanceKm: number
  distanceSeries: TimePoint[]
  caloriesKcal: number
  caloriesSeries: TimePoint[]
  restingHeartRate: number
  heartRateSeries: TimePoint[]
  hrv: number
  spo2: { avg: number; min: number; max: number; series: TimePoint[] }
  breathingRate: number
  breathingRateSeries: TimePoint[]
  skinTempDelta: number
  /** 運動セッション（開始時刻順） */
  activities: ActivitySession[]
  sleep: {
    totalMinutes: number
    deepMin: number
    remMin: number
    lightMin: number
    wakeMin: number
    efficiency: number
    awakeCount: number
    bedtime: string
    waketime: string
    timeline: { stage: SleepStage; start: number; duration: number }[]
  }
}

/** 今日のアドバイスカード（AI生成） */
export interface AdviceData {
  /** 見出し（「〜でしたね」等の語りかけ、20字前後） */
  headline: string
  /** 本文（数値比較を含む2〜3文、**太字**でキーワード強調） */
  body: string
}

/** 連携状態 */
export interface FitbitStatus {
  connected: boolean
  fitbitUserId?: string
  scopes?: string
  /** dev モード（スタブデータ）で動作中か */
  dev?: boolean
}
