import { describe, expect, it } from 'vitest'
import { cleanTranscript, stripPromptEcho, stripTranscriptionHallucinations } from '~/server/utils/transcript-clean'

// ここは ai-tools で実際の会議録音で起きた壊れ方（同じ語の100連発・段落まるごとの繰り返し・
// プロンプトの写し・無音時の定型幻覚）への対処。移植しても同じように効くことを確かめる。

describe('stripPromptEcho', () => {
  it('プロンプトの写しが行まるごとで出ているぶんを消す', () => {
    const hint = '次の固有名詞が出てきます: 阪中さん、葛城町。'
    const text = `${hint}\nそれでは会議を始めます。`
    expect(stripPromptEcho(text, [hint, '阪中さん、葛城町'])).toBe('それでは会議を始めます。')
  })

  it('本当に喋られた文の中に同じ語が含まれていても消さない', () => {
    const hint = '次の固有名詞が出てきます: 阪中さん、葛城町。'
    const text = '阪中さん、葛城町の件はどうなりましたか。'
    expect(stripPromptEcho(text, [hint, '阪中さん、葛城町'])).toBe(text)
  })

  it('context: ### ... ### のブロックを落とす', () => {
    expect(stripPromptEcho('context: ## 用語 ##\n本題です。', [])).toBe('本題です。')
  })
})

describe('stripTranscriptionHallucinations', () => {
  it('行がその定型文だけでできているときは消す（マイクが拾えていない合図）', () => {
    expect(stripTranscriptionHallucinations('ご視聴ありがとうございました')).toBe('')
    expect(stripTranscriptionHallucinations('ご視聴ありがとうございました。')).toBe('')
  })

  it('本当に喋られた文は残す', () => {
    const line = 'みんなにご視聴ありがとうございましたと言いました。'
    expect(stripTranscriptionHallucinations(line)).toBe(line)
  })
})

describe('cleanTranscript', () => {
  it('同じ語の繰り返し（3回以上）を1回に畳む', () => {
    expect(cleanTranscript('飛行機が'.repeat(50))).toBe('飛行機が')
  })

  it('塊ごとの繰り返し（A B C A B C A B C）を畳む', () => {
    const block = 'そうですね。わかりました。では次に行きます。'
    expect(cleanTranscript(block.repeat(3))).toBe(
      'そうですね。\nわかりました。\nでは次に行きます。'
    )
  })

  it('相づちが2回続くのは自然な会話なので残す', () => {
    expect(cleanTranscript('はい。はい。')).toBe('はい。\nはい。')
  })

  it('無音の幻覚だけの文字起こしは空になる（声が入っていないと判断できる）', () => {
    expect(cleanTranscript('ご視聴ありがとうございました')).toBe('')
  })
})
