export interface Point {
  x: number
  y: number
}

function dir(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  return { ux: dx / len, uy: dy / len, px: -dy / len, py: dx / len, len }
}

/** ジグザグ線の折れ点列。<polyline>の points に渡す文字列を返す */
export function zigzagPoints(x1: number, y1: number, x2: number, y2: number, segments = 7, amplitude = 5): string {
  const { ux, uy, px, py, len } = dir(x1, y1, x2, y2)
  const pts: Point[] = []
  for (let i = 0; i <= segments; i++) {
    const t = (len * i) / segments
    const side = i === 0 || i === segments ? 0 : i % 2 === 1 ? 1 : -1
    pts.push({
      x: x1 + ux * t + px * amplitude * side,
      y: y1 + uy * t + py * amplitude * side,
    })
  }
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

/** 波線のパス文字列(二次ベジェを連結)。<path> の d に渡す */
export function wavePath(x1: number, y1: number, x2: number, y2: number, segments = 8, amplitude = 6): string {
  const { ux, uy, px, py, len } = dir(x1, y1, x2, y2)
  let d = `M ${x1.toFixed(1)} ${y1.toFixed(1)}`
  for (let i = 0; i < segments; i++) {
    const side = i % 2 === 0 ? 1 : -1
    const tMid = (len * (i + 0.5)) / segments
    const tEnd = (len * (i + 1)) / segments
    const cx = x1 + ux * tMid + px * amplitude * side
    const cy = y1 + uy * tMid + py * amplitude * side
    const ex = x1 + ux * tEnd
    const ey = y1 + uy * tEnd
    d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`
  }
  return d
}

/** 線の向きに対して斜め45度に交差する短い線分(離婚/別居の印用) */
export function diagonalTick(x1: number, y1: number, x2: number, y2: number, t: number, length = 7) {
  const { ux, uy, px, py, len } = dir(x1, y1, x2, y2)
  const cx = x1 + ux * t
  const cy = y1 + uy * t
  const tux = (ux + px) / Math.SQRT2
  const tuy = (uy + py) / Math.SQRT2
  return {
    x1: cx - (tux * length) / 2,
    y1: cy - (tuy * length) / 2,
    x2: cx + (tux * length) / 2,
    y2: cy + (tuy * length) / 2,
  }
}

/** 線に対して垂直な短い線分(感情的絶縁=cutoffの区切り線用) */
export function perpendicularTick(x1: number, y1: number, x2: number, y2: number, t: number, length = 10) {
  const { ux, uy, px, py } = dir(x1, y1, x2, y2)
  const cx = x1 + ux * t
  const cy = y1 + uy * t
  return {
    x1: cx - (px * length) / 2,
    y1: cy - (py * length) / 2,
    x2: cx + (px * length) / 2,
    y2: cy + (py * length) / 2,
  }
}

/** 線を法線方向に offset だけ平行移動した座標を返す(共依存の二重線用) */
export function offsetLine(x1: number, y1: number, x2: number, y2: number, offset: number) {
  const { px, py } = dir(x1, y1, x2, y2)
  return {
    x1: x1 + px * offset,
    y1: y1 + py * offset,
    x2: x2 + px * offset,
    y2: y2 + py * offset,
  }
}

/** 直線を(clipStart, clipEnd)の分だけ端点から内側に詰めた座標を返す(シンボル境界を避けるため) */
export function clipLine(x1: number, y1: number, x2: number, y2: number, clipStart: number, clipEnd: number) {
  const { ux, uy, len } = dir(x1, y1, x2, y2)
  const start = Math.min(clipStart, len / 2 - 1)
  const end = Math.min(clipEnd, len / 2 - 1)
  return {
    x1: x1 + ux * start,
    y1: y1 + uy * start,
    x2: x2 - ux * end,
    y2: y2 - uy * end,
  }
}
