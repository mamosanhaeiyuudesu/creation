export type ActivityType = 0 | 1 | 2 // 0=stationary, 1=bud_thinning, 2=driving

export interface GpsPoint {
  t: number        // seconds_elapsed (10s単位)
  lat: number
  lng: number
  alt: number      // 整数m
  spd: number      // m/s
  act: ActivityType
  cumDist: number  // 累積距離m
}

export interface MotionBucket {
  t: number
  mean: number     // 加速度ベクトル大きさの平均 (m/s²)
  std: number      // 標準偏差（体動の激しさ）
  max: number
}

export interface FarmLogMeta {
  date: string
  label: string
  startTime: string
  durationSec: number
  totalDistanceM: number
  elevationGainM: number
  boundingBox: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
  activitySummary: {
    stationarySec: number
    budThinningSec: number
    drivingSec: number
  }
}

export interface FarmLogData {
  meta: FarmLogMeta
  track: GpsPoint[]
  motion: MotionBucket[]
}

export interface FarmLogSession {
  date: string
  label: string
  durationSec: number
  totalDistanceM: number
}
