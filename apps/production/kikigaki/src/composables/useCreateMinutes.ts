// 文字起こし済みのテキストを議事録に構造化し、確認画面へ進む共通処理。
// テキスト入力（ファイル・貼り付け）から呼ばれる。

import type { MinutesMode } from '~/types/minutes'

export function useCreateMinutes() {
  const router = useRouter()
  const { authedFetch } = useAuth()
  const { load: loadRecordList } = useRecordList()

  /** carry: 「このテキストから新しく作る」で元の議事録から引き継ぐ日付とタグ */
  async function createMinutes(
    transcript: string,
    audioName: string,
    mode: MinutesMode,
    carry?: { date: string; tags: string[] }
  ) {
    const { id } = await authedFetch<{ id: string }>('/api/minutes', {
      method: 'POST',
      body: { transcript, audioName, mode, ...carry },
    })
    await router.push(`/records/${id}`)
    // 左メニューの一覧に新しい議事録を足す（読み直しに失敗しても、開いた画面はそのまま使える）
    loadRecordList().catch(() => {})
  }

  return { createMinutes }
}

/** 作る画面を開くときに入れておく中身（確認画面の「このテキストから新しく作る」から） */
export interface TextSheetPrefill {
  text: string
  date: string
  tags: string[]
}

/** 作る画面（MinutesTextSheet）の開け閉めと、入れておく中身。画面はレイアウトに1つだけ置いてある */
export function useTextSheet() {
  const open = useState<boolean>('kk-text-sheet-open', () => false)
  const prefill = useState<TextSheetPrefill | null>('kk-text-sheet-prefill', () => null)

  function openWith(p: TextSheetPrefill) {
    prefill.value = p
    open.value = true
  }

  return { open, prefill, openWith }
}
