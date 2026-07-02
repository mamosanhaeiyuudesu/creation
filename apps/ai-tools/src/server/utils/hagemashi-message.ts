/**
 * hagemashi のプッシュ通知メッセージ（傾向分析の励まし／音声入力ナッジ）を組み立てる。
 * Cron タスクとテスト送信 API の両方から利用する。
 */

interface HistoryRow {
  text: string
  title: string
  notes: string | null
  created_at: string // 'YYYY-MM-DD HH:MM:SS'（UTC）
}

export interface HagemashiPayload {
  title: string
  body: string
  url: string
  tag: string
}

// D1 の datetime('now') 文字列（UTC）を Date に
function parseUtc(s: string): Date {
  return new Date(s.replace(' ', 'T') + 'Z')
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (24 * 3600 * 1000)
}

// notes JSON（中間データ）を読みやすいテキストに変換
function parseNotesToText(notes: string | null): string {
  if (!notes) return ''
  try {
    const parsed = JSON.parse(notes) as { items?: { sentiment?: string; text?: string }[]; sentiment?: string; text?: string }
    if (Array.isArray(parsed.items) && parsed.items.length > 0) {
      return parsed.items
        .map((item) => `[${item.sentiment ?? ''}] ${item.text ?? ''}`)
        .join('\n')
    }
    // 旧形式フォールバック
    if (parsed.text) return `[${parsed.sentiment ?? ''}] ${parsed.text}`
  } catch {
    return notes
  }
  return ''
}

async function generateEncouragement(apiKey: string, notesList: string[]): Promise<string> {
  const userContent = notesList.map((t, i) => `【記録${i + 1}】\n${t}`).join('\n\n')
  const system =
    'あなたは相手に寄り添うカウンセラーです。以下は相手の最近の出来事・気持ちを[ポジ]/[ネガ]で分類した記録です。' +
    '全体の傾向（何をがんばっているか、どんな感情が多いか）を読み取り、プッシュ通知として届く励ましメッセージを作成してください。' +
    '日本語で60文字以内、具体的な内容に触れて前向きに、絵文字は使わないこと。メッセージ本文だけを返すこと。'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}`)
  const data = (await res.json()) as { content?: { text?: string }[] }
  return (data?.content?.[0]?.text ?? '').trim()
}

/**
 * プッシュ通知の励まし内容を通常の励まし履歴（app_history, app='hagemashi-encourage'）に保存し、IDを返す。
 */
export async function savePushEncouragement(db: any, userId: string, payload: HagemashiPayload): Promise<string> {
  const id = Date.now().toString()
  const createdAt = new Date().toISOString().replace('T', ' ').replace('Z', '')
  const title = payload.body.length > 20 ? payload.body.slice(0, 20) + '…' : payload.body
  // notes は NOT NULL 制約のため空文字を渡す（null だと制約違反で INSERT 失敗する）
  await db
    .prepare('INSERT INTO app_history (id, user_id, app, text, title, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, userId, 'hagemashi-encourage', payload.body, title, '', createdAt)
    .run()
  return id
}

/**
 * ユーザーの直近の記録から、送信すべきプッシュ通知のペイロードを組み立てる。
 * - 一定日数記録が無ければ → 音声入力ナッジ
 * - 記録があれば → 中間データを Claude で分析した励まし
 */
export async function buildHagemashiPayload(
  db: any,
  userId: string,
  nudgeAfterSilentDays: number,
  anthropicApiKey: string,
  now: Date = new Date()
): Promise<HagemashiPayload> {
  const hist = await db
    .prepare(
      `SELECT text, title, notes, created_at FROM app_history
       WHERE user_id = ? AND app = 'hagemashi' ORDER BY created_at DESC LIMIT 10`
    )
    .bind(userId)
    .all()

  const rows = (hist.results ?? []) as HistoryRow[]
  const latest = rows[0] ? parseUtc(rows[0].created_at) : null
  const silentDays = latest ? daysBetween(now, latest) : Infinity

  if (silentDays >= nudgeAfterSilentDays) {
    // 沈黙 → 音声入力を促す
    return {
      title: 'はげまし',
      body: 'しばらく話していませんね。今日の気持ちを声で残してみませんか？',
      url: '/hagemashi',
      tag: 'hagemashi-nudge',
    }
  }

  // 記録あり → 中間データ（notes）を優先して傾向分析、なければ文字起こし本文
  const texts = rows
    .map((r) => parseNotesToText(r.notes) || r.text?.trim() || '')
    .filter(Boolean)
    .slice(0, 5)
  let body = 'あなたのペースで大丈夫。今日もおつかれさまです。'
  if (texts.length && anthropicApiKey) {
    const generated = await generateEncouragement(anthropicApiKey, texts).catch(() => '')
    if (generated) body = generated
  }
  return { title: 'はげまし', body, url: '/hagemashi', tag: 'hagemashi-encourage' }
}
