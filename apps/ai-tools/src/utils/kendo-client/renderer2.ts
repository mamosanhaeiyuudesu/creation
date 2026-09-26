// 第2弾の描画。道場・審判・カメラは第1弾と共通（DojoStage）で、剣士だけ関節のある人型にしている。
// 外部の3Dモデルは使わず、基本図形の組み合わせ（読み込み・ライセンス不要）。
// 判定は一切持たず、MatchState を毎フレーム写すだけ。
//
// 剣士のローカル座標: +x = 前（相手の方）、y = 上、原点 = 腰（床から HIP_Y）。
import * as THREE from 'three'
import { START_X, STEP_FRAMES } from '../kendo2/constants'
import { strikeRecovery, strikeWindup } from '../kendo2/fighter'
import type { Fighter, MatchState, PlayerId, Technique } from '../kendo2/types'
import { COLORS, DojoStage, flagOf, mesh } from './renderer'

const HIP_Y = 0.92
const SHOULDER_Y = 0.5
const SHOULDER_Z = 0.17
const UPPER_ARM = 0.3
const FOREARM = 0.3
const TSUKA = 0.28
const SHINAI = 1.14
/** 右手は左手（柄頭）から竹刀の向きにこれだけ先を握る */
const RIGHT_HAND_ON_TSUKA = 0.2

const GEAR = {
  hakama: 0x1c2438,
  gi: 0x243052,
  dou: 0x3a1c16,
  mune: 0x1a1a1a,
  men: 0x1d2335,
  mengane: 0xc9ccd4,
  kote: 0x2a2f45,
  koteCuff: 0x7a2d24,
  tsuka: 0xf1ece0,
  skin: 0xe9c6a1,
}

/** 手（柄頭）の位置・竹刀の角度・ひねり・体の傾き */
interface Pose {
  hx: number
  hy: number
  /** 竹刀の角度（0 = 前へ水平、+ = 上） */
  angle: number
  /** 竹刀のひねり（胴打ち・小手の防御で剣先が横に開く） */
  twist: number
  /** 体の傾き（+ = 後ろへのけぞる、- = 前のめり） */
  lean: number
}

const CHUDAN: Pose = { hx: 0.28, hy: 0.05, angle: 0.32, twist: 0, lean: 0 }
/** 面の防御: 手元を上げて竹刀を斜めに立て、頭上をかばう */
const GUARD_MEN: Pose = { hx: 0.26, hy: 0.62, angle: 0.95, twist: 0.35, lean: 0.03 }
/** 小手の防御: 手元を引いて下げ、剣先を右へ開く */
const GUARD_KOTE: Pose = { hx: 0.12, hy: -0.06, angle: 0.18, twist: -0.7, lean: 0.03 }
const KUZURE: Pose = { hx: 0.18, hy: 0.35, angle: 0.8, twist: 0.4, lean: 0.24 }

const RAISED: Record<Technique, Pose> = {
  men: { hx: 0.14, hy: 0.78, angle: 1.95, twist: 0, lean: 0 },
  kote: { hx: 0.2, hy: 0.55, angle: 1.35, twist: 0, lean: 0 },
  do: { hx: 0.14, hy: 0.78, angle: 2.0, twist: 0.3, lean: 0 },
  tsuki: { hx: 0.12, hy: 0.08, angle: 0.25, twist: 0, lean: 0.02 }, // 突きは振りかぶらず手元を引く
}
const STRUCK: Record<Technique, Pose> = {
  men: { hx: 0.52, hy: 0.5, angle: 0.08, twist: 0, lean: -0.1 },
  kote: { hx: 0.52, hy: 0.3, angle: -0.1, twist: 0, lean: -0.1 },
  do: { hx: 0.36, hy: 0.22, angle: -0.25, twist: 0.95, lean: -0.08 },
  tsuki: { hx: 0.68, hy: 0.22, angle: 0.22, twist: 0, lean: -0.12 },
}
const RAISE_PORTION = 0.6

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    hx: lerp(a.hx, b.hx, t),
    hy: lerp(a.hy, b.hy, t),
    angle: lerp(a.angle, b.angle, t),
    twist: lerp(a.twist, b.twist, t),
    lean: lerp(a.lean, b.lean, t),
  }
}

export function poseOf(f: Fighter): Pose {
  const t = f.technique
  switch (f.phase) {
    case 'guard':
      return lerpPose(CHUDAN, f.guard === 'men' ? GUARD_MEN : GUARD_KOTE, easeOut(Math.min(1, (f.phaseFrame + 1) / 4)))
    case 'windup': {
      const p = f.phaseFrame / strikeWindup(f)
      // 返し技は振りかぶりが短いので、上げずにそのまま打ち込む
      const raise = f.strikeKaeshiFrom ? 0 : RAISE_PORTION
      if (p < raise) return lerpPose(CHUDAN, RAISED[t!], easeOut(p / raise))
      const from = raise === 0 ? CHUDAN : RAISED[t!]
      return lerpPose(from, STRUCK[t!], (p - raise) / (1 - raise))
    }
    case 'active':
      return STRUCK[t!]
    case 'recovery':
      return lerpPose(STRUCK[t!], CHUDAN, easeOut(f.phaseFrame / strikeRecovery(f)))
    case 'kuzure':
      return lerpPose(STRUCK[t ?? 'men'], KUZURE, easeOut(Math.min(1, f.phaseFrame / 8)))
    case 'hit':
      return { ...CHUDAN, lean: 0.18 * Math.min(1, f.phaseFrame / 8) }
    default:
      return CHUDAN
  }
}

/** 足さばき（右足前）。送り足・歩きのときは右足が先に出て左足が引きつける */
function footOffset(f: Fighter): { right: number; left: number; bob: number } {
  if (f.phase === 'step') {
    const p = f.phaseFrame / STEP_FRAMES
    const dir = f.stepDir
    return { right: dir * 0.12 * Math.sin(p * Math.PI), left: -dir * 0.06 * Math.sin(p * Math.PI), bob: 0.03 * Math.sin(p * Math.PI) }
  }
  if (f.phase === 'move') {
    const s = Math.sin(f.phaseFrame * 0.3)
    return { right: 0.05 * s, left: -0.05 * s, bob: Math.abs(s) * 0.015 }
  }
  if (f.phase === 'windup' || f.phase === 'active') {
    // 踏み込み: 右足を大きく出す
    const total = strikeWindup(f)
    const p = f.phase === 'active' ? 1 : f.phaseFrame / total
    return { right: 0.18 * p, left: -0.04 * p, bob: 0 }
  }
  return { right: 0, left: 0, bob: 0 }
}

/** 円柱を a→b の線分に合わせる（腕の2本の骨に使う） */
function placeSegment(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  const dir = new THREE.Vector3().subVectors(b, a)
  const len = dir.length()
  m.position.copy(a).addScaledVector(dir, 0.5)
  m.scale.set(1, len, 1)
  if (len > 1e-6) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
}

/** 肩→手の2関節IK。肘は下・外側へ曲げる */
function elbowOf(shoulder: THREE.Vector3, hand: THREE.Vector3, side: -1 | 1): THREE.Vector3 {
  const ab = new THREE.Vector3().subVectors(hand, shoulder)
  const d = Math.min(ab.length(), UPPER_ARM + FOREARM - 1e-4)
  const dirN = ab.clone().normalize()
  const hint = new THREE.Vector3(0, -1, side * 0.7)
  const bend = hint.sub(dirN.clone().multiplyScalar(hint.dot(dirN))).normalize()
  const along = (UPPER_ARM * UPPER_ARM - FOREARM * FOREARM + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, UPPER_ARM * UPPER_ARM - along * along))
  return shoulder.clone().addScaledVector(dirN, along).addScaledVector(bend, h)
}

class Kenshi {
  readonly root = new THREE.Group()
  private readonly torso = new THREE.Group()
  private readonly sword = new THREE.Group()
  private readonly blade = new THREE.Group()
  private readonly rightFoot: THREE.Mesh
  private readonly leftFoot: THREE.Mesh
  private readonly arms: { upper: THREE.Mesh; fore: THREE.Mesh; glove: THREE.Mesh; side: -1 | 1; shoulder: THREE.Vector3 }[] = []

  constructor(id: PlayerId) {
    // ── 下半身: 裾の広がった袴と足（右足前）──
    const hips = new THREE.Group()
    hips.position.y = HIP_Y
    const hakama = mesh(new THREE.CylinderGeometry(0.2, 0.37, HIP_Y - 0.04, 24), GEAR.hakama)
    hakama.position.y = -(HIP_Y - 0.04) / 2
    // 袴のひだ（前後に数本の線）
    for (const z of [-0.12, 0, 0.12]) {
      const pleat = mesh(new THREE.BoxGeometry(0.01, HIP_Y - 0.1, 0.012), 0x141a2a, { shadow: false })
      pleat.position.set(0.3, -(HIP_Y - 0.1) / 2 - 0.02, z)
      pleat.rotation.z = -0.18
      hips.add(pleat)
    }
    this.rightFoot = mesh(new THREE.BoxGeometry(0.24, 0.06, 0.1), GEAR.skin)
    this.rightFoot.position.set(0.16, 0.03 - HIP_Y, 0.08)
    this.leftFoot = mesh(new THREE.BoxGeometry(0.24, 0.06, 0.1), GEAR.skin)
    this.leftFoot.position.set(-0.2, 0.05 - HIP_Y, -0.1)
    this.leftFoot.rotation.z = 0.25 // 左かかとを少し浮かせる
    hips.add(hakama, this.rightFoot, this.leftFoot)

    // ── 上半身（腰を軸に傾く）──
    this.torso.position.y = HIP_Y
    const chest = mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.52, 20), GEAR.gi)
    chest.position.y = 0.3
    // 胴（黒光りする胴台）と胸（胸当て）
    const dou = new THREE.Mesh(
      new THREE.CylinderGeometry(0.215, 0.235, 0.3, 24, 1, false, -Math.PI / 2 - 1.2, 2.4),
      new THREE.MeshStandardMaterial({ color: GEAR.dou, roughness: 0.2, metalness: 0.35, side: THREE.DoubleSide }),
    )
    dou.castShadow = true
    dou.position.y = 0.2
    const mune = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.215, 0.14, 24, 1, false, -Math.PI / 2 - 1.1, 2.2),
      new THREE.MeshStandardMaterial({ color: GEAR.mune, roughness: 0.6, side: THREE.DoubleSide }),
    )
    mune.position.y = 0.42
    // 垂れ（腰の前の3枚）
    const tare = new THREE.Group()
    for (const z of [-0.13, 0, 0.13]) {
      const flap = mesh(new THREE.BoxGeometry(0.03, 0.24, 0.12), GEAR.men)
      flap.position.set(0.21, -0.08, z)
      tare.add(flap)
    }
    const tareBelt = mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.06, 20), GEAR.men)
    tareBelt.position.y = 0.04

    // 面: 頭・面金（横の格子）・面垂れ（肩の上の布）・突き垂れ
    const head = new THREE.Group()
    head.position.y = 0.74
    head.add(mesh(new THREE.SphereGeometry(0.16, 24, 18), GEAR.men))
    for (let i = 0; i < 6; i++) {
      const bar = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), GEAR.mengane, { shadow: false })
      bar.rotation.x = Math.PI / 2
      bar.position.set(0.15 - Math.abs(i - 2.5) * 0.004, 0.08 - i * 0.03, 0)
      head.add(bar)
    }
    const centerBar = mesh(new THREE.BoxGeometry(0.012, 0.18, 0.012), GEAR.mengane, { shadow: false })
    centerBar.position.set(0.155, 0.0, 0)
    head.add(centerBar)
    for (const z of [-1, 1]) {
      const dare = mesh(new THREE.BoxGeometry(0.22, 0.2, 0.03), GEAR.men)
      dare.position.set(-0.02, -0.2, z * 0.17)
      dare.rotation.x = z * 0.35
      head.add(dare)
    }
    const tsukiDare = mesh(new THREE.BoxGeometry(0.03, 0.1, 0.12), GEAR.men)
    tsukiDare.position.set(0.13, -0.16, 0)
    head.add(tsukiDare)

    // 背中の目印（たすき）: 赤＝P1、白＝P2
    const mark = id === 0 ? COLORS.red : COLORS.white
    const tasuki = new THREE.Group()
    for (const r of [-0.5, 0.5]) {
      const tail = mesh(new THREE.BoxGeometry(0.03, 0.3, 0.05), mark)
      tail.position.set(-0.22, 0.3, r * 0.06)
      tail.rotation.x = r * 0.6
      tasuki.add(tail)
    }

    this.torso.add(chest, dou, mune, tare, tareBelt, head, tasuki)

    // 竹刀: 柄頭（左手）を原点に +x へ伸びる
    const tsuka = mesh(new THREE.CylinderGeometry(0.017, 0.017, TSUKA, 10), GEAR.tsuka)
    tsuka.rotation.z = -Math.PI / 2
    tsuka.position.x = TSUKA / 2
    const tsuba = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.015, 18), COLORS.tsuba)
    tsuba.rotation.z = -Math.PI / 2
    tsuba.position.x = TSUKA
    const bamboo = mesh(new THREE.CylinderGeometry(0.013, 0.02, SHINAI - TSUKA, 10), COLORS.shinai)
    bamboo.rotation.z = -Math.PI / 2
    bamboo.position.x = TSUKA + (SHINAI - TSUKA) / 2
    const sakigawa = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 10), GEAR.tsuka)
    sakigawa.rotation.z = -Math.PI / 2
    sakigawa.position.x = SHINAI - 0.025
    this.blade.add(tsuka, tsuba, bamboo, sakigawa)
    this.sword.add(this.blade)
    this.torso.add(this.sword)

    // 腕: 肩から手まで2本の骨（上腕・前腕）＋小手
    const segment = (color: number, radius: number) => mesh(new THREE.CylinderGeometry(radius, radius, 1, 10), color)
    for (const side of [-1, 1] as const) {
      const upper = segment(GEAR.gi, 0.055)
      const fore = segment(GEAR.kote, 0.05)
      const glove = mesh(new THREE.BoxGeometry(0.1, 0.09, 0.1), GEAR.kote)
      const cuff = mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.05, 12), GEAR.koteCuff)
      cuff.position.y = -0.07
      glove.add(cuff)
      this.torso.add(upper, fore, glove)
      this.arms.push({ upper, fore, glove, side, shoulder: new THREE.Vector3(0.02, SHOULDER_Y, side * SHOULDER_Z) })
    }

    this.root.add(hips, this.torso)
  }

  sync(f: Fighter) {
    this.root.position.x = f.x
    this.root.rotation.y = f.facing === 1 ? 0 : Math.PI

    const pose = poseOf(f)
    const feet = footOffset(f)
    this.rightFoot.position.x = 0.16 + feet.right
    this.leftFoot.position.x = -0.2 + feet.left
    this.torso.position.y = HIP_Y + feet.bob
    this.torso.rotation.z = pose.lean

    this.sword.position.set(pose.hx, pose.hy, 0.03)
    this.sword.rotation.z = pose.angle
    this.blade.rotation.x = pose.twist

    // 左手＝柄頭、右手＝鍔の少し手前（竹刀の向きに沿って）
    const dir = new THREE.Vector3(Math.cos(pose.angle), Math.sin(pose.angle), 0)
    const leftHand = new THREE.Vector3(pose.hx, pose.hy, 0.03)
    const rightHand = leftHand.clone().addScaledVector(dir, RIGHT_HAND_ON_TSUKA)
    for (const arm of this.arms) {
      // 画面の手前（+z）が右腕になるように。右手が鍔側
      const hand = arm.side === 1 ? rightHand : leftHand
      const elbow = elbowOf(arm.shoulder, hand, arm.side)
      placeSegment(arm.upper, arm.shoulder, elbow)
      placeSegment(arm.fore, elbow, hand)
      arm.glove.position.copy(hand)
      arm.glove.rotation.set(0, 0, pose.angle)
    }
  }
}

export class Kendo2Renderer extends DojoStage {
  private readonly kenshi: [Kenshi, Kenshi] = [new Kenshi(0), new Kenshi(1)]

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, START_X)
    this.scene.add(this.kenshi[0].root, this.kenshi[1].root)
  }

  render(state: MatchState) {
    this.kenshi[0].sync(state.fighters[0])
    this.kenshi[1].sync(state.fighters[1])
    this.draw(flagOf(state))
  }
}

