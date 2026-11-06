// 議事録を作る画面（MinutesTextSheet）の開け閉め。
// 作る処理そのものは useMinuteJobs（裏で作り、できたら開く）。

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
