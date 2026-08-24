import { ref } from 'vue'
import type { Ref } from 'vue'
import { applyDue, clearDue } from './useTaskBoards'
import type { Board, Card } from './useTaskBoards'

/** DOINGの欄（今日やること / 今週中にやること）。振り分けは期限で決まる */
export type DoingGroup = 'today' | 'week'

/**
 * 移動先に応じて必要な期限の変更。null＝変更不要、空文字＝期限を消す、それ以外＝その期限にする。
 * DOING の欄は期限で振り分けが決まるので resolveDoingDue に従い、TODO へ移したときは
 * 「まだいつやるか決めていない」状態に戻す意味で期限を消す。
 */
function dueChangeFor(
  card: Card,
  targetStatus: 'doing' | 'todo',
  targetGroup: DoingGroup | undefined,
  resolveDoingDue: (card: Card, group: DoingGroup) => string | null,
): string | null {
  if (targetStatus === 'doing' && targetGroup) return resolveDoingDue(card, targetGroup)
  if (targetStatus === 'todo' && card.due) return ''
  return null
}

function applyDueChange(card: Card, newDue: string | null) {
  if (newDue) applyDue(card, newDue)
  else if (newDue === '') clearDue(card)
}

export function useDragDrop(
  boards: Ref<Board[]>,
  trelloPut: (path: string, body: Record<string, any>) => Promise<any>,
  /** カードを DOING の欄に落としたときに必要な期限（変更不要なら null）。ページ側が今日/今週の定義を持つ */
  resolveDoingDue: (card: Card, group: DoingGroup) => string | null = () => null,
) {
  const dragging = ref<{ cardId: string; boardId: string; status: 'doing' | 'todo' } | null>(null)
  const dragOverCardId = ref<string | null>(null)
  const dragOverEndKey = ref<string | null>(null)

  // --- DONE: ボード間移動のみ（並び順は日付で決まるため位置調整は不要） ---
  const draggingDone = ref<{ cardId: string; boardId: string; dateKey: string } | null>(null)
  const dragOverDoneBoardId = ref<string | null>(null)

  function onDragStartDone(e: DragEvent, item: { id: string }, boardId: string, dateKey: string) {
    draggingDone.value = { cardId: item.id, boardId, dateKey }
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  function onDragEndDone() {
    draggingDone.value = null
    dragOverDoneBoardId.value = null
  }

  function onDragOverDoneBoard(e: DragEvent, boardId: string) {
    e.preventDefault()
    dragOverDoneBoardId.value = boardId
  }

  async function onDropDoneBoard(targetBoardId: string) {
    dragOverDoneBoardId.value = null
    if (!draggingDone.value) return
    const { cardId, boardId: srcBoardId, dateKey } = draggingDone.value
    draggingDone.value = null
    if (srcBoardId === targetBoardId) return

    const srcBoard = boards.value.find(b => b.id === srcBoardId)
    const targetBoard = boards.value.find(b => b.id === targetBoardId)
    if (!srcBoard || !targetBoard || !targetBoard.doneListId) return

    try {
      await trelloPut(`/cards/${cardId}`, { idList: targetBoard.doneListId, idBoard: targetBoardId })
      const arr = srcBoard.done[dateKey]
      const idx = arr?.findIndex(c => c.id === cardId) ?? -1
      if (idx < 0) return
      const [item] = arr!.splice(idx, 1)
      if (arr!.length === 0) delete srcBoard.done[dateKey]
      ;(targetBoard.done[dateKey] ??= []).push(item)
    } catch (e: any) {
      console.error(e)
    }
  }

  function getArr(boardId: string, status: 'doing' | 'todo') {
    const b = boards.value.find(b => b.id === boardId)
    return b ? (status === 'doing' ? b.doing : b.todo) : null
  }

  // --- Mouse drag ---
  function onDragStart(e: DragEvent, card: Card, boardId: string, status: 'doing' | 'todo') {
    dragging.value = { cardId: card.id, boardId, status }
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  function onDragEnd() {
    dragging.value = null
    dragOverCardId.value = null
    dragOverEndKey.value = null
  }

  function onDragOverCard(e: DragEvent, cardId: string) {
    e.preventDefault()
    dragOverCardId.value = cardId
    dragOverEndKey.value = null
  }

  function onDragOverEnd(e: DragEvent, key: string) {
    e.preventDefault()
    dragOverCardId.value = null
    dragOverEndKey.value = key
  }

  async function onDropCard(targetCardId: string, targetBoardId: string, targetStatus: 'doing' | 'todo', targetGroup?: DoingGroup) {
    if (!dragging.value) return
    const { cardId: srcCardId, boardId: srcBoardId, status: srcStatus } = dragging.value
    dragging.value = null
    dragOverCardId.value = null

    if (srcCardId === targetCardId) return
    const targetBoard = boards.value.find(b => b.id === targetBoardId)
    if (!targetBoard) return
    const targetArr = targetStatus === 'doing' ? targetBoard.doing : targetBoard.todo
    const targetIdx = targetArr.findIndex(c => c.id === targetCardId)
    if (targetIdx < 0) return

    const srcArr = getArr(srcBoardId, srcStatus)
    const srcCard = srcArr?.find(c => c.id === srcCardId)
    if (!srcArr || !srcCard) return
    const newDue = dueChangeFor(srcCard, targetStatus, targetGroup, resolveDoingDue)
    // 期限を書き換える必要があるなら、位置が変わらなくても更新する（欄をまたいだドラッグ）
    if (newDue === null && targetArr[targetIdx - 1]?.id === srcCardId) return

    const prevPos = targetArr[targetIdx - 1]?.pos ?? 0
    const newPos = (prevPos + targetArr[targetIdx].pos) / 2

    try {
      const body: Record<string, any> = { pos: newPos }
      if (newDue !== null) body.due = newDue
      if (srcBoardId !== targetBoardId || srcStatus !== targetStatus) {
        body.idList = targetStatus === 'doing' ? targetBoard.doingListId : targetBoard.todoListId
        if (srcBoardId !== targetBoardId) body.idBoard = targetBoardId
      }
      await trelloPut(`/cards/${srcCardId}`, body)

      const srcIdx = srcArr.findIndex(c => c.id === srcCardId)
      if (srcIdx < 0) return
      const [movedCard] = srcArr.splice(srcIdx, 1)
      movedCard.pos = newPos
      applyDueChange(srcCard, newDue)
      const insertIdx = targetArr.findIndex(c => c.id === targetCardId)
      targetArr.splice(insertIdx, 0, movedCard)
    } catch (e: any) {
      console.error(e)
    }
  }

  async function onDropEnd(targetBoardId: string, targetStatus: 'doing' | 'todo', targetGroup?: DoingGroup) {
    if (!dragging.value) return
    const { cardId: srcCardId, boardId: srcBoardId, status: srcStatus } = dragging.value
    dragging.value = null
    dragOverEndKey.value = null

    const targetBoard = boards.value.find(b => b.id === targetBoardId)
    if (!targetBoard) return
    const targetArr = targetStatus === 'doing' ? targetBoard.doing : targetBoard.todo

    const srcArr = getArr(srcBoardId, srcStatus)
    const srcCard = srcArr?.find(c => c.id === srcCardId)
    if (!srcArr || !srcCard) return
    const newDue = dueChangeFor(srcCard, targetStatus, targetGroup, resolveDoingDue)
    if (newDue === null && targetArr[targetArr.length - 1]?.id === srcCardId) return

    const lastPos = targetArr[targetArr.length - 1]?.pos ?? 0
    const newPos = lastPos + 16384

    try {
      const body: Record<string, any> = { pos: newPos }
      if (newDue !== null) body.due = newDue
      if (srcBoardId !== targetBoardId || srcStatus !== targetStatus) {
        body.idList = targetStatus === 'doing' ? targetBoard.doingListId : targetBoard.todoListId
        if (srcBoardId !== targetBoardId) body.idBoard = targetBoardId
      }
      await trelloPut(`/cards/${srcCardId}`, body)

      const srcIdx = srcArr.findIndex(c => c.id === srcCardId)
      if (srcIdx < 0) return
      const [movedCard] = srcArr.splice(srcIdx, 1)
      movedCard.pos = newPos
      applyDueChange(srcCard, newDue)
      targetArr.push(movedCard)
    } catch (e: any) {
      console.error(e)
    }
  }

  // --- Touch drag (mobile) ---
  let touchGhost: HTMLElement | null = null
  let touchInitialX = 0
  let touchInitialY = 0
  let touchElemOffsetX = 0
  let touchElemOffsetY = 0
  let isDragActive = false
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let lastTouchX = 0
  let lastTouchY = 0
  let pendingTouchInfo: { card: Card; boardId: string; status: 'doing' | 'todo'; el: HTMLElement } | null = null

  function activateDrag(currentX: number, currentY: number) {
    if (!pendingTouchInfo) return
    const { card, boardId, status, el } = pendingTouchInfo
    dragging.value = { cardId: card.id, boardId, status }
    const rect = el.getBoundingClientRect()
    touchElemOffsetX = touchInitialX - rect.left
    touchElemOffsetY = touchInitialY - rect.top
    touchGhost = el.cloneNode(true) as HTMLElement
    touchGhost.style.cssText = `position:fixed;left:${currentX - touchElemOffsetX}px;top:${currentY - touchElemOffsetY}px;width:${rect.width}px;opacity:0.75;pointer-events:none;z-index:9999;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.4);`
    document.body.appendChild(touchGhost)
    isDragActive = true
  }

  function onMobileTouchStart(e: TouchEvent, card: Card, boardId: string, status: 'doing' | 'todo') {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    const touch = e.touches[0]
    isDragActive = false
    touchInitialX = touch.clientX
    touchInitialY = touch.clientY
    lastTouchX = touch.clientX
    lastTouchY = touch.clientY
    pendingTouchInfo = { card, boardId, status, el: e.currentTarget as HTMLElement }
    longPressTimer = setTimeout(() => {
      longPressTimer = null
      activateDrag(lastTouchX, lastTouchY)
    }, 350)
    document.addEventListener('touchmove', onDocTouchMove, { passive: false })
    document.addEventListener('touchend', onDocTouchEnd, { once: true })
  }

  function onDocTouchMove(e: TouchEvent) {
    if (!pendingTouchInfo) return
    const touch = e.touches[0]
    lastTouchX = touch.clientX
    lastTouchY = touch.clientY

    if (!isDragActive) {
      // ロングプレス待機中: 指が動いたらスクロールとみなしドラッグキャンセル
      const dx = touch.clientX - touchInitialX
      const dy = touch.clientY - touchInitialY
      if (Math.sqrt(dx * dx + dy * dy) > 8) {
        if (longPressTimer !== null) { clearTimeout(longPressTimer); longPressTimer = null }
        pendingTouchInfo = null
        document.removeEventListener('touchmove', onDocTouchMove)
      }
      return // preventDefault不要 → ネイティブスクロール動作
    }

    if (touchGhost) {
      e.preventDefault()
      touchGhost.style.left = `${touch.clientX - touchElemOffsetX}px`
      touchGhost.style.top = `${touch.clientY - touchElemOffsetY}px`
      touchGhost.style.display = 'none'
      const under = document.elementFromPoint(touch.clientX, touch.clientY)
      touchGhost.style.display = ''
      dragOverCardId.value = under?.closest('[data-card-id]')?.getAttribute('data-card-id') ?? null
      dragOverEndKey.value = under?.closest('[data-drop-end]')?.getAttribute('data-drop-end') ?? null
    }
  }

  async function onDocTouchEnd(e: TouchEvent) {
    document.removeEventListener('touchmove', onDocTouchMove)
    if (longPressTimer !== null) { clearTimeout(longPressTimer); longPressTimer = null }
    const info = pendingTouchInfo
    pendingTouchInfo = null

    if (!isDragActive || !info) {
      dragging.value = null
      dragOverCardId.value = null
      dragOverEndKey.value = null
      isDragActive = false
      return
    }

    e.preventDefault()
    const touch = e.changedTouches[0]
    if (touchGhost) touchGhost.style.display = 'none'
    const under = document.elementFromPoint(touch.clientX, touch.clientY)
    if (touchGhost) { touchGhost.remove(); touchGhost = null }
    isDragActive = false

    dragging.value = { cardId: info.card.id, boardId: info.boardId, status: info.status }

    const cardEl = under?.closest('[data-card-id]')
    const dropEndEl = under?.closest('[data-drop-end]')
    if (cardEl) {
      const targetCardId = cardEl.getAttribute('data-card-id')!
      const targetBoardId = cardEl.getAttribute('data-board-id')!
      const targetStatus = cardEl.getAttribute('data-status') as 'doing' | 'todo'
      const targetGroup = (cardEl.getAttribute('data-group') as DoingGroup | null) ?? undefined
      await onDropCard(targetCardId, targetBoardId, targetStatus, targetGroup)
    } else if (dropEndEl) {
      const [targetBoardId, targetStatus, targetGroup] = dropEndEl.getAttribute('data-drop-end')!.split(':')
      await onDropEnd(targetBoardId, targetStatus as 'doing' | 'todo', targetGroup as DoingGroup | undefined)
    } else {
      dragging.value = null
    }

    dragOverCardId.value = null
    dragOverEndKey.value = null
  }

  return {
    dragging, dragOverCardId, dragOverEndKey,
    onDragStart, onDragEnd, onDragOverCard, onDragOverEnd, onDropCard, onDropEnd,
    onMobileTouchStart,
    draggingDone, dragOverDoneBoardId,
    onDragStartDone, onDragEndDone, onDragOverDoneBoard, onDropDoneBoard,
  }
}
