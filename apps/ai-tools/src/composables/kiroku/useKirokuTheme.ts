import { onMounted, ref } from 'vue'

/**
 * 既定は端末の設定にしたがう（夜に書く人がいる前提でダークを用意する）。
 * 明示的に選んだときだけ html[data-kiroku-theme] を立て、CSS 側でそれを優先させる。
 */
export type KirokuTheme = 'system' | 'light' | 'dark'

const THEME_KEY = 'kiroku-theme-v1'

// ページをまたいでも選択が保たれるよう、モジュールスコープで持つ
const theme = ref<KirokuTheme>('system')
const systemDark = ref(false)

function applyTheme(value: KirokuTheme) {
  const el = document.documentElement
  if (value === 'system') el.removeAttribute('data-kiroku-theme')
  else el.setAttribute('data-kiroku-theme', value)
}

export function useKirokuTheme() {
  onMounted(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = mq.matches
    mq.addEventListener('change', (e) => {
      systemDark.value = e.matches
    })

    try {
      const stored = localStorage.getItem(THEME_KEY)
      if (stored === 'light' || stored === 'dark') theme.value = stored
    } catch {
      /* 読めなければ端末の設定のまま */
    }
    applyTheme(theme.value)
  })

  const isDark = () => (theme.value === 'system' ? systemDark.value : theme.value === 'dark')

  /** 明るい／暗いの2択で切り替える（3状態の循環はわかりにくいので採らない） */
  const toggle = () => {
    const next: KirokuTheme = isDark() ? 'light' : 'dark'
    theme.value = next
    applyTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* 保存できなくても今の表示は切り替わる */
    }
  }

  return { theme, systemDark, isDark, toggle }
}
