// 第0弾の描画。道場・審判は共通（DojoStage）、剣士は第2弾の人型（Kenshi）を使い回す。
// 面が届く距離に入ったら2人の間の床を光らせる（＝「いまだ！」）。判定は持たず MatchState を写すだけ。
import * as THREE from 'three'
import { START_GAP, WHIFF_FRAMES, WINDUP_BY_AGE } from '../kendo0/constants'
import { distanceBetween, inZone } from '../kendo0/match'
import type { Age, Fighter, MatchState } from '../kendo0/types'
import { DojoStage, flagOf } from './renderer'
import { CHUDAN, easeOut, Kenshi, lerpPose, RAISED, STRUCK } from './renderer2'
import type { Feet, Pose } from './renderer2'

/** 年齢で背の高さを変える（見た目だけ。届く距離は同じ） */
const AGE_SCALE: Readonly<Record<Age, number>> = { kinder: 0.72, elementary: 0.86, adult: 1 }
const RAISE_PORTION = 0.6
const ZONE_COLOR = 0xffc93c

function poseOf(f: Fighter): Pose {
  switch (f.phase) {
    case 'windup': {
      const p = f.phaseFrame / WINDUP_BY_AGE[f.age]
      if (p < RAISE_PORTION) return lerpPose(CHUDAN, RAISED.men, easeOut(p / RAISE_PORTION))
      return lerpPose(RAISED.men, STRUCK.men, (p - RAISE_PORTION) / (1 - RAISE_PORTION))
    }
    case 'active':
      return STRUCK.men
    case 'whiff': {
      // 空振り: 前のめりのまま少し止まってから構えに戻る
      const p = Math.min(1, f.phaseFrame / (WHIFF_FRAMES * 0.6))
      return lerpPose({ ...STRUCK.men, lean: -0.16 }, CHUDAN, easeOut(p))
    }
    case 'hit':
      return { ...CHUDAN, lean: 0.18 * Math.min(1, f.phaseFrame / 8) }
    default:
      return CHUDAN
  }
}

export class Kendo0Renderer extends DojoStage {
  private readonly kenshi: [Kenshi, Kenshi] = [new Kenshi(0), new Kenshi(1)]
  private readonly zone: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private readonly prevX: [number, number] = [0, 0]
  private walkFrame = 0

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, START_GAP / 2)
    this.zone = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1.6),
      new THREE.MeshBasicMaterial({ color: ZONE_COLOR, transparent: true, opacity: 0, depthWrite: false }),
    )
    this.zone.rotation.x = -Math.PI / 2
    this.zone.position.y = 0.01
    this.scene.add(this.kenshi[0].root, this.kenshi[1].root, this.zone)
  }

  render(state: MatchState) {
    this.walkFrame += 1
    for (const f of state.fighters) {
      const k = this.kenshi[f.id]
      k.root.scale.setScalar(AGE_SCALE[f.age])
      // 自動で歩いているときは足を動かす
      const moving = Math.abs(f.x - this.prevX[f.id]) > 1e-4 && f.phase === 'idle'
      this.prevX[f.id] = f.x
      const s = Math.sin(this.walkFrame * 0.3)
      const feet: Feet = moving ? { right: 0.05 * s, left: -0.05 * s, bob: Math.abs(s) * 0.015 } : { right: 0, left: 0, bob: 0 }
      k.apply(f.x, f.facing, poseOf(f), feet)
    }

    const lit = state.phase === 'fight' && inZone(state)
    const [a, b] = state.fighters
    this.zone.position.x = (a.x + b.x) / 2
    this.zone.scale.x = Math.max(0.1, distanceBetween(state))
    this.zone.material.opacity = lit ? 0.45 + 0.2 * Math.sin(this.walkFrame * 0.25) : 0

    this.draw(flagOf(state))
  }
}
