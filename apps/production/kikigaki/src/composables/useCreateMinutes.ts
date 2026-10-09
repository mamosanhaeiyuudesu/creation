// 文字起こし済みの文章を議事録に構造化し、確認画面へ進む共通処理。
// 録音からの経路・テキストからの経路の両方から呼ばれる。

export function useCreateMinutes() {
  const router = useRouter()
  const { authedFetch } = useAuth()

  async function createMinutes(transcript: string, audioName: string) {
    const { id } = await authedFetch<{ id: string }>('/api/minutes', {
      method: 'POST',
      body: { transcript, audioName },
    })
    await router.push(`/records/${id}`)
  }

  return { createMinutes }
}
