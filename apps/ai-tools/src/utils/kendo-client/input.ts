// 入力の変換層: ゲームパッド2台＋キーボード → プレイヤーごとのゲーム内アクション。
// ブラウザ専用（navigator / window を触る）なので、onMounted の中でだけ作ること。
// アクションの種類は弾ごとに違う（第2弾で突き・防御が増えた）ので、InputConfig で渡す。
//
// rAF の頻度と固定ステップの頻度はずれる（120Hz の画面なら rAF 2回に1回しかステップしない）ので、
// update() で読んだ「押した瞬間」は take() で取り出されるまで溜めておく（取りこぼさない）。
import type { Action as Kendo1Action } from '../kendo/types'
import type { Action as Kendo2Action } from '../kendo2/types'

/** ボタン割り当て。値は Gamepad.buttons の番号（複数可） */
export type PadBinding<A extends string> = Record<A, number[]>

export interface PlayerInputOf<A extends string> {
  held: Readonly<Record<A, boolean>>
  pressed: Readonly<Record<A, boolean>>
}

export interface InputConfig<A extends string> {
  actions: readonly A[]
  defaultPad: PadBinding<A>
  /** 開発用のキーボード割り当て（KeyboardEvent.code）。P1, P2 の順 */
  keyboard: readonly [Record<A, string[]>, Record<A, string[]>]
  /** 十字キーがスティック扱いで axes[0] に来るコントローラー向けに、左右として扱うアクション */
  axisLeft: A
  axisRight: A
  storageKey: string
}

/**
 * 第1弾の割り当て。8BitDo SN30 Pro を X-input モードで Mac につないだとき（標準マッピング）の、ボタンの刻印どおり。
 * 刻印 B（下）=0 / A（右）=1 / Y（左）=2 / X（上）=3 / L=4 / R=5 / Start=9 / 十字キー 左=14・右=15。
 * 接続モードで番号が変わることがあるので、画面の「ボタン設定」で押し直して変えられる。
 */
export const KENDO1_INPUT: InputConfig<Kendo1Action> = {
  actions: ['left', 'right', 'men', 'kote', 'do', 'start'],
  defaultPad: { left: [14], right: [15], men: [1], kote: [0], do: [2], start: [9] },
  keyboard: [
    { left: ['KeyA'], right: ['KeyD'], men: ['KeyF'], kote: ['KeyG'], do: ['KeyH'], start: ['Space', 'Enter'] },
    { left: ['ArrowLeft'], right: ['ArrowRight'], men: ['KeyJ'], kote: ['KeyK'], do: ['KeyL'], start: ['Space', 'Enter'] },
  ],
  axisLeft: 'left',
  axisRight: 'right',
  storageKey: 'kendo:padBindings',
}

/** 第2弾の割り当て。第1弾に X（上）=突き、L=小手の防御、R=面の防御 を足したもの（保存先も別） */
export const KENDO2_INPUT: InputConfig<Kendo2Action> = {
  actions: ['left', 'right', 'men', 'kote', 'do', 'tsuki', 'guardKote', 'guardMen', 'start'],
  defaultPad: { left: [14], right: [15], men: [1], kote: [0], do: [2], tsuki: [3], guardKote: [4], guardMen: [5], start: [9] },
  keyboard: [
    {
      left: ['KeyA'], right: ['KeyD'], men: ['KeyF'], kote: ['KeyG'], do: ['KeyH'], tsuki: ['KeyT'],
      guardKote: ['KeyQ'], guardMen: ['KeyE'], start: ['Space', 'Enter'],
    },
    {
      left: ['ArrowLeft'], right: ['ArrowRight'], men: ['KeyJ'], kote: ['KeyK'], do: ['KeyL'], tsuki: ['KeyI'],
      guardKote: ['KeyU'], guardMen: ['KeyO'], start: ['Space', 'Enter'],
    },
  ],
  axisLeft: 'left',
  axisRight: 'right',
  storageKey: 'kendo2:padBindings',
}

const AXIS_THRESHOLD = 0.5

function emptySet<A extends string>(actions: readonly A[]): Record<A, boolean> {
  return Object.fromEntries(actions.map((a) => [a, false])) as Record<A, boolean>
}

export function loadPadBindings<A extends string>(config: InputConfig<A>): [PadBinding<A>, PadBinding<A>] {
  const merge = (p: Partial<PadBinding<A>> | undefined): PadBinding<A> => {
    const out = structuredClone(config.defaultPad)
    for (const a of config.actions) {
      const v = p?.[a]
      if (Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0)) out[a] = v
    }
    return out
  }
  try {
    const raw = localStorage.getItem(config.storageKey)
    const parsed = raw ? (JSON.parse(raw) as Partial<PadBinding<A>>[]) : []
    return [merge(parsed[0]), merge(parsed[1])]
  } catch {
    return [merge(undefined), merge(undefined)]
  }
}

export function savePadBindings<A extends string>(config: InputConfig<A>, bindings: readonly [PadBinding<A>, PadBinding<A>]) {
  try {
    localStorage.setItem(config.storageKey, JSON.stringify(bindings))
  } catch {
    // 保存できなくても、このタブの間は使える
  }
}

export interface PadStatus {
  connected: boolean
  name: string
}

export class InputManager<A extends string> {
  bindings: [PadBinding<A>, PadBinding<A>]
  private readonly config: InputConfig<A>
  private keysDown = new Set<string>()
  private keysPressed = new Set<string>()
  private prevPadHeld: [Record<A, boolean>, Record<A, boolean>]
  private pending: [Record<A, boolean>, Record<A, boolean>]
  private held: [Record<A, boolean>, Record<A, boolean>]
  private prevRawButtons: [boolean[], boolean[]] = [[], []]
  /** このupdate()で新しく押されたボタン番号（ボタン設定用）。無ければ null */
  lastRawPress: [number | null, number | null] = [null, null]
  pads: [PadStatus, PadStatus] = [
    { connected: false, name: '' },
    { connected: false, name: '' },
  ]

  constructor(config: InputConfig<A>, bindings: [PadBinding<A>, PadBinding<A>]) {
    this.config = config
    this.bindings = bindings
    this.prevPadHeld = [this.empty(), this.empty()]
    this.pending = [this.empty(), this.empty()]
    this.held = [this.empty(), this.empty()]
  }

  private empty() {
    return emptySet(this.config.actions)
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
    return this.config.keyboard.some((b) => this.config.actions.some((a) => b[a].includes(code)))
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
    const { actions, keyboard, axisLeft, axisRight } = this.config
    const pads = this.connectedPads()
    for (const slot of [0, 1] as const) {
      const pad = pads[slot]
      this.pads[slot] = { connected: !!pad, name: pad?.id ?? '' }

      const padHeld = this.empty()
      this.lastRawPress[slot] = null
      if (pad) {
        const raw = pad.buttons.map((b) => b.pressed)
        const firstNew = raw.findIndex((p, i) => p && !this.prevRawButtons[slot][i])
        this.lastRawPress[slot] = firstNew >= 0 ? firstNew : null
        this.prevRawButtons[slot] = raw

        const binding = this.bindings[slot]
        for (const a of actions) padHeld[a] = binding[a].some((i) => raw[i] ?? false)
        const axis = pad.axes[0] ?? 0
        if (axis < -AXIS_THRESHOLD) padHeld[axisLeft] = true
        if (axis > AXIS_THRESHOLD) padHeld[axisRight] = true
      } else {
        this.prevRawButtons[slot] = []
      }

      const keys = keyboard[slot]
      const held = this.held[slot]
      const pending = this.pending[slot]
      for (const a of actions) {
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
  take(): [PlayerInputOf<A>, PlayerInputOf<A>] {
    const one = (slot: 0 | 1): PlayerInputOf<A> => {
      const input = { held: { ...this.held[slot] }, pressed: { ...this.pending[slot] } }
      this.pending[slot] = this.empty()
      return input
    }
    return [one(0), one(1)]
  }

  /** ボタン設定中などで、溜まっている「押した瞬間」を捨てる */
  clearPending() {
    this.pending = [this.empty(), this.empty()]
  }
}
