import { ref } from 'vue'
import { readCorrectMap, saveName, savedName, writeCorrectMap } from '~/composables/useManabiMe'
import { readRecent, writeRecent } from '~/composables/useManabiRecent'
import { runKey } from '~/composables/useManabiRun'
import { mergeSyncData, sanitizeSyncData, type ManabiSyncData } from '~/utils/manabi-sync'

/**
 * 他の端末との引き継ぎ（同期コード）。名前・正解数・回答した問題の一覧を、コードでつないだ端末どうしで揃える。
 * 一度つなげば、トップを開いたときと解いた後に裏で勝手に同期する（毎回の操作は要らない）。
 * 解答の途中経過は運ばない（別の端末では最初から解く）。
 */
const CODE_KEY = 'manabi-sync-code-v1'

const code = ref('')
const status = ref<'idle' | 'syncing' | 'ok' | 'error'>('idle')
const message = ref('')

function readCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? ''
  } catch {
    return ''
  }
}

function storeCode(c: string) {
  try {
    if (c) localStorage.setItem(CODE_KEY, c)
    else localStorage.removeItem(CODE_KEY)
  } catch {
    /* 保存できなくても今回は使える */
  }
  code.value = c
}

function collect(): ManabiSyncData {
  return sanitizeSyncData({ name: savedName(), correct: readCorrectMap(), recent: readRecent() })
}

/** サーバーから返った統合結果を端末に反映する。通信中に端末で増えた分を失わないよう、もう一度端末の最新と統合する */
function apply(remote: ManabiSyncData) {
  const merged = mergeSyncData(remote, collect())
  if (merged.name) saveName(merged.name)
  writeCorrectMap(merged.correct)
  writeRecent(merged.recent)
}

const errorText = (e: any) => e?.data?.message || e?.statusMessage || '通信できませんでした。あとでもう一度お試しください。'

let timer: ReturnType<typeof setTimeout> | null = null
/** 最後に送った中身。同じなら送らない（書き込みを無駄に増やさない）。画面を開き直すと空に戻る */
let lastSent = ''

export function useManabiSync() {
  const load = () => {
    code.value = readCode()
  }

  /** 新しいコードを発行して、この端末のデータを預ける */
  const create = async (): Promise<boolean> => {
    status.value = 'syncing'
    try {
      const res = await $fetch<{ code: string; data: ManabiSyncData }>('/api/sync', { method: 'POST', body: { data: collect() } })
      storeCode(res.code)
      apply(res.data)
      status.value = 'ok'
      return true
    } catch (e) {
      status.value = 'error'
      message.value = errorText(e)
      return false
    }
  }

  /** 発行済みのコードでつなぐ。成功したらこの端末のデータと統合される */
  const join = async (input: string): Promise<boolean> => {
    status.value = 'syncing'
    try {
      const c = input.toLowerCase().replace(/[^a-z0-9]/g, '')
      const res = await $fetch<{ data: ManabiSyncData }>(`/api/sync/${c}`, { method: 'POST', body: { data: collect() } })
      storeCode(c)
      apply(res.data)
      status.value = 'ok'
      return true
    } catch (e) {
      status.value = 'error'
      message.value = errorText(e)
      return false
    }
  }

  /** つながっていれば同期する。裏で呼ぶので失敗しても黙っている（コードが無効になったときだけ解除する） */
  const sync = async (): Promise<boolean> => {
    const c = readCode()
    if (!c) return false
    status.value = 'syncing'
    try {
      const data = collect()
      const res = await $fetch<{ data: ManabiSyncData }>(`/api/sync/${c}`, { method: 'POST', body: { data } })
      lastSent = JSON.stringify(data)
      apply(res.data)
      status.value = 'ok'
      return true
    } catch (e: any) {
      status.value = 'error'
      message.value = errorText(e)
      if (e?.statusCode === 404 || e?.status === 404) storeCode('')
      return false
    }
  }

  /** 解き終えたときなどに呼ぶ。連続して呼ばれてもまとめて1回にし、前回と同じ中身なら送らない */
  const scheduleSync = () => {
    if (!readCode()) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (JSON.stringify(collect()) !== lastSent) void sync()
    }, 2000)
  }

  /**
   * 画面を離れるとき（タブを切り替える・閉じる）に、解いている途中の分を預ける。
   * 画面が閉じても送り切れる sendBeacon を使うので、返事は受け取らない（統合結果は次に開いたとき反映される）
   */
  const flush = () => {
    const c = readCode()
    if (!c) return
    const data = collect()
    const body = JSON.stringify(data)
    if (body === lastSent) return
    try {
      const blob = new Blob([JSON.stringify({ data })], { type: 'application/json' })
      if (navigator.sendBeacon(`/api/sync/${c}`, blob)) lastSent = body
    } catch {
      /* 送れなくても、次にトップを開いたときに揃う */
    }
  }

  /** つなぐのをやめる（預けたデータは残る。コードを知っていれば、また同じコードでつなげる） */
  const leave = () => storeCode('')

  /**
   * この端末の控えをすべて消す（名前・正解数・問題の一覧・解答の控え）。
   * つないだままだと次の同期でサーバーから戻ってくるので、つなぎも解除する。サーバーに預けたデータは消えない
   */
  const eraseLocal = () => {
    if (timer) clearTimeout(timer)
    timer = null
    storeCode('')
    writeCorrectMap({})
    writeRecent([])
    saveName('')
    try {
      const prefix = runKey('')
      for (const k of Object.keys(localStorage)) if (k.startsWith(prefix)) localStorage.removeItem(k)
    } catch {
      /* 消せなくても今回は使える */
    }
  }

  return { code, status, message, load, create, join, sync, scheduleSync, flush, leave, eraseLocal }
}
