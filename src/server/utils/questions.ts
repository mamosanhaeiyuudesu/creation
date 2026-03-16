export const parseQuestions = (text: string): string[] => {
    if (!text) return []

    // JSON配列を文字列内から抽出して解析する
    const arrayMatch = text.match(/\[[\s\S]*?\]/)
    if (arrayMatch) {
        try {
            const parsed = JSON.parse(arrayMatch[0])
            if (Array.isArray(parsed)) return parsed.map((item) => String(item))
        } catch {
            // Fall through
        }
    }

    // コードブロックのバッククォートと言語ラベルを除去してから行分割
    const cleaned = text
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim()

    return cleaned.split(/\r?\n/)
}

export const normalizeQuestion = (question: string): string =>
    question
        .replace(/^\s*[-*+]\s+/, '')
        .replace(/^\s*\d+[.)]\s+/, '')
        .replace(/^[「『"'`]+/, '')
        .replace(/[」』"'`]+$/, '')
        .replace(/\s+/g, ' ')
        .trim()
