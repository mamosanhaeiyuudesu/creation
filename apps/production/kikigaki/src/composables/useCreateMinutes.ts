// 文字起こし済みの文章を議事録に構造化し、確認画面へ進む共通処理。
// テキスト入力（ファイル・貼り付け）から呼ばれる。

import type { MinutesMode } from '~/types/minutes'

export function useCreateMinutes() {
  const router = useRouter()
  const { authedFetch } = useAuth()

  async function createMinutes(transcript: string, audioName: string, mode: MinutesMode) {
    const { id } = await authedFetch<{ id: string }>('/api/minutes', {
      method: 'POST',
      body: { transcript, audioName, mode },
    })
    await router.push(`/records/${id}`)
  }

  return { createMinutes }
}
