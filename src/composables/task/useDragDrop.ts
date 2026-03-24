import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Board, Card } from './useTaskBoards'

export function useDragDrop(
  boards: Ref<Board[]>,
  trelloPut: (path: string, body: Record<string, any>) => Promise<any>,
) {
  const dragging = ref<{ cardId: string; boardId: string; status: 'doing' | 'todo' } | null>(null)
  const dragOverCardId = ref<string | null>(null)
  const dragOverEndKey = ref<string | null>(null)

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

  async function onDropCard(targetCardId: string, targetBoardId: string, targetStatus: 'doing' | 'todo') {
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
    if (targetArr[targetIdx - 1]?.id === srcCardId) return

    const prevPos = targetArr[targetIdx - 1]?.pos ?? 0
    const newPos = (prevPos + targetArr[targetIdx].pos) / 2

    try {
      const body: Record<string, any> = { pos: newPos }
      if (srcBoardId !== targetBoardId || srcStatus !== targetStatus) {
        body.idList = targetStatus === 'doing' ? targetBoard.doingListId : targetBoard.todoListId
        if (srcBoardId !== targetBoardId) body.idBoard = targetBoardId
      }
      await trelloPut(`/cards/${srcCardId}`, body)

      const srcArr = getArr(srcBoardId, srcStatus)
      if (!srcArr) return
      const srcIdx = srcArr.findIndex(c => c.id === srcCardId)
      if (srcIdx < 0) return
      const [movedCard] = srcArr.splice(srcIdx, 1)
      movedCard.pos = newPos
      const insertIdx = targetArr.findIndex(c => c.id === targetCardId)
      targetArr.splice(insertIdx, 0, movedCard)
    } catch (e: any) {
      console.error(e)
    }
  }

  async function onDropEnd(targetBoardId: string, targetStatus: 'doing' | 'todo') {
    if (!dragging.value) return
    const { cardId: srcCardId, boardId: srcBoardId, status: srcStatus } = dragging.value
    dragging.value = null
    dragOverEndKey.value = null

    const targetBoard = boards.value.find(b => b.id === targetBoardId)
    if (!targetBoard) return
    const targetArr = targetStatus === 'doing' ? targetBoard.doing : targetBoard.todo
    if (targetArr[targetArr.length - 1]?.id === srcCardId) return

    const lastPos = targetArr[targetArr.length - 1]?.pos ?? 0
    const newPos = lastPos + 16384

    try {
      const body: Record<string, any> = { pos: newPos }
      if (srcBoardId !== targetBoardId || srcStatus !== targetStatus) {
        body.idList = targetStatus === 'doing' ? targetBoard.doingListId : targetBoard.todoListId
        if (srcBoardId !== targetBoardId) body.idBoard = targetBoardId
      }
      await trelloPut(`/cards/${srcCardId}`, body)

      const srcArr = getArr(srcBoardId, srcStatus)
      if (!srcArr) return
      const srcIdx = srcArr.findIndex(c => c.id === srcCardId)
      if (srcIdx < 0) return
      const [movedCard] = srcArr.splice(srcIdx, 1)
      movedCard.pos = newPos
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
  let touchMoved = false
  let pendingTouchInfo: { card: Card; boardId: string; status: 'doing' | 'todo'; el: HTMLElement } | null = null

  function onMobileTouchStart(e: TouchEvent, card: Card, boardId: string, status: 'doing' | 'todo') {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    const touch = e.touches[0]
    touchMoved = false
    touchInitialX = touch.clientX
    touchInitialY = touch.clientY
    pendingTouchInfo = { card, boardId, status, el: e.currentTarget as HTMLElement }
    document.addEventListener('touchmove', onDocTouchMove, { passive: false })
    document.addEventListener('touchend', onDocTouchEnd, { once: true })
  }

  function onDocTouchMove(e: TouchEvent) {
    if (!pendingTouchInfo) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchInitialX
    const dy = touch.clientY - touchInitialY

    if (!touchMoved && Math.sqrt(dx * dx + dy * dy) > 8) {
      touchMoved = true
      const { card, boardId, status, el } = pendingTouchInfo
      dragging.value = { cardId: card.id, boardId, status }
      const rect = el.getBoundingClientRect()
      touchElemOffsetX = touchInitialX - rect.left
      touchElemOffsetY = touchInitialY - rect.top
      touchGhost = el.cloneNode(true) as HTMLElement
      touchGhost.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;opacity:0.75;pointer-events:none;z-index:9999;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.4);`
      document.body.appendChild(touchGhost)
    }

    if (touchMoved && touchGhost) {
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
    const info = pendingTouchInfo
    pendingTouchInfo = null

    if (!touchMoved || !info) {
      dragging.value = null
      dragOverCardId.value = null
      dragOverEndKey.value = null
      return
    }

    e.preventDefault()
    const touch = e.changedTouches[0]
    if (touchGhost) touchGhost.style.display = 'none'
    const under = document.elementFromPoint(touch.clientX, touch.clientY)
    if (touchGhost) { touchGhost.remove(); touchGhost = null }

    dragging.value = { cardId: info.card.id, boardId: info.boardId, status: info.status }

    const cardEl = under?.closest('[data-card-id]')
    const dropEndEl = under?.closest('[data-drop-end]')
    if (cardEl) {
      const targetCardId = cardEl.getAttribute('data-card-id')!
      const targetBoardId = cardEl.getAttribute('data-board-id')!
      const targetStatus = cardEl.getAttribute('data-status') as 'doing' | 'todo'
      await onDropCard(targetCardId, targetBoardId, targetStatus)
    } else if (dropEndEl) {
      const [targetBoardId, targetStatus] = dropEndEl.getAttribute('data-drop-end')!.split(':')
      await onDropEnd(targetBoardId, targetStatus as 'doing' | 'todo')
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
  }
}
