// AI管理（/ai-manager）のプロンプトの差分。まず行単位の LCS で変わった行を見つけ、その中を文字単位で比べる。

export interface DiffLine {
  type: 'same' | 'add' | 'del'
  text: string
}

export function lineDiff(before: string | null, after: string | null): DiffLine[] {
  const x = (before ?? '').split('\n')
  const y = (after ?? '').split('\n')
  if (before === after) return x.map((text) => ({ type: 'same', text }))
  const n = x.length
  const m = y.length
  // 長すぎる文書は差分を出さず、前後をそのまま並べる（数千行×数千行はブラウザが固まる）
  if (n * m > 4_000_000) {
    return [...x.map((text) => ({ type: 'del' as const, text })), ...y.map((text) => ({ type: 'add' as const, text }))]
  }
  const dp: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = x[i] === y[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) {
      out.push({ type: 'same', text: x[i]! })
      i++
      j++
    } else if (j < m && (i === n || dp[i]![j + 1]! >= dp[i + 1]![j]!)) {
      out.push({ type: 'add', text: y[j++]! })
    } else {
      out.push({ type: 'del', text: x[i++]! })
    }
  }
  return out
}

// ---------------------------------------------------------------- 文章としての差分
//
// 行頭の +/- ではなく、変わった行の中の「変わった文字」だけに色を付ける。プロンプトは日本語の文章なので
// 文字単位で比べる（単語の区切りが無いため）。

export interface InlinePart {
  type: 'same' | 'add' | 'del'
  text: string
}

export interface ProseRow {
  kind: 'same' | 'changed' | 'skip'
  text?: string
  parts?: InlinePart[]
  count?: number
}

/** 文字単位の差分。細切れにならないよう、変更に挟まれた2文字以下の一致は変更側に寄せる */
export function charDiff(a: string, b: string): InlinePart[] {
  const x = [...a]
  const y = [...b]
  const n = x.length
  const m = y.length
  if (n * m > 250_000) return [{ type: 'del', text: a }, { type: 'add', text: b }]
  const dp: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = x[i] === y[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }
  const ops: InlinePart[] = []
  const add = (type: InlinePart['type'], ch: string) => {
    const last = ops[ops.length - 1]
    if (last && last.type === type) last.text += ch
    else ops.push({ type, text: ch })
  }
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) {
      add('same', x[i]!)
      i++
      j++
    } else if (i < n && (j === m || dp[i + 1]![j]! >= dp[i]![j + 1]!)) add('del', x[i++]!)
    else add('add', y[j++]!)
  }
  // 小さな一致を変更に寄せ、消した文字→足した文字の順にまとめ直す
  const out: InlinePart[] = []
  let del = ''
  let ins = ''
  const flush = () => {
    if (del) out.push({ type: 'del', text: del })
    if (ins) out.push({ type: 'add', text: ins })
    del = ''
    ins = ''
  }
  ops.forEach((op, k) => {
    const between = k > 0 && k < ops.length - 1
    if (op.type === 'same' && !(between && [...op.text].length <= 2)) {
      flush()
      out.push(op)
    } else if (op.type === 'same') {
      del += op.text
      ins += op.text
    } else if (op.type === 'del') del += op.text
    else ins += op.text
  })
  flush()
  return out
}

/** 2つの行が「同じ行を直したもの」と言えるくらい似ているか */
function similar(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false
  const parts = charDiff(a, b)
  const same = parts.filter((p) => p.type === 'same').reduce((s, p) => s + p.text.length, 0)
  return same / Math.max(a.length, b.length) >= 0.35
}

export function proseDiff(before: string | null, after: string | null, context = 1): ProseRow[] {
  const lines = lineDiff(before, after)
  const rows: ProseRow[] = []
  let k = 0
  while (k < lines.length) {
    if (lines[k]!.type === 'same') {
      rows.push({ kind: 'same', text: lines[k]!.text })
      k++
      continue
    }
    const dels: string[] = []
    const adds: string[] = []
    while (k < lines.length && lines[k]!.type !== 'same') {
      if (lines[k]!.type === 'del') dels.push(lines[k]!.text)
      else adds.push(lines[k]!.text)
      k++
    }
    // 消えた行と足した行を順に組にし、似ていれば1行の中の文字の差分として見せる
    for (let p = 0; p < Math.max(dels.length, adds.length); p++) {
      const a = dels[p]
      const b = adds[p]
      if (a !== undefined && b !== undefined && similar(a, b)) rows.push({ kind: 'changed', parts: charDiff(a, b) })
      else {
        if (a !== undefined && a.trim()) rows.push({ kind: 'changed', parts: [{ type: 'del', text: a }] })
        if (b !== undefined && b.trim()) rows.push({ kind: 'changed', parts: [{ type: 'add', text: b }] })
      }
    }
  }
  // 変わっていない行は、変更の前後 context 行だけ残して畳む
  const keep = rows.map(() => false)
  rows.forEach((r, n) => {
    if (r.kind === 'changed') for (let d = -context; d <= context; d++) if (n + d >= 0 && n + d < rows.length) keep[n + d] = true
  })
  const out: ProseRow[] = []
  let skipped = 0
  rows.forEach((r, n) => {
    if (keep[n]) {
      if (skipped) out.push({ kind: 'skip', count: skipped })
      skipped = 0
      out.push(r)
    } else skipped++
  })
  if (skipped) out.push({ kind: 'skip', count: skipped })
  return out
}

export function proseStats(rows: ProseRow[]): number {
  return rows.filter((r) => r.kind === 'changed').length
}
