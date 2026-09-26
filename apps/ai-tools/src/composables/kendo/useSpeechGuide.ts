// 剣道ゲームの「あそびかた」を声で読み上げる（第1弾・第2弾共通）。
// ブラウザ標準の Web Speech API（speechSynthesis）を使う＝サーバー・API鍵・ログイン不要で、Mac なら日本語の声が入っている。
// 1文ずつ読み上げて、いま読んでいる文を字幕に出す（Chrome は長い文をまとめて渡すと途中で止まることがあるため、分けて渡す）。
import { onMounted, onUnmounted, ref } from 'vue'

export interface GuideLine {
  /** 画面の字幕（子供が読めるように、ひらがな多め） */
  show: string
  /** 読み上げる文（漢字まじりの方が音声の読み・抑揚が自然になる） */
  say: string
}

/** 子供向けに、少しゆっくり・少し高めの声で */
const RATE = 0.95
const PITCH = 1.15
/** 日本語の声の優先順（Mac の Kyoko / O-ren、Chrome の Google 日本語） */
const PREFERRED_VOICES = ['Kyoko', 'O-ren', 'Google 日本語']

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').startsWith('ja'))
  for (const name of PREFERRED_VOICES) {
    const v = voices.find((voice) => voice.name.includes(name))
    if (v) return v
  }
  return voices[0] ?? null
}

export function useSpeechGuide(lines: readonly GuideLine[]) {
  const supported = ref(false)
  const speaking = ref(false)
  /** いま読んでいる行（読んでいないときは -1） */
  const current = ref(-1)
  // onend が来る前に GC されると Chrome で止まるので、参照を持っておく
  let utterance: SpeechSynthesisUtterance | null = null
  let runId = 0

  onMounted(() => {
    supported.value = typeof window !== 'undefined' && 'speechSynthesis' in window
    // Chrome は声の一覧が後から届くので、先に一度取っておく
    if (supported.value) window.speechSynthesis.getVoices()
  })

  function speakLine(index: number, id: number) {
    if (id !== runId) return
    const line = lines[index]
    if (!line) {
      stop()
      return
    }
    current.value = index
    utterance = new SpeechSynthesisUtterance(line.say)
    utterance.lang = 'ja-JP'
    utterance.rate = RATE
    utterance.pitch = PITCH
    const voice = pickVoice()
    if (voice) utterance.voice = voice
    utterance.onend = () => speakLine(index + 1, id)
    utterance.onerror = () => {
      if (id === runId) stop()
    }
    window.speechSynthesis.speak(utterance)
  }

  function start() {
    if (!supported.value) return
    window.speechSynthesis.cancel()
    runId += 1
    speaking.value = true
    speakLine(0, runId)
  }

  function stop() {
    runId += 1
    speaking.value = false
    current.value = -1
    utterance = null
    if (supported.value) window.speechSynthesis.cancel()
  }

  function toggle() {
    if (speaking.value) stop()
    else start()
  }

  onUnmounted(stop)

  return { supported, speaking, current, toggle, stop }
}
