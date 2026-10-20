// お休み（退会）中かどうか。お休み中の人には、トップに「おかえりなさい」の画面を出す。
// 判定はサーバーが持っている（API は 403 を返して止める）。ここは画面を切り替えるための控えにすぎない。

import type { WithdrawnInfo } from '~/types/auth'

export function useWithdrawn() {
  const withdrawn = useState<WithdrawnInfo | null>('kk-withdrawn', () => null)
  const { authedFetch } = useAuth()

  /** /api/me を読んで、お休み中かどうかを控え直す。お休み中なら true */
  async function refresh(): Promise<boolean> {
    const me = await authedFetch<{ withdrawn: WithdrawnInfo | null }>('/api/me')
    withdrawn.value = me.withdrawn ?? null
    return !!withdrawn.value
  }

  /** API の失敗が「お休み中だから」のものか */
  function isWithdrawnError(e: any): boolean {
    return e?.data?.data?.code === 'withdrawn' || e?.data?.code === 'withdrawn'
  }

  return { withdrawn, refresh, isWithdrawnError }
}
