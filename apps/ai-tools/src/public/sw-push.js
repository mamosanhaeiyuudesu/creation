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
  const absoluteUrl = url.startsWith('http') ? url : self.location.origin + url
  // openWindow に任せる：PWA スコープ内なら既存ウィンドウへナビゲートされる
  event.waitUntil(self.clients.openWindow(absoluteUrl))
})
