/**
 * news（AIニュース朝刊）の5大潮流。記事は要約時にAIがこのどれか1つに分類する
 * （ソースと潮流は固定対応ではない。同じソースでも記事によって潮流は変わる）。
 *
 * id は D1 に保存される識別子なので、一度入れたら変えないこと。
 */
export interface NewsCurrent {
  id: string
  label: string
  description: string
}

export const NEWS_CURRENTS: NewsCurrent[] = [
  {
    id: 'physical-ai',
    label: '実世界に手を伸ばすAI',
    description: 'ロボット・自動運転・ドローン・精密農業・介護ロボットなど、AIがソフトウェアから物理世界へ染み出す動き',
  },
  {
    id: 'knowledge-work',
    label: '知的労働の自動化',
    description: 'コーディングエージェント・マーケティング自動化・AI家庭教師など、専門職の仕事の中身が変わる動き',
  },
  {
    id: 'compute-power',
    label: '土台を巡る競争',
    description: '半導体・電力・データセンター・輸出規制や自国製AIなど、AIを支える計算基盤と地政学',
  },
  {
    id: 'security-governance',
    label: '安全保障とガバナンス',
    description: '軍事転用・サイバー攻撃・情報操作・各国の規制対応',
  },
  {
    id: 'health-mind',
    label: '心と健康に触れるAI',
    description: 'メンタルヘルス支援・診断支援・創薬・高齢化社会のケアなど、AIが心と体に直接触れる動き',
  },
]

/** AIの分類が5つのIDのどれにも当てはまらなかったときの逃げ場。 */
export const NEWS_FALLBACK_CURRENT = 'knowledge-work'

const CURRENT_IDS = new Set(NEWS_CURRENTS.map((c) => c.id))

export function isKnownCurrent(id: string): boolean {
  return CURRENT_IDS.has(id)
}

export function currentLabel(id: string): string {
  return NEWS_CURRENTS.find((c) => c.id === id)?.label ?? id
}
