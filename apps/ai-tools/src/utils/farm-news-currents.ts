/**
 * farm-news（農業×AI専門ニュース）の6大潮流。記事は要約時にAIがこのどれか1つに分類する
 * （ソースと潮流は固定対応ではない。同じソースでも記事によって潮流は変わる）。
 *
 * id は D1 に保存される識別子なので、一度入れたら変えないこと（news/news-currents.ts と同じ制約）。
 * 既存 news の「農業・畜産とAI」潮流を切り出し、6つに分解したもの。
 */
export interface FarmNewsCurrent {
  id: string
  label: string
  description: string
}

export const FARM_NEWS_CURRENTS: FarmNewsCurrent[] = [
  {
    id: 'precision-farming',
    label: '精密農業・センシング',
    description: 'ドローン・衛星・IoTセンサーによる圃場管理、可変施肥、収量予測など、圃場のデータ化に関わる動き',
  },
  {
    id: 'farm-robotics',
    label: '農業ロボット・自動化',
    description: '収穫ロボット・自動運転トラクター・選果AIなど、農作業そのものを機械が代替する動き',
  },
  {
    id: 'livestock-ai',
    label: '畜産・酪農のスマート化',
    description: '個体管理・健康モニタリング・搾乳ロボットなど、家畜の飼育にAI・IoTが入り込む動き',
  },
  {
    id: 'fishery-forestry',
    label: 'スマート漁業・林業',
    description: '漁獲予測・養殖管理・森林資源管理など、水産・林業分野へのAI活用の動き',
  },
  {
    id: 'agri-data-market',
    label: '農業データ・経営',
    description: '需要予測・価格予測・サプライチェーン最適化など、データで農業経営を支える動き',
  },
  {
    id: 'policy-climate',
    label: '政策・気候とAI',
    description: '規制・補助金・気候変動対応・食料安全保障など、農業を取り巻く政策と環境の動き',
  },
]

/** AIの分類が6つのIDのどれにも当てはまらなかったときの逃げ場。 */
export const FARM_NEWS_FALLBACK_CURRENT = 'agri-data-market'

const CURRENT_IDS = new Set(FARM_NEWS_CURRENTS.map((c) => c.id))

export function isKnownFarmNewsCurrent(id: string): boolean {
  return CURRENT_IDS.has(id)
}

export function farmNewsCurrentLabel(id: string): string {
  return FARM_NEWS_CURRENTS.find((c) => c.id === id)?.label ?? id
}
