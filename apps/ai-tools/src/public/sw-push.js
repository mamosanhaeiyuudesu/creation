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

  // iOS PWA は通知タップ時に URL を渡せない（start_url で開く / 既存ウィンドウは URL 不変）ため、
  // pushId を CacheStorage に保存し、ページ側が前面化した時に読み取る方式にする。
  let pushId = ''
  try { pushId = new URL(url, self.location.origin).searchParams.get('push') || '' } catch (_e) {}

  event.waitUntil((async () => {
    // 診断: notificationclick が発火したこと自体を CacheStorage に記録
    try {
      const cache = await caches.open('hagemashi-pending')
      await cache.put('/__click-log', new Response('clicked@' + new Date().toISOString() + ' pushId=' + pushId))
      if (pushId) await cache.put('/__pending-push', new Response(pushId))
    } catch (_e) {}

    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const client = clientList.find((c) => c.url.includes('/hagemashi'))
    if (client) {
      // 起動中のウィンドウには postMessage でも即通知（前面復帰の保険）
      try { client.postMessage({ type: 'hagemashi-push-click', pushId }) } catch (_e) {}
      return client.focus()
    }
    return self.clients.openWindow(self.location.origin + '/hagemashi')
  })())
})
