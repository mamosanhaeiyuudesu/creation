/** `**太字**` 記法をセグメント配列に分解する（描画時に <strong> を当てるため）。 */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter(s => s.text)
}
