const SPELLS = [
  'SAKURA',
  'FUJI',
  'KOMOREBI',
  'WABISABI',
  'KOTODAMA',
  'FUSHIGI',
  'YUGENGEKKA',
  'MUGENNOSORA',
]

function normalize(s: string): string {
  return s
    .toUpperCase()
    .trim()
    .replace(/[\s　]/g, '')
    // 全角アルファベット → 半角
    .replace(/[Ａ-Ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ level: number; guess: string }>(event)
  if (!body?.level || !body?.guess) {
    throw createError({ statusCode: 400, statusMessage: 'level と guess は必須です' })
  }
  const level = Math.min(Math.max(1, body.level), 8)
  const spell = SPELLS[level - 1]
  const correct = normalize(body.guess) === normalize(spell)
  return { correct }
})
