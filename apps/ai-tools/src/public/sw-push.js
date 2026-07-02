/* Web Push ハンドラ（workbox の importScripts から読み込まれる） */
/* eslint-disable no-undef */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_e) {
    data = { title: 'はげまし', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'はげまし'
  const options = {
    body: data.body || '',
    icon: '/apple-touch-icon-hagemashi.png',
    badge: '/apple-touch-icon-hagemashi.png',
    tag: data.tag || 'hagemashi',
    data: { url: data.url || '/hagemashi' },
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/hagemashi'

  event.waitUntil((async () => {
    // CacheStorage に書いておく → postMessage が届かなくても、ページ起動時に読める（iOS 対策）
    try {
      const cache = await caches.open('hagemashi-pending')
      await cache.put('/__pending-push', new Response(url))
    } catch (_e) {}

    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const hagemashiClient = clientList.find((c) => c.url.includes('/hagemashi'))
    if (hagemashiClient) {
      // すでに開いているウィンドウには postMessage でも伝達（キャッシュとの二重保険）
      try { hagemashiClient.postMessage({ type: 'hagemashi-push-click', url }) } catch (_e) {}
      return hagemashiClient.focus()
    }
    const absoluteUrl = url.startsWith('http') ? url : self.location.origin + url
    return self.clients.openWindow(absoluteUrl)
  })())
})
