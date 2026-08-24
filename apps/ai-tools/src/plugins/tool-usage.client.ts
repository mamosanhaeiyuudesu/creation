import { recordToolUsage } from '~/composables/useToolUsage'
import { findToolByPath } from '~/utils/tools'

// トップページの「よく使う」用に、ツールを開いた回数を端末内に記録する。
// 下層ページを行き来しても増えないよう、開いているツールが変わったときだけ数える。
export default defineNuxtPlugin(() => {
  const route = useRoute()
  let currentTool = findToolByPath(route.path)?.path ?? null

  if (currentTool) recordToolUsage(currentTool)

  watch(
    () => route.path,
    (path) => {
      const tool = findToolByPath(path)?.path ?? null
      if (tool && tool !== currentTool) recordToolUsage(tool)
      currentTool = tool
    }
  )
})
