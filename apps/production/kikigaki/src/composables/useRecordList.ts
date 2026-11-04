// 議事録の一覧（PCの左メニューとホームの一覧で共有する）。
// 作る・消す・名前や日付を変えるたびに読み直さず、手元の一覧を書き換えて合わせる。

import type { RecordListItem } from '~/types/minutes'

export function useRecordList() {
  const { authedFetch } = useAuth()
  const records = useState<RecordListItem[]>('kk-records', () => [])
  /** 一度でも読み込んだか（左メニューとホームが両方読みに行かないように） */
  const loaded = useState<boolean>('kk-records-loaded', () => false)
  const loading = useState<boolean>('kk-records-loading', () => false)

  /** 読み込む。失敗したら一覧を空にして投げ直す（退会中の 403 などは呼ぶ側で見分ける） */
  async function load(): Promise<void> {
    loading.value = true
    try {
      records.value = (await authedFetch<{ records: RecordListItem[] }>('/api/records')).records
      loaded.value = true
    } catch (e) {
      records.value = []
      throw e
    } finally {
      loading.value = false
    }
  }

  /** まだ読み込んでいなければ読み込む */
  async function ensure(): Promise<void> {
    if (!loaded.value && !loading.value) await load()
  }

  function removeLocal(id: string) {
    records.value = records.value.filter((r) => r.id !== id)
  }

  /** 確認画面で直した名前・日付・種類・タグを一覧に映す（一覧に無ければ何もしない） */
  function patchLocal(id: string, patch: Partial<RecordListItem>) {
    const r = records.value.find((x) => x.id === id)
    if (r) Object.assign(r, patch)
  }

  function reset() {
    records.value = []
    loaded.value = false
  }

  return { records, loaded, loading, load, ensure, removeLocal, patchLocal, reset }
}
