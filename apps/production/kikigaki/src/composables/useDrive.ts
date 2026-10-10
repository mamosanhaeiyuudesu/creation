// Googleドライブへの保存（PDFを「キキガキ議事録」フォルダへ置く）。
//
// ログイン（Firebase）とは別に、Google Identity Services でドライブの権限を取る。
//   - 権限は drive.file だけ（このアプリが作ったファイル・フォルダにしか触れない。
//     ユーザーのドライブの他のファイルは見えない／読めない）。
//   - アクセストークンは約1時間で切れる。サーバーには渡さず保存もしない（メモリのみ）。
//     PDFもサーバーを通さず、ブラウザからドライブへ直接送る。
//   - 「連携済み」の目印は localStorage のフラグだけ（端末ごと。別の端末では最初の1回だけ許可が要る）。

const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FLAG_KEY = 'kk-drive-connected'
const FOLDER_KEY = 'kk-drive-folder'
const FOLDER_NAME = 'キキガキ議事録'

let gisPromise: Promise<any> | null = null
let token: { value: string; expiresAt: number } | null = null

function loadGis(): Promise<any> {
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    const w = window as any
    if (w.google?.accounts?.oauth2) return resolve(w.google)
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve(w.google)
    s.onerror = () => {
      gisPromise = null
      reject(new Error('Googleの画面を読み込めませんでした。インターネットの接続をご確認ください。'))
    }
    document.head.appendChild(s)
  })
  return gisPromise
}

function readLocal(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeLocal(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {
    /* 保存できなくても、そのときは毎回許可を求めるだけ */
  }
}

export function useDrive() {
  const connected = useState<boolean>('kk-drive-connected', () => false)
  const { user } = useAuth()
  const clientId = String(useRuntimeConfig().public.googleClientId ?? '')

  /** 画面を開いたときに、この端末で連携済みかを読み込む */
  function refresh() {
    connected.value = readLocal(FLAG_KEY) === '1'
  }

  function requestToken(prompt: '' | 'consent'): Promise<string> {
    if (!clientId) {
      return Promise.reject(new Error('Googleドライブの連携は、まだ設定が済んでいません。管理者にお知らせください。'))
    }
    return loadGis().then(
      (google) =>
        new Promise<string>((resolve, reject) => {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPE,
            hint: user.value?.email || undefined,
            callback: (resp: any) => {
              if (resp.error) return reject(new Error('Googleドライブとつなげませんでした。もう一度お試しください。'))
              if (!google.accounts.oauth2.hasGrantedAllScopes(resp, SCOPE)) {
                return reject(
                  new Error('ドライブへの保存が許可されませんでした。許可の画面で、チェックを入れたままお進みください。')
                )
              }
              token = { value: resp.access_token, expiresAt: Date.now() + (Number(resp.expires_in) - 60) * 1000 }
              resolve(resp.access_token)
            },
            error_callback: () =>
              reject(new Error('Googleの画面が閉じられました。つなげる場合は、もう一度押してください。')),
          })
          client.requestAccessToken({ prompt })
        })
    )
  }

  /** ボタンから呼ぶ。許可の画面を出して、連携済みにする */
  async function connect(): Promise<void> {
    await requestToken('consent')
    writeLocal(FLAG_KEY, '1')
    connected.value = true
  }

  /** 連携をやめる（この端末の目印を消し、Google側の許可も取り消す） */
  async function disconnect(): Promise<void> {
    const t = token?.value
    token = null
    writeLocal(FLAG_KEY, '')
    writeLocal(FOLDER_KEY, '')
    connected.value = false
    if (t) {
      try {
        const google = await loadGis()
        google.accounts.oauth2.revoke(t)
      } catch {
        /* 取り消せなくても、この端末からは使わなくなる */
      }
    }
  }

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt > Date.now()) return token.value
    return await requestToken('')
  }

  async function driveFetch(url: string, tok: string, init: RequestInit = {}) {
    const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${tok}` } })
    if (res.status === 401) token = null
    return res
  }

  async function ensureFolder(tok: string): Promise<string> {
    const cached = readLocal(FOLDER_KEY)
    if (cached) return cached

    const q = encodeURIComponent(
      `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    )
    const found = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, tok)
    if (found.ok) {
      const id = (await found.json()).files?.[0]?.id
      if (id) {
        writeLocal(FOLDER_KEY, id)
        return id
      }
    }
    const created = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id', tok, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    })
    if (!created.ok) throw new Error('ドライブにフォルダを作れませんでした。')
    const id = (await created.json()).id as string
    writeLocal(FOLDER_KEY, id)
    return id
  }

  /** PDFをドライブの「キキガキ議事録」フォルダへ保存する。成功したらドライブ上のリンクを返す */
  async function uploadPdf(blob: Blob, fileName: string): Promise<string> {
    const send = async (retry: boolean): Promise<string> => {
      const tok = await accessToken()
      const folderId = await ensureFolder(tok)
      const boundary = `kk${Date.now().toString(36)}`
      const meta = JSON.stringify({ name: fileName, mimeType: 'application/pdf', parents: [folderId] })
      const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
        `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
        blob,
        `\r\n--${boundary}--`,
      ])
      const res = await driveFetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=webViewLink',
        tok,
        { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body }
      )
      if (res.ok) return String((await res.json()).webViewLink ?? '')
      // フォルダを消された（キャッシュが古い）／トークンが切れていた → 1度だけやり直す
      if (retry && (res.status === 404 || res.status === 401)) {
        if (res.status === 404) writeLocal(FOLDER_KEY, '')
        return send(false)
      }
      throw new Error('ドライブに保存できませんでした。')
    }
    return await send(true)
  }

  return { connected, refresh, connect, disconnect, uploadPdf, configured: !!clientId }
}
