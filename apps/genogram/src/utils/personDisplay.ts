import type { Person, Union } from '~/types/genogram'
import { truncateText, wrapText } from '~/utils/textWrap'

/** 記号の上に出す特徴要約の最大文字数(全文はクリックした詳細パネルで見る) */
const CHARACTERISTIC_MAX_CHARS = 20
/** 特徴要約を折り返す文字数 */
export const CHARACTERISTIC_WRAP_CHARS = 10
/** 特徴要約の行の高さ(px) */
export const CHARACTERISTIC_LINE_HEIGHT = 12
/** 特徴要約の下端と記号上端の間に空ける余白(px) */
export const CHARACTERISTIC_GAP_ABOVE_ICON = 6

/** deathYear が入っていれば没年が未指定でも故人として扱う */
export function isDeceased(person: Person): boolean {
  return person.deceased === true || person.deathYear !== undefined
}

/** "1920~1978"(死亡)または"1920~"(生存)。生年が無ければ null */
export function formatLifespan(person: Person): string | null {
  const { birthYear, deathYear } = person
  if (birthYear === undefined) return null
  if (deathYear !== undefined) return `${birthYear}~${deathYear}`
  return `${birthYear}~`
}

/** "(1985-2001)" 等。開始/終了どちらも無ければ null */
export function formatUnionYears(union: Union): string | null {
  const { startYear, endYear } = union
  if (startYear === undefined && endYear === undefined) return null
  if (startYear !== undefined && endYear !== undefined) return `(${startYear}-${endYear})`
  if (startYear !== undefined) return `(${startYear}-)`
  return `(-${endYear})`
}

/** 記号の中央に出す年齢。死亡していれば享年、生存なら現在の満年齢。生年が無ければ null */
export function centerAgeText(person: Person): string | null {
  const { birthYear, deathYear } = person
  if (birthYear === undefined) return null
  if (deathYear !== undefined) return String(deathYear - birthYear)
  if (isDeceased(person)) return null
  return String(new Date().getFullYear() - birthYear)
}

/** 記号の中央、年齢の下に出す "(結婚年齢)"。開始年が分かっている最初の婚姻から算出。無ければ null */
export function marriageAgeText(person: Person, unions: Union[]): string | null {
  if (person.birthYear === undefined) return null
  const union = unions.find((u) => u.partners.includes(person.id) && u.startYear !== undefined)
  if (!union || union.startYear === undefined) return null
  return `(${union.startYear - person.birthYear})`
}

/** 生年/没年・職業・健康メモ・続柄のいずれかがあれば true。無ければ入力を促すバッジを出す判定に使う */
export function hasEnrichedInfo(person: Person): boolean {
  return (
    person.birthYear !== undefined ||
    person.deathYear !== undefined ||
    !!person.occupation ||
    !!person.healthNote ||
    !!person.relation
  )
}

/**
 * 記号の上に表示する、その人物の特徴の要約(職業・注記から20文字程度)。2行程度に折り返す。
 * 健康メモは記号の隅の印(ホバーで表示)に譲り、ここには含めない。
 */
export function characteristicLines(person: Person): string[] {
  const parts = [person.occupation, person.note].filter((v): v is string => !!v)
  if (parts.length === 0) return []
  const text = truncateText(parts.join('・'), CHARACTERISTIC_MAX_CHARS)
  return wrapText(text, CHARACTERISTIC_WRAP_CHARS)
}

/** 名前の下に続けて表示する行(続柄→生涯の順)。存在するものだけ。名前と同じ内容の続柄は重複表示しない */
export function belowNameLines(person: Person): string[] {
  const lines: string[] = []
  if (person.relation && person.relation !== person.name) lines.push(person.relation)
  const lifespan = formatLifespan(person)
  if (lifespan) lines.push(lifespan)
  return lines
}
