import type { Directive } from 'vue'

// ネイティブの title 属性はOS/ブラウザ側の表示までに遅延（1秒前後）がかかり調整できない。
// PC（マウス操作＝hover可能な環境）だけ、この遅延を無くした自前ツールチップに差し替える。
// タッチ端末では何もしない＝title属性同様どのみち出ないため実害はない。
const HOVER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)'

function supportsHover(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.(HOVER_MEDIA_QUERY).matches === true
}

let tooltipEl: HTMLDivElement | null = null

function ensureTooltipEl(): HTMLDivElement {
  if (tooltipEl) return tooltipEl
  const el = document.createElement('div')
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: '2000',
    pointerEvents: 'none',
    padding: '5px 9px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    lineHeight: '1.4',
    color: '#fff',
    background: 'rgba(15, 23, 42, 0.95)',
    whiteSpace: 'pre-line',
    maxWidth: '280px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
    display: 'none',
  })
  document.body.appendChild(el)
  tooltipEl = el
  return el
}

function positionTooltip(el: HTMLDivElement, target: HTMLElement) {
  const rect = target.getBoundingClientRect()
  el.style.display = 'block'
  const tipRect = el.getBoundingClientRect()
  let top = rect.top - tipRect.height - 6
  if (top < 4) top = rect.bottom + 6
  let left = rect.left + rect.width / 2 - tipRect.width / 2
  left = Math.max(4, Math.min(left, window.innerWidth - tipRect.width - 4))
  el.style.top = `${top}px`
  el.style.left = `${left}px`
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none'
}

interface TooltipState {
  text: string | null | undefined
  onEnter: () => void
  onLeave: () => void
}

const states = new WeakMap<HTMLElement, TooltipState>()

/** `title` 属性の代わりに使う。マウスオーバーした瞬間に表示される（PCのみ）。 */
export const koubaTooltip: Directive<HTMLElement, string | null | undefined> = {
  mounted(el, binding) {
    if (!supportsHover()) return
    const state: TooltipState = {
      text: binding.value,
      onEnter: () => {
        if (!state.text) return
        const tip = ensureTooltipEl()
        tip.textContent = state.text
        positionTooltip(tip, el)
      },
      onLeave: hideTooltip,
    }
    states.set(el, state)
    el.addEventListener('mouseenter', state.onEnter)
    el.addEventListener('mouseleave', state.onLeave)
    el.addEventListener('mousedown', hideTooltip)
  },
  updated(el, binding) {
    const state = states.get(el)
    if (state) state.text = binding.value
  },
  unmounted(el) {
    const state = states.get(el)
    if (state) {
      el.removeEventListener('mouseenter', state.onEnter)
      el.removeEventListener('mouseleave', state.onLeave)
      el.removeEventListener('mousedown', hideTooltip)
      states.delete(el)
    }
    hideTooltip()
  },
}
