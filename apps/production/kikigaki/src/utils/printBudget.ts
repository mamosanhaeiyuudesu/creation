// PDFの目安文字数（全体で1つ）を、左右の列に振り分ける。
//
// 半分ずつを基本にし、片方が半分に届かないときは、余った分をもう片方に回す
// （例: 全体2000字で左が600字なら、右は1400字まで要約せずに載せる）。
// 戻り値の文字数を超えている列だけ、PDFをつくるときにAIが要約し直す。

export function splitPrintBudget(leftChars: number, rightChars: number, total: number): { left: number; right: number } {
  if (leftChars + rightChars <= total) return { left: leftChars, right: rightChars }
  const half = Math.floor(total / 2)
  if (leftChars <= half) return { left: leftChars, right: total - leftChars }
  if (rightChars <= total - half) return { left: total - rightChars, right: rightChars }
  return { left: half, right: total - half }
}
