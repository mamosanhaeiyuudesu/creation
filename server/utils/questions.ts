export const parseQuestions = (text: string): string[] => {
    if (!text) return []

    const withoutBlocks = text.replace(/```[\s\S]*?```/g, (block) =>
        block.replace(/```/g, '')
    )

    try {
        const parsed = JSON.parse(withoutBlocks)
        if (Array.isArray(parsed)) return parsed.map((item) => String(item))
    } catch {
        // Fall back to line parsing.
    }

    return withoutBlocks.split(/\r?\n/)
}

export const normalizeQuestion = (question: string): string =>
    question
        .replace(/^\s*[-*+]\s+/, '')
        .replace(/^\s*\d+[.)]\s+/, '')
        .replace(/^[「『"'`]+/, '')
        .replace(/[」』"'`]+$/, '')
        .replace(/\s+/g, ' ')
        .trim()
