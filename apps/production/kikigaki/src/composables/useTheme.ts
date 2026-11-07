// 背景色（ふつう／ダーク）。この端末のブラウザに覚えさせる（アカウントには保存しない）。
// 起動時のちらつきは nuxt.config の head スクリプトで先に data-theme を付けて防ぐ。
export type KkTheme = 'light' | 'dark'
export const THEME_KEY = 'kk-theme'

export function useTheme() {
  const theme = useState<KkTheme>('kk-theme', () => 'light')

  function apply(t: KkTheme) {
    if (!import.meta.client) return
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
    else document.documentElement.removeAttribute('data-theme')
  }

  /** ブラウザに覚えている値を読む（ページを開いたとき1回） */
  function init() {
    try {
      theme.value = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
    } catch {
      /* 保存できない環境ではふつうのまま */
    }
    apply(theme.value)
  }

  function setTheme(t: KkTheme) {
    theme.value = t
    apply(t)
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {
      /* 覚えられなくても、今の画面では変わる */
    }
  }

  return { theme, init, setTheme }
}
