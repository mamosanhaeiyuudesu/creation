import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SENSOR_DATA_DIR = path.join(__dirname, '../../../sensor_data')
const OUT_DIR = path.join(__dirname, '../src/public/data/farm-log')
const BUCKET_SIZE = 10

// Apple Watch セッション定義
const SESSIONS = [
  {
    folder: 'SensorLogFiles_my_iOS_device_260602_10-22-13',
    file: '2026-06-02_09_49_18_Apple Watch.csv',
    date: '2026-06-02',
    label: 'watch-2026-06-02_09-49-18',
  },
]

// CSV列インデックス（0始まり）
const COL = {
  loggingTime: 0,
  lat: 2,
  lng: 3,
  alt: 4,
  spd: 5,
  accX: 13,
  accY: 14,
  accZ: 15,
  pitch: 19,
  roll: 18,
  activity: 40,
  steps: 44,
  distance: 48,
  relAlt: 54,
  pressure: 55,
  hrBpm: 59,
}

const targetLabel = process.argv[2] || null

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function processSession(session) {
  const { folder, file, date, label } = session
  const csvPath = path.join(SENSOR_DATA_DIR, folder, file)

  console.log(`\n=== Processing: ${label} ===`)
  console.log(`  File: ${csvPath}`)

  if (!fs.existsSync(csvPath)) {
    console.error(`  ERROR: File not found: ${csvPath}`)
    return null
  }

  const gpsBuckets   = new Map()   // bucketIdx -> [{lat, lng, alt, spd}]
  const actBuckets   = new Map()   // bucketIdx -> Map<string, number>
  const motionBuckets = new Map()  // bucketIdx -> {sum, sumSq, count, max, pitchSum, rollSum}

  const hrReadings = []  // [{t, bpm}]

  let startEpochMs = null
  let lastHR       = null
  let lastSteps    = 0
  let lineCount    = 0
  let isHeader     = true

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue }
    lineCount++
    if (lineCount % 100000 === 0) process.stdout.write(`  ... ${lineCount} lines\r`)

    const p = line.split(',')
    if (p.length < 63) continue

    const epochMs = new Date(p[COL.loggingTime]).getTime()
    if (isNaN(epochMs)) continue
    if (startEpochMs === null) startEpochMs = epochMs

    const t      = (epochMs - startEpochMs) / 1000
    const bucket = Math.floor(t / BUCKET_SIZE)

    // GPS（緯度が30以上 = 有効なデータ）
    const lat = parseFloat(p[COL.lat])
    const lng = parseFloat(p[COL.lng])
    const alt = parseFloat(p[COL.alt])
    const spd = parseFloat(p[COL.spd])
    if (lat > 30 && !isNaN(lat) && !isNaN(lng)) {
      if (!gpsBuckets.has(bucket)) gpsBuckets.set(bucket, [])
      gpsBuckets.get(bucket).push({ lat, lng, alt: alt > 0 ? alt : 0, spd: Math.max(0, spd) })
    }

    // 活動認識
    const act = p[COL.activity]
    if (act && act !== '') {
      if (!actBuckets.has(bucket)) actBuckets.set(bucket, new Map())
      const counts = actBuckets.get(bucket)
      counts.set(act, (counts.get(act) || 0) + 1)
    }

    // 加速度・姿勢
    const ax    = parseFloat(p[COL.accX])
    const ay    = parseFloat(p[COL.accY])
    const az    = parseFloat(p[COL.accZ])
    const pitch = parseFloat(p[COL.pitch])
    const roll  = parseFloat(p[COL.roll])
    if (!isNaN(ax) && !isNaN(ay) && !isNaN(az)) {
      const mag = Math.sqrt(ax * ax + ay * ay + az * az)
      if (!motionBuckets.has(bucket)) {
        motionBuckets.set(bucket, { sum: 0, sumSq: 0, count: 0, max: 0, pitchSum: 0, rollSum: 0, pitchCount: 0 })
      }
      const b = motionBuckets.get(bucket)
      b.sum   += mag
      b.sumSq += mag * mag
      b.count++
      if (mag > b.max) b.max = mag
      if (!isNaN(pitch)) { b.pitchSum += pitch; b.pitchCount++ }
      if (!isNaN(roll))  b.rollSum += roll
    }

    // 心拍数（変化時のみ記録）
    const bpm = parseInt(p[COL.hrBpm])
    if (!isNaN(bpm) && bpm > 0 && bpm !== lastHR) {
      hrReadings.push({ t: Math.round(t), bpm })
      lastHR = bpm
    }

    // 歩数（累積値の最終値）
    const steps = parseInt(p[COL.steps])
    if (!isNaN(steps) && steps > lastSteps) lastSteps = steps
  }

  console.log(`\n  Processed ${lineCount} rows`)
  if (startEpochMs === null) { console.error('  No data'); return null }

  // GPS トラック構築
  const track = []
  let cumDist = 0
  let prevPoint = null
  let prevAlt   = null
  let elevationGain = 0
  let minLat = Infinity, maxLat = -Infinity
  let minLng = Infinity, maxLng = -Infinity

  const sortedGpsBuckets = Array.from(gpsBuckets.entries()).sort((a, b) => a[0] - b[0])

  for (const [bucketIdx, points] of sortedGpsBuckets) {
    points.sort((a, b) => a.spd - b.spd)
    const point = points[Math.floor(points.length / 2)]

    if (prevPoint) {
      cumDist += haversine(prevPoint.lat, prevPoint.lng, point.lat, point.lng)
    }
    if (prevAlt !== null && point.alt > 0 && point.alt > prevAlt) {
      elevationGain += point.alt - prevAlt
    }

    minLat = Math.min(minLat, point.lat)
    maxLat = Math.max(maxLat, point.lat)
    minLng = Math.min(minLng, point.lng)
    maxLng = Math.max(maxLng, point.lng)

    // アクティビティ: 最頻値
    const actCounts = actBuckets.get(bucketIdx)
    let act = 'unknown'
    if (actCounts) {
      let maxCount = 0
      for (const [a, c] of actCounts.entries()) {
        if (c > maxCount) { maxCount = c; act = a }
      }
    }

    track.push({
      t:       bucketIdx * BUCKET_SIZE,
      lat:     Math.round(point.lat * 1e6) / 1e6,
      lng:     Math.round(point.lng * 1e6) / 1e6,
      alt:     Math.round(point.alt),
      spd:     Math.round(point.spd * 100) / 100,
      act,
      cumDist: Math.round(cumDist),
    })

    prevPoint = point
    prevAlt   = point.alt > 0 ? point.alt : prevAlt
  }

  // モーションバケット構築
  const motion = []
  for (const [bucketIdx, b] of Array.from(motionBuckets.entries()).sort((a, c) => a[0] - c[0])) {
    const mean     = b.sum / b.count
    const variance = b.sumSq / b.count - mean * mean
    const std      = Math.sqrt(Math.max(0, variance))
    motion.push({
      t:     bucketIdx * BUCKET_SIZE,
      mean:  Math.round(mean * 100) / 100,
      std:   Math.round(std * 100) / 100,
      max:   Math.round(b.max * 100) / 100,
      pitch: b.pitchCount > 0 ? Math.round((b.pitchSum / b.pitchCount) * 100) / 100 : 0,
    })
  }

  // アクティビティサマリー（全バケット集計）
  const actSummary = { stationarySec: 0, walkingSec: 0, cyclingSec: 0, unknownSec: 0 }
  for (const [, counts] of actBuckets.entries()) {
    let maxCount = 0
    let act = 'unknown'
    for (const [a, c] of counts.entries()) {
      if (c > maxCount) { maxCount = c; act = a }
    }
    if (act === 'stationary')   actSummary.stationarySec += BUCKET_SIZE
    else if (act === 'walking') actSummary.walkingSec    += BUCKET_SIZE
    else if (act === 'cycling') actSummary.cyclingSec    += BUCKET_SIZE
    else                        actSummary.unknownSec    += BUCKET_SIZE
  }

  const durationSec    = track.length > 0 ? track[track.length - 1].t + BUCKET_SIZE : 0
  const totalDistanceM = track.length > 0 ? track[track.length - 1].cumDist : 0
  const startTime      = new Date(startEpochMs).toISOString()
  const maxHR          = hrReadings.length > 0 ? Math.max(...hrReadings.map(h => h.bpm)) : 0
  const avgHR          = hrReadings.length > 0
    ? Math.round(hrReadings.reduce((s, h) => s + h.bpm, 0) / hrReadings.length)
    : 0

  const output = {
    meta: {
      date,
      label,
      startTime,
      durationSec,
      totalDistanceM,
      elevationGainM: Math.round(elevationGain),
      maxHR,
      avgHR,
      totalSteps: lastSteps,
      boundingBox: {
        minLat: Math.round(minLat * 1e6) / 1e6,
        maxLat: Math.round(maxLat * 1e6) / 1e6,
        minLng: Math.round(minLng * 1e6) / 1e6,
        maxLng: Math.round(maxLng * 1e6) / 1e6,
      },
      activitySummary: actSummary,
    },
    track,
    hr:     hrReadings,
    motion,
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const outPath = path.join(OUT_DIR, `${label}.json`)
  fs.writeFileSync(outPath, JSON.stringify(output))
  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1)
  console.log(`  Output: ${outPath} (${sizeKB} KB)`)
  console.log(`  Duration: ${Math.round(durationSec / 60)}m | Distance: ${(totalDistanceM / 1000).toFixed(2)} km`)
  console.log(`  Steps: ${lastSteps} | HR: avg ${avgHR} max ${maxHR}`)

  return {
    date,
    label,
    durationSec,
    totalDistanceM,
    maxHR,
    avgHR,
    totalSteps: lastSteps,
  }
}

async function main() {
  const sessions = targetLabel
    ? SESSIONS.filter(s => s.label === targetLabel)
    : SESSIONS

  if (sessions.length === 0) {
    console.error(`Session not found: ${targetLabel}`)
    process.exit(1)
  }

  const results = []
  for (const session of sessions) {
    const result = await processSession(session)
    if (result) results.push(result)
  }

  // watch-index.json を更新
  const indexPath = path.join(OUT_DIR, 'watch-index.json')
  let index = []
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
  }
  for (const result of results) {
    index = index.filter(s => s.label !== result.label)
    index.push(result)
  }
  index.sort((a, b) => b.date.localeCompare(a.date) || b.label.localeCompare(a.label))

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
  console.log(`\nwatch-index.json updated: ${index.length} sessions`)
  for (const s of index) {
    console.log(`  ${s.date} [${s.label}] - ${Math.round(s.durationSec / 60)}m, HR max ${s.maxHR}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
