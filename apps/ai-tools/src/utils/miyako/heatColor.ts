// ヒートマップセルの背景色を計算する（#E6F0FB → #134C9C。キキガキ本番版の青の濃淡）
export function heatColor(value: number, min: number, max: number) {
  const t = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)))
  const r = Math.round(0xE6 + t * (0x13 - 0xE6))
  const g = Math.round(0xF0 + t * (0x4C - 0xF0))
  const b = Math.round(0xFB + t * (0x9C - 0xFB))
  return { bg: `rgb(${r},${g},${b})`, light: t < 0.45 }
}
