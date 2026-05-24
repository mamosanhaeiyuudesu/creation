import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SENSOR_DATA_DIR = path.join(__dirname, '../../../sensor_data')
const OUT_DIR = path.join(__dirname, '../src/public/data/farm-log')
const BUCKET_SIZE = 10

// セッション定義: { folder, date, activity, epochMs }
const SESSIONS = [
  {
    folder: '2026-05-21_22-56-41',
    date: '2026-05-22',
    activity: '農園巡回',
    epochMs: 1779404201726,
  },
  {
    folder: '2026-05-22_21-08-57',
    date: '2026-05-23',
    activity: 'キウイ受粉',
    epochMs: 1779484137532,
  },
  {
    folder: '2026-05-23_06-19-57',
    date: '2026-05-23',
    activity: 'キウイ受粉',
    epochMs: 1779517197425,
  },
  {
    folder: '2026-05-23_21-21-29',
    date: '2026-05-24',
    activity: '草刈り',
    epochMs: 1779571289468,
  },
]

// コマンドライン引数でフォルダ名を指定した場合はそのセッションのみ処理
const targetFolder = process.argv[2] || null

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function classifyActivity(speed) {
  if (speed < 0.5) return 0
  if (speed < 2.5) return 1
  return 2
}

async function processLocation(dataDir) {
  console.log('  Reading Location.csv...')
  const content = fs.readFileSync(path.join(dataDir, 'Location.csv'), 'utf-8')
  const lines = content.trim().split('\n')

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(',')
    const t = parseFloat(p[1])
    const spd = parseFloat(p[6])
    const lat = parseFloat(p[10])
    const lng = parseFloat(p[9])
    const alt = parseFloat(p[8])
    if (isNaN(t) || isNaN(lat) || isNaN(lng)) continue
    rows.push({ t, lat, lng, alt, spd })
  }
  rows.sort((a, b) => a.t - b.t)
  console.log(`  Parsed ${rows.length} GPS rows`)

  const bucketMap = new Map()
  for (const row of rows) {
    const bucket = Math.floor(row.t / BUCKET_SIZE)
    if (!bucketMap.has(bucket)) bucketMap.set(bucket, [])
    bucketMap.get(bucket).push(row)
  }

  const track = []
  const sortedBuckets = Array.from(bucketMap.entries()).sort((a, b) => a[0] - b[0])

  let cumDist = 0
  let prevPoint = null
  let prevAlt = null
  let elevationGain = 0
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity

  for (const [bucketIdx, points] of sortedBuckets) {
    points.sort((a, b) => a.spd - b.spd)
    const point = points[Math.floor(points.length / 2)]

    if (prevPoint) {
      cumDist += haversine(prevPoint.lat, prevPoint.lng, point.lat, point.lng)
    }
    if (prevAlt !== null && point.alt > prevAlt) {
      elevationGain += point.alt - prevAlt
    }

    minLat = Math.min(minLat, point.lat)
    maxLat = Math.max(maxLat, point.lat)
    minLng = Math.min(minLng, point.lng)
    maxLng = Math.max(maxLng, point.lng)

    track.push({
      t: bucketIdx * BUCKET_SIZE,
      lat: Math.round(point.lat * 1e6) / 1e6,
      lng: Math.round(point.lng * 1e6) / 1e6,
      alt: Math.round(point.alt),
      spd: Math.round(point.spd * 100) / 100,
      act: classifyActivity(point.spd),
      cumDist: Math.round(cumDist),
    })

    prevPoint = point
    prevAlt = point.alt
  }

  return {
    track,
    elevationGainM: Math.round(elevationGain),
    boundingBox: {
      minLat: Math.round(minLat * 1e6) / 1e6,
      maxLat: Math.round(maxLat * 1e6) / 1e6,
      minLng: Math.round(minLng * 1e6) / 1e6,
      maxLng: Math.round(maxLng * 1e6) / 1e6,
    },
  }
}

async function processMotion(dataDir) {
  console.log('  Streaming TotalAcceleration.csv...')
  const bucketMap = new Map()

  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(dataDir, 'TotalAcceleration.csv')),
    crlfDelay: Infinity,
  })

  let isHeader = true
  let lineCount = 0
  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue }
    lineCount++
    if (lineCount % 500000 === 0) process.stdout.write(`  ... ${lineCount} lines\r`)

    const p = line.split(',')
    const t = parseFloat(p[1])
    const z = parseFloat(p[2])
    const y = parseFloat(p[3])
    const x = parseFloat(p[4])
    if (isNaN(t) || isNaN(x) || isNaN(y) || isNaN(z)) continue

    const mag = Math.sqrt(x * x + y * y + z * z)
    const bucket = Math.floor(t / BUCKET_SIZE)

    if (!bucketMap.has(bucket)) {
      bucketMap.set(bucket, { sum: 0, sumSq: 0, count: 0, max: 0 })
    }
    const b = bucketMap.get(bucket)
    b.sum += mag
    b.sumSq += mag * mag
    b.count++
    if (mag > b.max) b.max = mag
  }

  console.log(`\n  Processed ${lineCount} motion rows`)

  const motion = []
  for (const [bucketIdx, b] of Array.from(bucketMap.entries()).sort((a, c) => a[0] - c[0])) {
    const mean = b.sum / b.count
    const variance = b.sumSq / b.count - mean * mean
    const std = Math.sqrt(Math.max(0, variance))
    motion.push({
      t: bucketIdx * BUCKET_SIZE,
      mean: Math.round(mean * 100) / 100,
      std: Math.round(std * 100) / 100,
      max: Math.round(b.max * 100) / 100,
    })
  }

  return motion
}

// Gyroscope.csv header: time,seconds_elapsed,z,y,x (rad/s)
async function processGyro(dataDir) {
  console.log('  Streaming Gyroscope.csv...')
  const bucketMap = new Map()

  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(dataDir, 'Gyroscope.csv')),
    crlfDelay: Infinity,
  })

  let isHeader = true
  let lineCount = 0
  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue }
    lineCount++

    const p = line.split(',')
    const t = parseFloat(p[1])
    const z = parseFloat(p[2])
    const y = parseFloat(p[3])
    const x = parseFloat(p[4])
    if (isNaN(t) || isNaN(x) || isNaN(y) || isNaN(z)) continue

    const magSq = x * x + y * y + z * z
    const bucket = Math.floor(t / BUCKET_SIZE)

    if (!bucketMap.has(bucket)) bucketMap.set(bucket, { sumSq: 0, count: 0 })
    const b = bucketMap.get(bucket)
    b.sumSq += magSq
    b.count++
  }

  console.log(`  Processed ${lineCount} gyro rows`)

  const gyro = []
  for (const [bucketIdx, b] of Array.from(bucketMap.entries()).sort((a, c) => a[0] - c[0])) {
    gyro.push({
      t: bucketIdx * BUCKET_SIZE,
      rms: Math.round(Math.sqrt(b.sumSq / b.count) * 100) / 100,
    })
  }

  return gyro
}

async function processSession(session) {
  const { folder, date, activity, epochMs } = session
  const dataDir = path.join(SENSOR_DATA_DIR, folder)

  console.log(`\n=== Processing: ${folder} ===`)
  console.log(`  Date: ${date}, Activity: ${activity}`)
  console.log(`  Data: ${dataDir}`)

  if (!fs.existsSync(dataDir)) {
    console.error(`  ERROR: Directory not found: ${dataDir}`)
    return null
  }

  console.log('\nPhase 1: GPS track')
  const { track, elevationGainM, boundingBox } = await processLocation(dataDir)
  console.log(`  Track points: ${track.length}`)
  console.log(`  Elevation gain: ${elevationGainM}m`)

  console.log('\nPhase 2: Motion intensity')
  const motion = await processMotion(dataDir)
  console.log(`  Motion buckets: ${motion.length}`)

  console.log('\nPhase 3: Gyroscope intensity')
  const gyro = await processGyro(dataDir)
  console.log(`  Gyro buckets: ${gyro.length}`)

  const durationSec = track.length > 0 ? track[track.length - 1].t + BUCKET_SIZE : 0
  const totalDistanceM = track.length > 0 ? track[track.length - 1].cumDist : 0
  const startTime = new Date(epochMs).toISOString()

  const activitySec = [0, 0, 0]
  for (const p of track) activitySec[p.act] += BUCKET_SIZE

  const output = {
    meta: {
      date,
      label: folder,
      activity,
      startTime,
      durationSec,
      totalDistanceM,
      elevationGainM,
      boundingBox,
      activitySummary: {
        stationarySec: activitySec[0],
        walkingSec: activitySec[1],
        drivingSec: activitySec[2],
      },
    },
    track,
    motion,
    gyro,
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const outPath = path.join(OUT_DIR, `${folder}.json`)
  fs.writeFileSync(outPath, JSON.stringify(output))
  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1)
  console.log(`\n  Output: ${outPath} (${sizeKB} KB)`)
  console.log(`  Duration: ${Math.round(durationSec / 60)}m | Distance: ${(totalDistanceM / 1000).toFixed(2)} km`)

  return { date, label: folder, activity, durationSec, totalDistanceM }
}

async function main() {
  const sessions = targetFolder
    ? SESSIONS.filter(s => s.folder === targetFolder)
    : SESSIONS

  if (sessions.length === 0) {
    console.error(`Session not found: ${targetFolder}`)
    process.exit(1)
  }

  const results = []
  for (const session of sessions) {
    const result = await processSession(session)
    if (result) results.push(result)
  }

  // index.json を更新
  const indexPath = path.join(OUT_DIR, 'index.json')
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
  console.log(`\n\nindex.json updated: ${index.length} sessions total`)
  for (const s of index) {
    console.log(`  ${s.date} [${s.label}] ${s.activity} - ${Math.round(s.durationSec / 60)}m`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
