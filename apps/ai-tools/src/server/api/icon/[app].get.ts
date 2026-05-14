import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const APP_COLORS: Record<string, [number, number, number]> = {
  deepheart:  [0xf4, 0x3f, 0x5e],
  mlb:        [0x1e, 0x3a, 0x8a],
  keiko:      [0x3b, 0x82, 0xf6],
  hagemashi:  [0xf9, 0x73, 0x16],
  whisper:    [0x8b, 0x5c, 0xf6],
  task:       [0x10, 0xb9, 0x81],
  marriage:   [0xdb, 0x27, 0x77],
}

function crc32(buf: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc & 1) ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type)
  const out = new Uint8Array(12 + data.length)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, data.length)
  out.set(typeBytes, 4)
  out.set(data, 8)
  const crcBuf = new Uint8Array(4 + data.length)
  crcBuf.set(typeBytes)
  crcBuf.set(data, 4)
  dv.setUint32(8 + data.length, crc32(crcBuf))
  return out
}

async function zlibCompress(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate')
  const writer = cs.writable.getWriter()
  writer.write(data)
  writer.close()
  const reader = cs.readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) { out.set(c, off); off += c.length }
  return out
}

async function makeSolidPng(size: number, r: number, g: number, b: number): Promise<Uint8Array> {
  const ihdrData = new Uint8Array(13)
  const ihdrView = new DataView(ihdrData.buffer)
  ihdrView.setUint32(0, size)
  ihdrView.setUint32(4, size)
  ihdrData[8] = 8
  ihdrData[9] = 2
  const raw = new Uint8Array(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      raw[row + 1 + x * 3]     = r
      raw[row + 1 + x * 3 + 1] = g
      raw[row + 1 + x * 3 + 2] = b
    }
  }
  const compressed = await zlibCompress(raw)
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', new Uint8Array(0)),
  ]
  const total = parts.reduce((n, p) => n + p.length, 0)
  const png = new Uint8Array(total)
  let off = 0
  for (const p of parts) { png.set(p, off); off += p.length }
  return png
}

export default defineEventHandler(async (event) => {
  const app = getRouterParam(event, 'app') ?? ''
  const color = APP_COLORS[app]
  if (!color) throw createError({ statusCode: 404, message: 'Unknown app' })

  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'public, max-age=604800, immutable')

  // 絵文字PNGが生成済みであればそちらを返す
  if (!import.meta.env.DEV) {
    try {
      const pngPath = join(process.cwd(), '.output/public', `apple-touch-icon-${app}.png`)
      const file = await readFile(pngPath)
      return file
    } catch { /* fall through to generated PNG */ }
  } else {
    try {
      const pngPath = join(process.cwd(), 'src/public', `apple-touch-icon-${app}.png`)
      const file = await readFile(pngPath)
      return file
    } catch { /* fall through to generated PNG */ }
  }

  return makeSolidPng(192, ...color)
})
