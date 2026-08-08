/**
 * task アラート（重要タスクのメール通知）の共通処理。
 *
 * - 設定の読み書き（task_alerts テーブル。メールアドレスは encrypt.ts で暗号化）
 * - Trello から重要タスク（赤ラベル）を収集
 * - メール本文の組み立て
 * - Resend（HTTP API）での送信
 *
 * Cron（src/server/tasks/task-alert.ts）とAPI（src/server/api/task/alert*.ts）の
 * 両方から使うため、H3Event ではなく Worker の env を受け取る形にしている。
 */

import { decryptWithKey } from './encrypt'
import { callOpenAi, extractText } from './openai'

export interface AlertSettings {
  enabled: boolean
  email: string
  /** JST の送信時刻（0-23）。複数指定可 */
  hours: number[]
}

export interface AlertTask {
  /** 複数アカウントのときだけ入る表示用のアカウント名 */
  account: string
  board: string
  name: string
  status: 'DOING' | 'TODO'
  due: string | null
  dueLabel: string
  overdue: boolean
  urgent: boolean
}

/** カード名末尾の「 3」（工数）を切り離す。useTaskBoards の parseTaskName と同じ規則。 */
function stripEffort(name: string): string {
  const m = name.match(/ (\d{1,2})$/)
  return m ? name.slice(0, -m[0].length) : name
}

/** "8, 13,18" → [8,13,18]。範囲外・重複・非数値は落とす。 */
export function parseHours(raw: string | number[] | null | undefined): number[] {
  const list = Array.isArray(raw) ? raw : String(raw ?? '').split(',')
  const nums = list
    .map(v => (typeof v === 'number' ? v : parseInt(String(v).trim(), 10)))
    .filter(n => Number.isInteger(n) && n >= 0 && n <= 23)
  return [...new Set(nums)].sort((a, b) => a - b)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function ensureTaskAlertTable(db: any): Promise<void> {
  // D1 の exec() は改行区切りを1文の区切りとして扱うため、複数行のDDLは prepare().run() で流す。
  // ここで失敗したら後続のクエリも必ず失敗するので握りつぶさず、原因が分かるように投げる。
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS task_alerts (
      user_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0,
      email_enc TEXT NOT NULL DEFAULT '', hours TEXT NOT NULL DEFAULT '',
      last_sent_at TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run()
}

// --- Trello ---

async function trelloGet(key: string, token: string, path: string): Promise<any> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`https://api.trello.com/1${path}${sep}key=${key}&token=${token}`)
  if (!res.ok) throw new Error(`Trello API Error: ${res.status}`)
  return res.json()
}

export interface DoneTask {
  /** 複数アカウントのときだけ入る表示用のアカウント名 */
  account: string
  board: string
  name: string
  /** 完了日時（Done移動時に due として記録される。useTaskBoards の execMarkDone と同じ規則） */
  doneAt: string
}

/** 期限までの残り時間を表示用に整形（useTaskBoards の timeRemaining と同じ規則） */
function describeDue(due: string | null): Pick<AlertTask, 'dueLabel' | 'overdue' | 'urgent'> {
  if (!due) return { dueLabel: '期限なし', overdue: false, urgent: false }
  const diffH = (new Date(due).getTime() - Date.now()) / 3_600_000
  if (diffH < 0) {
    const d = Math.floor(-diffH / 24)
    return { dueLabel: d > 0 ? `${d}日超過` : `${Math.floor(-diffH)}時間超過`, overdue: true, urgent: false }
  }
  if (diffH < 24) return { dueLabel: `残り${Math.floor(diffH)}時間`, overdue: false, urgent: true }
  return { dueLabel: `残り${Math.floor(diffH / 24)}日`, overdue: false, urgent: false }
}

/**
 * Trello の TODO / DOING リストから重要タスク（赤ラベル付き）を集める。
 * 画面側と同じく、リスト名が todo / doing のものだけを対象にする。
 */
export async function collectImportantTasks(
  key: string,
  token: string,
  excludedBoards: string[],
  account = '',
): Promise<AlertTask[]> {
  const rawBoards = await trelloGet(key, token, '/members/me/boards?fields=id,name')
  const boards = (rawBoards as any[]).filter(b => !excludedBoards.includes(b.name))

  const perBoard = await Promise.all(
    boards.map(async (b: any) => {
      const lists = await trelloGet(key, token, `/boards/${b.id}/lists?fields=id,name`)
      const targets = (lists as any[]).filter(l => ['todo', 'doing'].includes(String(l.name).toLowerCase()))

      const perList = await Promise.all(
        targets.map(async (list: any) => {
          const cards = await trelloGet(key, token, `/lists/${list.id}/cards?fields=id,name,due,labels`)
          const status = String(list.name).toLowerCase() === 'doing' ? 'DOING' : 'TODO'
          return (cards as any[])
            .filter(c => Array.isArray(c.labels) && c.labels.some((l: any) => l.color === 'red'))
            .map((c): AlertTask => ({
              account,
              board: b.name,
              name: stripEffort(c.name),
              status: status as 'DOING' | 'TODO',
              due: c.due ?? null,
              ...describeDue(c.due ?? null),
            }))
        }),
      )
      return perList.flat()
    }),
  )

  return sortTasks(perBoard.flat())
}

/**
 * Trello の DONE リストから、直近 sinceMs 以内に完了したタスクを集める。
 * 完了日時は Done へ移動した際に due に記録される値（useTaskBoards の execMarkDone と同じ規則）。
 */
export async function collectDoneTasks(
  key: string,
  token: string,
  excludedBoards: string[],
  sinceMs: number,
  account = '',
): Promise<DoneTask[]> {
  const rawBoards = await trelloGet(key, token, '/members/me/boards?fields=id,name')
  const boards = (rawBoards as any[]).filter(b => !excludedBoards.includes(b.name))

  const perBoard = await Promise.all(
    boards.map(async (b: any) => {
      const lists = await trelloGet(key, token, `/boards/${b.id}/lists?fields=id,name`)
      const target = (lists as any[]).find(l => String(l.name).toLowerCase() === 'done')
      if (!target) return []

      const cards = await trelloGet(key, token, `/lists/${target.id}/cards?fields=id,name,due`)
      return (cards as any[])
        .filter(c => c.due && new Date(c.due).getTime() >= sinceMs)
        .map((c): DoneTask => ({ account, board: b.name, name: stripEffort(c.name), doneAt: c.due }))
    }),
  )

  return perBoard.flat().sort((a, b) => new Date(b.doneAt).getTime() - new Date(a.doneAt).getTime())
}

/** 期限超過 → 24時間以内 → 期限が近い順 → 期限なし の順に並べる */
export function sortTasks(tasks: AlertTask[]): AlertTask[] {
  return [...tasks].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
    if (a.due && b.due) return new Date(a.due).getTime() - new Date(b.due).getTime()
    if (a.due !== b.due) return a.due ? -1 : 1
    return a.board.localeCompare(b.board, 'ja')
  })
}

// --- メール本文 ---

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** JST の "M/D HH:MM" */
function stampJST(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export function buildAlertMail(
  tasks: AlertTask[],
  appUrl = '',
  doneTasks: DoneTask[] = [],
  praiseText = '',
): { subject: string; html: string; text: string } {
  const overdueCount = tasks.filter(t => t.overdue).length
  const subject = overdueCount
    ? `【重要タスク ${tasks.length}件・期限超過 ${overdueCount}件】${stampJST()}`
    : `【重要タスク ${tasks.length}件】${stampJST()}`

  const rows = tasks.map(t => {
    const color = t.overdue ? '#dc2626' : t.urgent ? '#d97706' : '#64748b'
    const where = [t.account, t.board].filter(Boolean).join(' / ')
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">
          <div style="font-size:15px;color:#0f172a;font-weight:600;">${escapeHtml(t.name)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:3px;">${escapeHtml(where)}・${t.status}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;font-size:13px;font-weight:700;color:${color};">
          ${escapeHtml(t.dueLabel)}
        </td>
      </tr>`
  }).join('')

  const link = appUrl
    ? `<p style="margin:20px 0 0;font-size:13px;"><a href="${escapeHtml(appUrl)}/task" style="color:#0284c7;">タスクくんを開く</a></p>`
    : ''

  const doneSection = doneTasks.length ? `
    <div style="padding:16px 20px 4px;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">✅ 直近24時間で完了（${doneTasks.length}件）</div>
      <ul style="margin:0;padding:0 0 0 18px;">
        ${doneTasks.map(t => `<li style="font-size:13px;color:#334155;margin-bottom:4px;">${escapeHtml(t.name)}<span style="color:#94a3b8;">（${escapeHtml([t.account, t.board].filter(Boolean).join(' / '))}）</span></li>`).join('')}
      </ul>
    </div>` : ''

  const praiseSection = praiseText ? `
    <div style="padding:14px 20px;margin:0 20px 16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;">
      <div style="font-size:12px;font-weight:700;color:#0284c7;margin-bottom:6px;">💬 ひとこと</div>
      <p style="margin:0;font-size:13px;line-height:1.7;color:#0f172a;white-space:pre-wrap;">${escapeHtml(praiseText)}</p>
    </div>` : ''

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;background:#f8fafc;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <div style="background:#0f172a;padding:16px 20px;">
      <div style="color:#f8fafc;font-size:16px;font-weight:700;">📋 重要タスクのお知らせ</div>
      <div style="color:#94a3b8;font-size:12px;margin-top:4px;">${escapeHtml(stampJST())} 時点・${tasks.length}件${overdueCount ? `（うち期限超過 ${overdueCount}件）` : ''}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    ${doneSection}
    ${praiseSection}
    <div style="padding:14px 20px;background:#f8fafc;">
      ${link}
      <p style="margin:${link ? '10px' : '0'} 0 0;font-size:11px;color:#94a3b8;">この通知はタスクくんの設定 → アラートから停止・変更できます。</p>
    </div>
  </div>
</div>`.trim()

  const text = [
    `重要タスクのお知らせ（${stampJST()} 時点・${tasks.length}件）`,
    '',
    ...tasks.map(t => `・[${t.dueLabel}] ${t.name}（${[t.account, t.board].filter(Boolean).join(' / ')}・${t.status}）`),
    ...(doneTasks.length ? ['', `直近24時間で完了（${doneTasks.length}件）`, ...doneTasks.map(t => `・${t.name}（${[t.account, t.board].filter(Boolean).join(' / ')}）`)] : []),
    ...(praiseText ? ['', praiseText] : []),
    '',
    appUrl ? `${appUrl}/task` : '',
    'この通知はタスクくんの設定 → アラートから停止・変更できます。',
  ].filter(l => l !== '').join('\n')

  return { subject, html, text }
}

// --- 送信 ---

/**
 * Resend（HTTP API）で送る。
 * Cloudflare の Email Sending は Workers Paid 必須だったため、無料枠のある Resend を使っている。
 *   env.NUXT_RESEND_API_KEY  … Resend の API キー（wrangler secret put）
 *   env.NUXT_ALERT_MAIL_FROM … 送信元（Resend で認証済みドメインのアドレス）
 */
export async function sendAlertMail(env: any, to: string, mail: { subject: string; html: string; text: string }): Promise<void> {
  const apiKey = env?.NUXT_RESEND_API_KEY
  if (!apiKey) throw new Error('NUXT_RESEND_API_KEY が未設定です（wrangler secret put NUXT_RESEND_API_KEY）')

  const from = env?.NUXT_ALERT_MAIL_FROM
  if (!from) throw new Error('NUXT_ALERT_MAIL_FROM が未設定です（送信元アドレスを設定してください）')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `タスクくん <${from}>`,
      to: [to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
  })

  if (!res.ok) {
    // Resend はエラー詳細を JSON で返すので、原因が分かるようそのまま載せる
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend API Error: ${res.status} ${detail}`)
  }
}

/**
 * 指定ユーザーの全 Trello アカウントから重要タスクを集める。
 * アカウントが複数あるときだけ、タスクにアカウント名を添える。
 */
export async function collectImportantTasksForUser(db: any, encryptionKey: string, userId: string): Promise<AlertTask[]> {
  const profiles = await db
    .prepare('SELECT name, key_enc, token_enc, excluded FROM task_profiles WHERE user_id = ? ORDER BY sort_order')
    .bind(userId)
    .all<{ name: string; key_enc: string; token_enc: string; excluded: string }>()

  const rows = profiles.results ?? []
  const multi = rows.length > 1
  const collected: AlertTask[] = []

  for (const p of rows) {
    const key = await decryptWithKey(encryptionKey, p.key_enc)
    const token = await decryptWithKey(encryptionKey, p.token_enc)
    if (!key || !token) continue
    const excluded = String(p.excluded ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)
    collected.push(...await collectImportantTasks(key, token, excluded, multi ? p.name : ''))
  }

  return sortTasks(collected)
}

/**
 * 指定ユーザーの全 Trello アカウントから、直近24時間で完了したタスクを集める。
 * アカウントが複数あるときだけ、タスクにアカウント名を添える。
 */
export async function collectDoneTasksForUser(db: any, encryptionKey: string, userId: string): Promise<DoneTask[]> {
  const profiles = await db
    .prepare('SELECT name, key_enc, token_enc, excluded FROM task_profiles WHERE user_id = ? ORDER BY sort_order')
    .bind(userId)
    .all<{ name: string; key_enc: string; token_enc: string; excluded: string }>()

  const rows = profiles.results ?? []
  const multi = rows.length > 1
  const sinceMs = Date.now() - 24 * 3_600_000
  const collected: DoneTask[] = []

  for (const p of rows) {
    const key = await decryptWithKey(encryptionKey, p.key_enc)
    const token = await decryptWithKey(encryptionKey, p.token_enc)
    if (!key || !token) continue
    const excluded = String(p.excluded ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)
    collected.push(...await collectDoneTasks(key, token, excluded, sinceMs, multi ? p.name : ''))
  }

  return collected.sort((a, b) => new Date(b.doneAt).getTime() - new Date(a.doneAt).getTime())
}

// --- 褒めメッセージ ---

/**
 * 直近24時間の完了タスクを踏まえ、落ち着いたトーンで労うメッセージを生成する（日本語300文字程度）。
 * OpenAI呼び出しに失敗しても通知本体は送りたいので、失敗時は空文字を返す（呼び出し側で握りつぶす）。
 */
export async function buildPraiseText(env: any, doneTasks: DoneTask[]): Promise<string> {
  if (!doneTasks.length) return ''
  const apiKey = env?.NUXT_OPENAI_API_KEY
  if (!apiKey) return ''

  const boards = [...new Set(doneTasks.map(t => t.board))]
  const tasksText = doneTasks.map(t => `・[${[t.account, t.board].filter(Boolean).join(' / ')}] ${t.name}`).join('\n')

  const systemPrompt = `あなたは相手の努力を「冷静かつ的確に」認め、労う存在です。タスク管理データを踏まえたうえで、落ち着いたトーンで称えてください。
以下のルールを厳守してください：

- 誇張しない：感嘆符を多用せず、事実に基づいた穏やかな言葉で評価する
- タスク名を具体的に引用する：タスク名や内容から事実を拾い、「【タスク名】を進められたのは着実な前進です」のように具体的に触れる
- 落ち着いた励まし：「よく取り組まれています」「着実に積み重ねられています」など、信頼感のある言葉を使う
- ボード横断：${boards.length > 1 ? `複数のボード（${boards.join('・')}）にまたがる活動全体をバランスよく振り返る` : '全タスクをバランスよく振り返る'}
- 感嘆符は使わないか、使っても最小限にとどめる
- 最後は穏やかな労いや今後への後押しで締める
- 中学生でもわかる平易な言葉を使う
- 日本語300文字程度で出力`

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `【直近24時間で完了したタスク（${doneTasks.length}件）】\n${tasksText}\n\n上記のタスク内容に踏み込んだ労いのメッセージを日本語300文字程度で。` },
      ],
    }, undefined, 'task/alert-praise')
    return extractText(data)
  } catch {
    return ''
  }
}
