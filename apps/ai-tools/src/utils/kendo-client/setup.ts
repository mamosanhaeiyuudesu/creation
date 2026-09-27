// 試合前の選択（ふたりで／COMと・COMの強さ・年齢）。第0〜2弾で共通。前回の選択は弾ごとに localStorage に残す。
import type { Age } from '../kendo0/types'

export interface KendoSetupValue {
  vsCom: boolean
  /** COM の強さ ★1〜5 */
  level: number
  /** 赤・白の年齢（第0弾だけで使う。COM の年齢は COM_AGE で固定） */
  ages: [Age, Age]
}

/** 第0弾で COM が使う竹刀の速さ（強さは★で変える） */
export const COM_AGE: Age = 'elementary'

export const DEFAULT_SETUP: KendoSetupValue = { vsCom: false, level: 2, ages: ['kinder', 'elementary'] }

const AGES: readonly Age[] = ['kinder', 'elementary', 'adult']

/** コピー（Vue のリアクティブなプロキシは structuredClone できないので、手でコピーする） */
export function copySetup(v: KendoSetupValue): KendoSetupValue {
  return { vsCom: v.vsCom, level: v.level, ages: [v.ages[0], v.ages[1]] }
}

export function loadSetup(key: string): KendoSetupValue {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return copySetup(DEFAULT_SETUP)
    const v = JSON.parse(raw) as Partial<KendoSetupValue>
    const age = (a: unknown, fallback: Age): Age => (AGES.includes(a as Age) ? (a as Age) : fallback)
    return {
      vsCom: v.vsCom === true,
      level: Number.isInteger(v.level) && v.level! >= 1 && v.level! <= 5 ? v.level! : DEFAULT_SETUP.level,
      ages: [age(v.ages?.[0], DEFAULT_SETUP.ages[0]), age(v.ages?.[1], DEFAULT_SETUP.ages[1])],
    }
  } catch {
    return copySetup(DEFAULT_SETUP)
  }
}

export function saveSetup(key: string, v: KendoSetupValue) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // 保存できなくても、このタブの間は使える
  }
}

/** 乱数の種（画面では毎回変える。テストでは固定値を渡す） */
export function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}
