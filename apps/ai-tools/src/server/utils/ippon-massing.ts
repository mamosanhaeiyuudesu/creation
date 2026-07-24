// マッシングモデル（GLB）の手続き生成。
//
// なぜサーバーで手を動かして GLB を作るのか:
//   3D生成API（Tripo等）の鍵が無い状態でも、Claude が読み取った構造化寸法
//   （幅×奥行×高・棚段数・種別・脚の有無）から「グレー単色のかたまり模型」を返せば、
//   打合せで massing（かたまり感・比率）を伝える用途は十分に足りる（仕様§9 の未決事項）。
//   鍵が来たら provider=tripo に切り替えてフォトリアルなメッシュへ差し替える。
//
// 出力は自己完結した GLB（binary glTF）の data URL。D1 にそのまま保存でき、
// 共有リンク先でも外部依存なく model-viewer で開ける。

import type { MassingSpec, StylePreset } from '~/types/ippon'

// パネル1枚 = 単位立方体を平行移動・スケールしたノード。
interface Part {
  t: [number, number, number] // translation (m)
  s: [number, number, number] // scale (m) = 実寸
}

const T = 0.03 // パネル厚 30mm（見た目用の目安）

// スタイル別の基調色（glTF baseColorFactor はリニア扱い）。
const STYLE_COLOR: Record<StylePreset, [number, number, number]> = {
  natural: [0.62, 0.47, 0.3],
  modern: [0.75, 0.76, 0.78],
  industrial: [0.28, 0.3, 0.33],
  white: [0.92, 0.92, 0.93],
}

/** スペックからどの形で作るかを決める。 */
function deriveForm(spec: MassingSpec): 'shelf' | 'table' | 'block' {
  if (spec.shelves > 0) return 'shelf'
  if (spec.hasLegs) return 'table'
  return 'block'
}

/** 実寸パネルの一覧を組み立てる（底面 y=0 を床とする）。 */
function buildParts(spec: MassingSpec): Part[] {
  const W = Math.max(0.1, spec.widthMm / 1000)
  const H = Math.max(0.1, spec.heightMm / 1000)
  const D = Math.max(0.1, spec.depthMm / 1000)
  const t = Math.min(T, W / 4, H / 4, D / 4)
  const parts: Part[] = []
  const form = deriveForm(spec)

  if (form === 'shelf') {
    parts.push({ s: [W, H, t], t: [0, H / 2, -D / 2 + t / 2] }) // 背面
    parts.push({ s: [t, H, D], t: [-W / 2 + t / 2, H / 2, 0] }) // 左側板
    parts.push({ s: [t, H, D], t: [W / 2 - t / 2, H / 2, 0] }) // 右側板
    parts.push({ s: [W, t, D], t: [0, H - t / 2, 0] }) // 天板
    parts.push({ s: [W, t, D], t: [0, t / 2, 0] }) // 地板
    const n = Math.min(spec.shelves, 12)
    const innerW = Math.max(0.02, W - 2 * t)
    for (let i = 1; i <= n; i++) {
      const y = t + ((H - 2 * t) * i) / (n + 1)
      parts.push({ s: [innerW, t, D - t], t: [0, y, t / 2] })
    }
  } else if (form === 'table') {
    const topThk = t * 1.5
    const legH = Math.max(0.05, H - topThk)
    parts.push({ s: [W, topThk, D], t: [0, H - topThk / 2, 0] }) // 天板
    const lx = W / 2 - t / 2
    const lz = D / 2 - t / 2
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push({ s: [t, legH, t], t: [sx * lx, legH / 2, sz * lz] })
      }
    }
  } else {
    parts.push({ s: [W, H, D], t: [0, H / 2, 0] }) // 単一のかたまり
  }
  return parts
}

// ── 単位立方体（24頂点・法線付き・36インデックス）──
// doubleSided を有効にするので巻き順は気にしない。
const CUBE_POS: number[] = [
  // +X
  0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
  // -X
  -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5,
  // +Y
  -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
  // -Y
  -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5,
  // +Z
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  // -Z
  0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
]
const CUBE_NRM: number[] = [
  1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
  -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
  0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
  0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
]
const CUBE_IDX: number[] = (() => {
  const idx: number[] = []
  for (let f = 0; f < 6; f++) {
    const b = f * 4
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }
  return idx
})()

function u8ToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

function pad4(n: number): number {
  return (4 - (n % 4)) % 4
}

/** マッシングスペックから GLB(data URL) を生成する。 */
export function buildMassingGlb(spec: MassingSpec): string {
  const parts = buildParts(spec)
  const color = STYLE_COLOR[spec.style] ?? STYLE_COLOR.modern

  // ── BIN バッファ（単位立方体を1つだけ格納。各パネルはノードのTRSで使い回す）──
  const posBytes = CUBE_POS.length * 4
  const nrmBytes = CUBE_NRM.length * 4
  const idxBytes = CUBE_IDX.length * 2
  const binLen = posBytes + nrmBytes + idxBytes
  const bin = new Uint8Array(binLen)
  const dv = new DataView(bin.buffer)
  let o = 0
  for (const v of CUBE_POS) { dv.setFloat32(o, v, true); o += 4 }
  for (const v of CUBE_NRM) { dv.setFloat32(o, v, true); o += 4 }
  for (const v of CUBE_IDX) { dv.setUint16(o, v, true); o += 2 }

  const gltf = {
    asset: { version: '2.0', generator: 'ippon-massing' },
    scene: 0,
    scenes: [{ nodes: parts.map((_, i) => i) }],
    nodes: parts.map((p) => ({ mesh: 0, translation: p.t, scale: p.s })),
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [{
      pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: 0, roughnessFactor: 0.85 },
      doubleSided: true,
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
      { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: posBytes, byteLength: nrmBytes, target: 34962 },
      { buffer: 0, byteOffset: posBytes + nrmBytes, byteLength: idxBytes, target: 34963 },
    ],
    buffers: [{ byteLength: binLen }],
  }

  // ── GLB 組み立て（ヘッダ + JSONチャンク + BINチャンク）──
  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf))
  const jsonPad = pad4(jsonBytes.length)
  const binPad = pad4(binLen)
  const jsonChunkLen = jsonBytes.length + jsonPad
  const binChunkLen = binLen + binPad
  const total = 12 + 8 + jsonChunkLen + 8 + binChunkLen

  const glb = new Uint8Array(total)
  const gdv = new DataView(glb.buffer)
  let p = 0
  gdv.setUint32(p, 0x46546c67, true); p += 4 // 'glTF'
  gdv.setUint32(p, 2, true); p += 4 // version
  gdv.setUint32(p, total, true); p += 4 // length
  // JSON chunk
  gdv.setUint32(p, jsonChunkLen, true); p += 4
  gdv.setUint32(p, 0x4e4f534a, true); p += 4 // 'JSON'
  glb.set(jsonBytes, p); p += jsonBytes.length
  for (let i = 0; i < jsonPad; i++) { glb[p++] = 0x20 } // 空白でパディング
  // BIN chunk
  gdv.setUint32(p, binChunkLen, true); p += 4
  gdv.setUint32(p, 0x004e4942, true); p += 4 // 'BIN\0'
  glb.set(bin, p); p += binLen
  for (let i = 0; i < binPad; i++) { glb[p++] = 0x00 }

  return `data:model/gltf-binary;base64,${u8ToBase64(glb)}`
}

/** Interpretation から MassingSpec を正規化（不明値は無難な既定で埋める）。 */
export function toMassingSpec(
  it: { category: string; width_mm: number | null; height_mm: number | null; depth_mm: number | null; shelves: number | null; has_legs: boolean },
  style: StylePreset
): MassingSpec {
  return {
    category: it.category || '什器',
    widthMm: clampNum(it.width_mm, 200, 4000, 900),
    depthMm: clampNum(it.depth_mm, 100, 1500, 350),
    heightMm: clampNum(it.height_mm, 100, 3000, 900),
    shelves: Math.max(0, Math.min(12, Math.round(it.shelves ?? 0))),
    hasLegs: !!it.has_legs,
    style,
  }
}

function clampNum(v: number | null, min: number, max: number, fallback: number): number {
  if (v == null || !Number.isFinite(v)) return fallback
  return Math.max(min, Math.min(max, v))
}
