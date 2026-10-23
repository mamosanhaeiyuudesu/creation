import { findOgPage } from '~/utils/og-pages'

// URLを共有したときのサムネイル（OGP）を、HTMLを返す直前に head へ差し込む。
// ページごとに useHead を書かずに済むようにし、ssr: false のページでも確実にHTMLに載せるためサーバー側で行う。
// すでにページ側で og:image を出しているもの（miyako・japanese-mlb-player）は二重にしない。

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    if (html.head.some((h) => h.includes('og:image'))) return
    const url = getRequestURL(event)
    const page = findOgPage(url.pathname)
    if (!page) return
    const image = `${url.origin}/og/${page.image}.png`
    const tags = [
      ['property', 'og:type', 'website'],
      ['property', 'og:title', page.title],
      ['property', 'og:description', page.description],
      ['property', 'og:url', `${url.origin}${url.pathname}`],
      ['property', 'og:image', image],
      ['property', 'og:image:width', '1200'],
      ['property', 'og:image:height', '630'],
      ['name', 'twitter:card', 'summary_large_image'],
      ['name', 'description', page.description],
    ]
    // ページが description を自分で出しているときはそちらを優先する
    const hasDescription = html.head.some((h) => h.includes('name="description"'))
    html.head.push(
      tags
        .filter(([, key]) => !(key === 'description' && hasDescription))
        .map(([attr, key, value]) => `<meta ${attr}="${key}" content="${esc(value!)}">`)
        .join('\n')
    )
  })
})
