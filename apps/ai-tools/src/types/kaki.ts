// 柿の木 里親アプリ (kaki) の共通型

export type KakiRole = 'admin' | 'foster'
export type TreeStatus = 'healthy' | 'watching' | 'sick'
export type HealthEventType = 'disease' | 'pest' | 'weather' | 'recovery' | 'harvest'

export interface KakiMe {
  id: string
  username: string
  role: KakiRole
}

export interface Tree {
  id: string
  number: number
  nickname: string
  fosterUserId: string | null
  fosterUsername?: string | null
  plantedYear: number | null
  locationNote: string
  personality: string
  strengths: string[]
  weaknesses: string[]
  status: TreeStatus
  createdAt: string
}

export interface TreeSummary extends Tree {
  lastObservedAt: string | null
  lastPhoto: string | null
}

export interface Observation {
  id: string
  observedAt: string
  photoUrl: string | null
  rawNote: string
  aiStory: string
  aiTreeVoice: string | null
  fruitSizeMm: number | null
  createdAt: string
}

export interface HealthEvent {
  id: string
  year: number
  eventType: HealthEventType
  rawLabel: string
  aiLabel: string
  aiDescription: string
}

export interface Comment {
  id: string
  userId: string
  username: string
  role: KakiRole
  body: string
  createdAt: string
  mine: boolean
}

export interface TreeDetail {
  tree: Tree
  observations: Observation[]
  healthEvents: HealthEvent[]
  comments: Comment[]
}

export interface Foster {
  id: string
  username: string
}

export const STATUS_META: Record<TreeStatus, { label: string; emoji: string; tone: string }> = {
  healthy: { label: '元気', emoji: '🌿', tone: 'leaf' },
  watching: { label: '見守り中', emoji: '☂️', tone: 'amber' },
  sick: { label: '療養中', emoji: '🍵', tone: 'clay' },
}
