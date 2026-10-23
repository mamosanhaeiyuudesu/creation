import { ref, watch } from 'vue'
import type { Ref } from 'vue'

/**
 * 状態まるごとのスナップショットで「戻る／進む」を持つ（farm-simulation）。
 * 削除も含めて何でも1つ前に戻せるよう、操作ごとではなく状態の差分を見て履歴を積む。
 * 数字の入力は1文字ごとに積むと戻るが効かなくなるので、変化が止まってから debounce ミリ秒で1件にまとめる。
 */
export function useUndoHistory<T>(source: Ref<T>, opts: { debounce?: number; limit?: number } = {}) {
  const debounce = opts.debounce ?? 600
  const limit = opts.limit ?? 80
  const past: string[] = []
  const future: string[] = []
  let current = JSON.stringify(source.value)
  let timer: ReturnType<typeof setTimeout> | null = null
  const canUndo = ref(false)
  const canRedo = ref(false)

  function sync() {
    canUndo.value = past.length > 0
    canRedo.value = future.length > 0
  }

  /** 保留中の変化を履歴に確定させる。戻した直後は current と同じなので何もしない。 */
  function commit() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    const snap = JSON.stringify(source.value)
    if (snap === current) return
    past.push(current)
    if (past.length > limit) past.shift()
    future.length = 0
    current = snap
    sync()
  }

  watch(
    source,
    () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(commit, debounce)
    },
    { deep: true }
  )

  function apply(snap: string) {
    current = snap
    source.value = JSON.parse(snap)
    sync()
  }

  function undo() {
    commit()
    const prev = past.pop()
    if (prev === undefined) return
    future.push(current)
    apply(prev)
  }

  function redo() {
    commit()
    const next = future.pop()
    if (next === undefined) return
    past.push(current)
    apply(next)
  }

  /** サーバーから読み込み直したときなど、いまの状態を起点に履歴を空にする。 */
  function reset() {
    if (timer) clearTimeout(timer)
    timer = null
    past.length = 0
    future.length = 0
    current = JSON.stringify(source.value)
    sync()
  }

  return { canUndo, canRedo, undo, redo, commit, reset }
}
