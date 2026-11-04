// 文字起こし済みの文章を議事録に構造化し、確認画面へ進む共通処理。
// テキスト入力（ファイル・貼り付け）から呼ばれる。

import type { MinutesMode } from '~/types/minutes'

export function useCreateMinutes() {
  const router = useRouter()
  const { authedFetch } = useAuth()
  const { load: loadRecordList } = useRecordList()

  async function createMinutes(transcript: string, audioName: string, mode: MinutesMode) {
    const { id } = await authedFetch<{ id: string }>('/api/minutes', {
      method: 'POST',
      body: { transcript, audioName, mode },
    })
    await router.push(`/records/${id}`)
    // 左メニューの一覧に新しい議事録を足す（読み直しに失敗しても、開いた画面はそのまま使える）
    loadRecordList().catch(() => {})
  }

  return { createMinutes }
}
