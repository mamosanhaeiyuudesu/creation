const MANIFEST_MAP: Record<string, string> = {
  '/deepheart': '/manifest-deepheart.json',
  '/japanese-mlb-player': '/manifest-mlb.json',
  '/keiko': '/manifest-keiko.json',
  '/hagemashi': '/manifest-hagemashi.json',
  '/whisper': '/manifest-whisper.json',
  '/task': '/manifest-task.json',
}

function getManifestHref(path: string): string | null {
  for (const [prefix, href] of Object.entries(MANIFEST_MAP)) {
    if (path === prefix || path.startsWith(prefix + '/')) return href
  }
  return null
}

function applyManifest(path: string) {
  const href = getManifestHref(path)
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (href) {
    if (!link) {
      link = document.createElement('link')
      link.rel = 'manifest'
      document.head.appendChild(link)
    }
    if (link.href !== new URL(href, location.origin).href) link.href = href
  } else {
    link?.remove()
  }
}

export default defineNuxtPlugin(() => {
  const route = useRoute()
  applyManifest(route.path)
  watch(() => route.path, applyManifest)
})
