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

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const hagemashiClient = clientList.find((c) => c.url.includes('/hagemashi'))
      if (hagemashiClient) {
        // iOS Safari は navigate() 未対応のため postMessage でページへ伝達
        hagemashiClient.postMessage({ type: 'hagemashi-push-click', url })
        return hagemashiClient.focus()
      }
      // アプリ未起動 → 絶対URLで新規起動（?push= を引き継ぐ）
      const absoluteUrl = url.startsWith('http') ? url : self.location.origin + url
      return self.clients.openWindow(absoluteUrl)
    })
  )
})
