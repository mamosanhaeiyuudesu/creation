/**
 * farm-news（農業×AI専門ニュース）の4大潮流。記事は要約時にAIがこのどれか1つに分類する
 * （ソースと潮流は固定対応ではない。同じソースでも記事によって潮流は変わる）。
 *
 * id は D1 に保存される識別子なので、一度入れたら変えないこと（news/news-currents.ts と同じ制約）。
 *
 * 2026-09-14、本人の「農業だけでいい、酪農や漁業はいらない」という要望で当初の6潮流から
 * livestock-ai（畜産・酪農のスマート化）と fishery-forestry（スマート漁業・林業）を削除した
 * （対応ソース feedstuffs / beefmagazine も farm-news-sources.ts から削除し、D1の該当記事・
 * 潮流考察も削除済み）。id は欠番のまま詰めていない（後から復活させる可能性を考慮）。
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
