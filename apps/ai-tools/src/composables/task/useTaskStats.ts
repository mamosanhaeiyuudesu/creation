import { computed } from 'vue'
import type { Ref } from 'vue'
import type { Board } from './useTaskBoards'

function getJstKey(daysBack: number): string {
  const d = nowJST()
  d.setUTCDate(d.getUTCDate() - daysBack)
  return d.toISOString().slice(0, 10)
}

export function useTaskStats(boards: Ref<Board[]>) {
  const thisWeekKeys = computed(() => Array.from({ length: 7 }, (_, i) => getJstKey(i)))

  const thisWeekDoneFlat = computed(() => {
    const items: { card: any; board: any; date: string }[] = []
    for (const date of thisWeekKeys.value) {
      for (const board of boards.value) {
        for (const card of board.done[date] ?? []) {
          items.push({ card, board, date })
        }
      }
    }
    return items
  })

  return { thisWeekDoneFlat }
}
