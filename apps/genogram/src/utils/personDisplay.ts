import type { Person, Union } from '~/types/genogram'

/** deathYear が入っていれば没年が未指定でも故人として扱う */
export function isDeceased(person: Person): boolean {
  return person.deceased === true || person.deathYear !== undefined
}

/** "(1950-2020)" 等。生没年どちらも無ければ null */
export function formatPersonYears(person: Person): string | null {
  const { birthYear, deathYear } = person
  if (birthYear === undefined && deathYear === undefined) return null
  if (birthYear !== undefined && deathYear !== undefined) return `(${birthYear}-${deathYear})`
  if (birthYear !== undefined) return `(${birthYear}-)`
  return `(-${deathYear})`
}

/** "(1985-2001)" 等。開始/終了どちらも無ければ null */
export function formatUnionYears(union: Union): string | null {
  const { startYear, endYear } = union
  if (startYear === undefined && endYear === undefined) return null
  if (startYear !== undefined && endYear !== undefined) return `(${startYear}-${endYear})`
  if (startYear !== undefined) return `(${startYear}-)`
  return `(-${endYear})`
}

/** 生年/没年・職業・健康メモのいずれかがあれば true。無ければ入力を促すバッジを出す判定に使う */
export function hasEnrichedInfo(person: Person): boolean {
  return person.birthYear !== undefined || person.deathYear !== undefined || !!person.occupation || !!person.healthNote
}

/** ノード下に名前に続けて表示するテキスト行(存在するものだけ) */
export function personDetailLines(person: Person): string[] {
  const lines: string[] = []
  const years = formatPersonYears(person)
  if (years) lines.push(years)
  if (person.occupation) lines.push(person.occupation)
  if (person.note) lines.push(person.note)
  return lines
}
