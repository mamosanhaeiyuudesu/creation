// 議事録を作る仕事の様子を見る（サーバー側は server/utils/minuteJobs.ts）。
//
// 作るボタンを押すとサーバーは仕事を受け付けてすぐ返し、AIの処理は裏で続く。
// 画面は作成中のあいだ数秒おきに GET /api/minutes/jobs を見て、できたらその議事録を開く。
// ブラウザを開き直したとき・スマホで別のアプリから戻ってきたときもすぐ見直すので、
// 閉じている間にできていれば開き、まだなら作成中の表示から続ける。
//
// 見張りの本体（タイマー・画面の切り替えの検知）はレイアウトが init() で1つだけ持つ。

import type { MinutesMode } from '~/types/minutes'

export type MinuteJobStatus = 'pending' | 'running' | 'done' | 'failed'

export interface MinuteJob {
  id: string
  status: MinuteJobStatus
  mode: MinutesMode
  recordId: string
  error: string
  createdAt: string
}

const POLL_MS = 4000

/** レイアウトの init() が入れる「すぐ見直して」。作るボタンのあとに呼ぶ */
let kick: (() => void) | null = null

export function useMinuteJobs() {
  const { authedFetch } = useAuth()
  const jobs = useState<MinuteJob[]>('kk-minute-jobs', () => [])
  /** 作るシートで待っている仕事。できたらシートを閉じて開き、失敗したらシートに理由を出す */
  const watching = useState<string>('kk-minute-job-watching', () => '')

  const running = computed(() => jobs.value.filter((j) => j.status === 'pending' || j.status === 'running'))
  /** シートで待っていない失敗（一覧の上にお知らせとして出す） */
  const failed = computed(() => jobs.value.filter((j) => j.status === 'failed' && j.id !== watching.value))

  /** 仕事を出す。戻り値は仕事のID */
  async function start(body: {
    transcript: string
    audioName: string
    mode: MinutesMode
    date?: string
    tags?: string[]
  }): Promise<string> {
    const { jobId } = await authedFetch<{ jobId: string }>('/api/minutes', { method: 'POST', body })
    jobs.value = [
      { id: jobId, status: 'pending', mode: body.mode, recordId: '', error: '', createdAt: new Date().toISOString() },
      ...jobs.value.filter((j) => j.id !== jobId),
    ]
    kick?.()
    return jobId
  }

  /** 知らせ終えた（開いた・閉じた）。手元からも外す */
  function dismiss(id: string) {
    jobs.value = jobs.value.filter((j) => j.id !== id)
    authedFetch(`/api/minutes/jobs/${id}/seen`, { method: 'POST' }).catch(() => {})
  }

  /** レイアウトから1回だけ呼ぶ。ログインしている間、様子を見続ける */
  function init() {
    const router = useRouter()
    const { isLoggedIn } = useAuth()
    const { load: loadRecordList } = useRecordList()
    const textSheetOpen = useState<boolean>('kk-text-sheet-open', () => false)

    let timer: ReturnType<typeof setTimeout> | null = null
    let busy = false

    async function refresh() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (!isLoggedIn.value || busy) return
      busy = true
      try {
        jobs.value = (await authedFetch<{ jobs: MinuteJob[] }>('/api/minutes/jobs')).jobs
        await openFinished()
      } catch {
        // 通信が切れているなど。次の見直しでまた試す
      } finally {
        busy = false
      }
      if (running.value.length) timer = setTimeout(refresh, POLL_MS)
    }

    /** できた議事録を開く（いくつもできていたら一番新しいもの）。開いたものは知らせ終えたことにする */
    async function openFinished() {
      const done = jobs.value.filter((j) => j.status === 'done' && j.recordId)
      if (!done.length) return
      const newest = done[0]!
      for (const j of done) dismiss(j.id)
      // 左の一覧にできた議事録を足す（読み直しに失敗しても、開いた画面はそのまま使える）
      loadRecordList().catch(() => {})
      if (done.some((j) => j.id === watching.value)) {
        watching.value = ''
        textSheetOpen.value = false
      }
      await router.push(`/records/${newest.recordId}`)
    }

    kick = () => {
      refresh()
    }

    // スマホで別のアプリから戻った・タブに戻った・通信が戻ったときは、待たずにすぐ見直す
    // （裏にいる間はタイマーが止まることがあるため）
    function onVisible() {
      if (document.visibilityState === 'visible') refresh()
    }
    onMounted(() => {
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('pageshow', onVisible)
      window.addEventListener('online', onVisible)
    })
    onBeforeUnmount(() => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
      window.removeEventListener('online', onVisible)
      if (timer) clearTimeout(timer)
      kick = null
    })

    // 開いたとき（ログインの確認が済んだとき）に1回見る＝閉じている間にできていれば開く
    watch(
      isLoggedIn,
      (v) => {
        if (v) refresh()
        else {
          jobs.value = []
          watching.value = ''
        }
      },
      { immediate: true }
    )
  }

  return { jobs, watching, running, failed, start, dismiss, init }
}
