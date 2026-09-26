// Three.js の描画。ロジックの状態（MatchState）を毎フレーム受け取って見た目に写すだけで、
// ゲームの判定はここでは一切しない。ブラウザ専用なのでページからは onMounted で動的 import する。
//
// 座標: x = 試合場の前後（ロジックの x と同じ m 単位）、y = 高さ、z = 奥行き（カメラは +z 側から真横に見る）。
import * as THREE from 'three'
import { STAGE_HALF, START_X, STRIKES } from '../kendo/constants'
import type { Fighter, MatchState, PlayerId, Technique } from '../kendo/types'

export const COLORS = {
  floor: 0xc8975a,
  floorLine: 0xf5f0e6,
  wall: 0xe8dcc4,
  beam: 0x6b4a2b,
  gi: 0x1f2a44,
  men: 0x171d2e,
  grille: 0x9aa3b5,
  shinai: 0xe8d49a,
  tsuba: 0x2b2118,
  referee: 0x2a2a2a,
  skin: 0xe9c6a1,
  red: 0xd83a3a,
  white: 0xf7f7f7,
}

/** 竹刀の角度（ラジアン。0 = 前へ水平、+ = 上）。構え・振りかぶり・打突の見た目 */
const KAMAE = 0.25
const RAISED: Record<Technique, number> = { men: 1.9, kote: 1.3, do: 1.9 }
const STRUCK: Record<Technique, number> = { men: 0.05, kote: -0.3, do: -0.65 }
/** 振りかぶりのうち、上げる動きに使う割合（残りで振り下ろして active に届く） */
const RAISE_PORTION = 0.65

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

interface Pose {
  sword: number
  /** 胴打ちのとき竹刀を斜めにひねる */
  twist: number
  /** 体の傾き（+ = 後ろへのけぞる） */
  lean: number
  bob: number
}

function poseOf(f: Fighter): Pose {
  const pose: Pose = { sword: KAMAE, twist: 0, lean: 0, bob: 0 }
  const t = f.technique
  switch (f.phase) {
    case 'move':
      pose.bob = Math.abs(Math.sin(f.phaseFrame * 0.35)) * 0.03
      break
    case 'windup': {
      const d = STRIKES[t!]
      const p = f.phaseFrame / d.windup
      if (p < RAISE_PORTION) pose.sword = lerp(KAMAE, RAISED[t!], easeOut(p / RAISE_PORTION))
      else pose.sword = lerp(RAISED[t!], STRUCK[t!], (p - RAISE_PORTION) / (1 - RAISE_PORTION))
      pose.twist = t === 'do' ? 0.6 * p : 0
      pose.lean = -0.08 * p
      break
    }
    case 'active':
      pose.sword = STRUCK[t!]
      pose.twist = t === 'do' ? 0.6 : 0
      pose.lean = -0.08
      break
    case 'recovery': {
      const p = easeOut(f.phaseFrame / STRIKES[t!].recovery)
      pose.sword = lerp(STRUCK[t!], KAMAE, p)
      pose.twist = t === 'do' ? lerp(0.6, 0, p) : 0
      pose.lean = lerp(-0.08, 0, p)
      break
    }
    case 'hit':
      pose.lean = 0.18 * Math.min(1, f.phaseFrame / 8)
      break
  }
  return pose
}

export function mesh(geometry: THREE.BufferGeometry, color: number, opts: { shadow?: boolean } = {}) {
  const m = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.75 }))
  if (opts.shadow !== false) m.castShadow = true
  return m
}

class FighterView {
  readonly root = new THREE.Group()
  private readonly body = new THREE.Group()
  private readonly arm = new THREE.Group()
  private readonly blade = new THREE.Group()

  constructor(id: PlayerId) {
    // 胴体（カプセル）: 高さ 0.56+0.9 = 1.46m
    const torso = mesh(new THREE.CapsuleGeometry(0.28, 0.9, 6, 16), COLORS.gi)
    torso.position.y = 0.73
    // 面
    const head = mesh(new THREE.SphereGeometry(0.2, 20, 16), COLORS.men)
    head.position.y = 1.62
    const grille = mesh(new THREE.BoxGeometry(0.06, 0.22, 0.26), COLORS.grille)
    grille.position.set(0.17, 1.6, 0)
    // 目印（背中のたすき）: 赤＝P1、白＝P2
    const tasuki = mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), id === 0 ? COLORS.red : COLORS.white)
    tasuki.position.set(-0.3, 1.2, 0)
    this.body.add(torso, head, grille, tasuki)

    // 腕＝肩を軸に回るグループ。竹刀は +x 方向に伸びる
    this.arm.position.set(0.12, 1.22, 0.12)
    const shinai = mesh(new THREE.CylinderGeometry(0.018, 0.024, 1.15, 10), COLORS.shinai)
    shinai.rotation.z = -Math.PI / 2
    shinai.position.x = 0.2 + 1.15 / 2
    const tsuba = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), COLORS.tsuba)
    tsuba.rotation.z = -Math.PI / 2
    tsuba.position.x = 0.2
    const hands = mesh(new THREE.BoxGeometry(0.2, 0.09, 0.1), COLORS.men)
    hands.position.x = 0.1
    this.blade.add(shinai, tsuba, hands)
    this.arm.add(this.blade)
    this.body.add(this.arm)

    this.root.add(this.body)
  }

  sync(f: Fighter) {
    this.root.position.x = f.x
    // ローカルの +x を向いている方向へ（左向きなら180°回す）
    this.root.rotation.y = f.facing === 1 ? 0 : Math.PI
    const pose = poseOf(f)
    this.arm.rotation.z = pose.sword
    this.blade.rotation.x = pose.twist
    this.body.rotation.z = pose.lean
    this.body.position.y = pose.bob
  }
}

class RefereeView {
  readonly root = new THREE.Group()
  private readonly redArm = new THREE.Group()
  private readonly whiteArm = new THREE.Group()

  constructor() {
    const body = mesh(new THREE.CapsuleGeometry(0.26, 0.9, 6, 16), COLORS.referee)
    body.position.y = 0.72
    const head = mesh(new THREE.SphereGeometry(0.16, 16, 12), COLORS.skin)
    head.position.y = 1.55
    this.root.add(body, head)
    // カメラから見て左（赤＝P1 側）に赤旗、右に白旗
    this.root.add(this.makeArm(this.redArm, -1, COLORS.red), this.makeArm(this.whiteArm, 1, COLORS.white))
    this.root.position.set(0, 0, -2.2)
  }

  private makeArm(arm: THREE.Group, side: -1 | 1, flagColor: number) {
    arm.position.set(side * 0.3, 1.3, 0)
    const stick = mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.0, 8), COLORS.beam)
    stick.position.y = -0.5
    const flag = mesh(new THREE.BoxGeometry(0.46, 0.36, 0.01), flagColor)
    flag.position.set(side * 0.23, -0.8, 0)
    arm.add(stick, flag)
    return arm
  }

  sync(raised: PlayerId | null) {
    // 下ろしている＝少し開いた角度、上げる＝斜め上
    this.redArm.rotation.z = raised === 0 ? -2.4 : -0.25
    this.whiteArm.rotation.z = raised === 1 ? 2.4 : 0.25
  }
}

/** 一本・勝負ありのときに審判が上げる旗（第1弾・第2弾共通） */
export function flagOf(state: { phase: string; points: readonly { by: PlayerId }[]; winner: PlayerId | null }): PlayerId | null {
  if (state.phase === 'ippon') return state.points[state.points.length - 1]?.by ?? null
  if (state.phase === 'end') return state.winner
  return null
}

/**
 * 道場・ライト・真横固定カメラ・審判（第1弾・第2弾共通）。剣士は弾ごとのサブクラスが足す。
 */
export class DojoStage {
  protected readonly renderer: THREE.WebGLRenderer
  protected readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100)
  private readonly referee = new RefereeView()

  constructor(canvas: HTMLCanvasElement, startX: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene.background = new THREE.Color(COLORS.wall)
    // 真横の固定カメラ。場の端から端（±STAGE_HALF）が収まる距離
    this.camera.position.set(0, 1.5, 11.5)
    this.camera.lookAt(0, 1.0, 0)

    this.buildDojo(startX)
    this.scene.add(this.referee.root)
  }

  private buildDojo(startX: number) {
    this.scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a6a48, 1.4))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(3, 8, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 6, bottom: -2 })
    this.scene.add(sun)

    const floor = new THREE.Mesh(
      // 奥の壁からカメラの下まで敷く（手前で切れて背景が見えないように）
      new THREE.BoxGeometry(40, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 0.55 }),
    )
    floor.position.set(0, -0.05, 4.5)
    floor.receiveShadow = true
    this.scene.add(floor)

    // 試合場の境界線と開始線（白いテープ）
    const line = (w: number, d: number, x: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.005, d), new THREE.MeshStandardMaterial({ color: COLORS.floorLine }))
      m.position.set(x, 0.003, 0)
      m.receiveShadow = true
      this.scene.add(m)
    }
    line(0.06, 4, -STAGE_HALF - 0.3)
    line(0.06, 4, STAGE_HALF + 0.3)
    line(0.06, 0.6, -startX)
    line(0.06, 0.6, startX)

    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), new THREE.MeshStandardMaterial({ color: COLORS.wall }))
    wall.position.set(0, 3, -3.5)
    wall.receiveShadow = true
    this.scene.add(wall)
    // 腰板と柱で道場らしく
    const wainscot = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 0.05), new THREE.MeshStandardMaterial({ color: COLORS.beam }))
    wainscot.position.set(0, 0.5, -3.45)
    this.scene.add(wainscot)
    for (const x of [-7, 7]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 0.3), new THREE.MeshStandardMaterial({ color: COLORS.beam }))
      pillar.position.set(x, 3, -3.3)
      this.scene.add(pillar)
    }
  }

  resize(width: number, height: number) {
    if (width === 0 || height === 0) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  /** 剣士を写し終えたあとに呼ぶ */
  protected draw(flag: PlayerId | null) {
    this.referee.sync(flag)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const m of mats) m.dispose()
      }
    })
    this.renderer.dispose()
  }
}

export class KendoRenderer extends DojoStage {
  private readonly fighters: [FighterView, FighterView] = [new FighterView(0), new FighterView(1)]

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, START_X)
    this.scene.add(this.fighters[0].root, this.fighters[1].root)
  }

  render(state: MatchState) {
    this.fighters[0].sync(state.fighters[0])
    this.fighters[1].sync(state.fighters[1])
    this.draw(flagOf(state))
  }
}
