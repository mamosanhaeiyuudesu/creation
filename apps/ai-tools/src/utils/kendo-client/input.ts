// 入力の変換層: ゲームパッド2台＋キーボード → プレイヤーごとのゲーム内アクション。
// ブラウザ専用（navigator / window を触る）なので、onMounted の中でだけ作ること。
//
// rAF の頻度と固定ステップの頻度はずれる（120Hz の画面なら rAF 2回に1回しかステップしない）ので、
// update() で読んだ「押した瞬間」は take() で取り出されるまで溜めておく（取りこぼさない）。
import { ACTIONS, NO_ACTIONS } from '../kendo/match'
import type { Action, ActionSet, PlayerInput } from '../kendo/types'

/** ボタン割り当て。値は Gamepad.buttons の番号（複数可） */
export type PadBinding = Record<Action, number[]>

/**
 * 8BitDo SN30 Pro を X-input モードで Mac につないだとき（標準マッピング）の、ボタンの刻印どおりの割り当て。
 * 刻印 B（下）=0 / A（右）=1 / Y（左）=2 / X（上）=3 / Start=9 / 十字キー 左=14・右=15。
 * 接続モードで番号が変わることがあるので、画面の「ボタン設定」で押し直して変えられる。
 */
export const DEFAULT_PAD_BINDING: PadBinding = {
  left: [14],
  right: [15],
  men: [1],
  kote: [0],
  do: [2],
  start: [9],
}

/** 開発用のキーボード割り当て（KeyboardEvent.code） */
export const KEYBOARD_BINDINGS: readonly [Record<Action, string[]>, Record<Action, string[]>] = [
  { left: ['KeyA'], right: ['KeyD'], men: ['KeyF'], kote: ['KeyG'], do: ['KeyH'], start: ['Space', 'Enter'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], men: ['KeyJ'], kote: ['KeyK'], do: ['KeyL'], start: ['Space', 'Enter'] },
]

/** 十字キーがスティック扱いで axes に来るコントローラー向け（しきい値を超えたら左右とみなす） */
const AXIS_THRESHOLD = 0.5

const STORAGE_KEY = 'kendo:padBindings'

export function loadPadBindings(): [PadBinding, PadBinding] {
  const fallback = (): [PadBinding, PadBinding] => [structuredClone(DEFAULT_PAD_BINDING), structuredClone(DEFAULT_PAD_BINDING)]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback()
    const parsed = JSON.parse(raw) as Partial<PadBinding>[]
    const merge = (p: Partial<PadBinding> | undefined): PadBinding => {
      const out = structuredClone(DEFAULT_PAD_BINDING)
      for (const a of ACTIONS) {
        const v = p?.[a]
        if (Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0)) out[a] = v
      }
      return out
    }
    return [merge(parsed[0]), merge(parsed[1])]
  } catch {
    return fallback()
  }
}

export function savePadBindings(bindings: readonly [PadBinding, PadBinding]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
  } catch {
    // 保存できなくても、このタブの間は使える
  }
}

function emptySet(): Record<Action, boolean> {
  return { ...NO_ACTIONS }
}

export interface PadStatus {
  connected: boolean
  name: string
}

export class InputManager {
  bindings: [PadBinding, PadBinding]
  private keysDown = new Set<string>()
  private keysPressed = new Set<string>()
  private prevPadHeld: [Record<Action, boolean>, Record<Action, boolean>] = [emptySet(), emptySet()]
  private pending: [Record<Action, boolean>, Record<Action, boolean>] = [emptySet(), emptySet()]
  private held: [Record<Action, boolean>, Record<Action, boolean>] = [emptySet(), emptySet()]
  private prevRawButtons: [boolean[], boolean[]] = [[], []]
  /** このupdate()で新しく押されたボタン番号（ボタン設定用）。無ければ null */
  lastRawPress: [number | null, number | null] = [null, null]
  pads: [PadStatus, PadStatus] = [
    { connected: false, name: '' },
    { connected: false, name: '' },
  ]

  constructor(bindings: [PadBinding, PadBinding]) {
    this.bindings = bindings
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.isGameKey(e.code)) return
    e.preventDefault() // 矢印・スペースでページがスクロールしないように
    if (!e.repeat) this.keysPressed.add(e.code)
    this.keysDown.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.code)
  }

  /** フォーカスが外れると keyup が来ないので、押しっぱなしの扱いを解く */
  private onBlur = () => {
    this.keysDown.clear()
  }

  private isGameKey(code: string) {
    return KEYBOARD_BINDINGS.some((b) => ACTIONS.some((a) => b[a].includes(code)))
  }

  attach() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
  }

  /** 接続中のパッドを index 順に並べ、1台目を P1（赤）、2台目を P2（白）にする */
  private connectedPads(): Gamepad[] {
    const list = navigator.getGamepads?.() ?? []
    return [...list].filter((g): g is Gamepad => g !== null && g.connected).sort((a, b) => a.index - b.index)
  }

  /** 毎 rAF で1回呼ぶ。パッドとキーボードの状態を読み、押した瞬間を溜める */
  update() {
    const pads = this.connectedPads()
    for (const slot of [0, 1] as const) {
      const pad = pads[slot]
      this.pads[slot] = { connected: !!pad, name: pad?.id ?? '' }

      const padHeld = emptySet()
      this.lastRawPress[slot] = null
      if (pad) {
        const raw = pad.buttons.map((b) => b.pressed)
        const firstNew = raw.findIndex((p, i) => p && !this.prevRawButtons[slot][i])
        this.lastRawPress[slot] = firstNew >= 0 ? firstNew : null
        this.prevRawButtons[slot] = raw

        const binding = this.bindings[slot]
        for (const a of ACTIONS) padHeld[a] = binding[a].some((i) => raw[i] ?? false)
        const axis = pad.axes[0] ?? 0
        if (axis < -AXIS_THRESHOLD) padHeld.left = true
        if (axis > AXIS_THRESHOLD) padHeld.right = true
      } else {
        this.prevRawButtons[slot] = []
      }

      const keys = KEYBOARD_BINDINGS[slot]
      const held = this.held[slot]
      const pending = this.pending[slot]
      for (const a of ACTIONS) {
        const keyHeld = keys[a].some((k) => this.keysDown.has(k))
        const keyPressed = keys[a].some((k) => this.keysPressed.has(k))
        const padPressed = padHeld[a] && !this.prevPadHeld[slot][a]
        held[a] = padHeld[a] || keyHeld
        if (padPressed || keyPressed) pending[a] = true
      }
      this.prevPadHeld[slot] = padHeld
    }
    this.keysPressed.clear()
  }

  /** 固定ステップ1回ぶんの入力を取り出す。押した瞬間はここで消費される */
  take(): [PlayerInput, PlayerInput] {
    const out = ([0, 1] as const).map((slot) => {
      const input: PlayerInput = { held: { ...this.held[slot] } as ActionSet, pressed: { ...this.pending[slot] } as ActionSet }
      this.pending[slot] = emptySet()
      return input
    })
    return [out[0]!, out[1]!]
  }

  /** ボタン設定中などで、溜まっている「押した瞬間」を捨てる */
  clearPending() {
    this.pending = [emptySet(), emptySet()]
  }
}
