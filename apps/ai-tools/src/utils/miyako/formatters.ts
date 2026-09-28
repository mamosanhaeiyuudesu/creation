/** 元号表記（令和/平成）を西暦に変換する */
export function eraToWestern(text: string): string {
  return text
    .replace(/令和元年/g, '2019年')
    .replace(/令和(\d+)年/g, (_, n) => `${2018 + parseInt(n)}年`)
    .replace(/平成元年/g, '1989年')
    .replace(/平成(\d+)年/g, (_, n) => `${1988 + parseInt(n)}年`)
}
