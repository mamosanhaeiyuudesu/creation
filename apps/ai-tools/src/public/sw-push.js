/* Web Push ハンドラ（workbox の importScripts から読み込まれる） */
/* eslint-disable no-undef */

const SW_VERSION = 'v7'

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_e) {
    data = { title: 'はげまし', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'はげまし'
  const url = data.url || '/hagemashi'
  const options = {
    body: data.body || '',
    icon: '/apple-touch-icon-hagemashi.png',
    badge: '/apple-touch-icon-hagemashi.png',
    tag: data.tag || 'hagemashi',
    data: { url },
    renotify: true,
  }

  // pushId を「受信時点」で CacheStorage に保存する。
  // iOS PWA は完全終了状態からの通知タップで notificationclick を発火させないため、
  // 通知クリックに依存せず、push 受信時に保存しておくことで確実にページへ引き渡す。
  let pushId = ''
  try { pushId = new URL(url, self.location.origin).searchParams.get('push') || '' } catch (_e) {}

  event.waitUntil((async () => {
    try {
      const cache = await caches.open('hagemashi-pending')
      await cache.put('/__push-log', new Response('push@' + new Date().toISOString() + ' ' + SW_VERSION + ' pushId=' + pushId))
      if (pushId) await cache.put('/__pending-push', new Response(pushId))
    } catch (_e) {}
    // アプリが開いていれば即座にページへ通知（起動中の即時反映）
    try {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const c of clientList) {
        if (c.url.includes('/hagemashi')) c.postMessage({ type: 'hagemashi-push-click', pushId })
      }
    } catch (_e) {}
    await self.registration.showNotification(title, options)
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/hagemashi'

  let pushId = ''
  try { pushId = new URL(url, self.location.origin).searchParams.get('push') || '' } catch (_e) {}

  event.waitUntil((async () => {
    // 診断: notificationclick が発火した場合はここも記録される（iOS では発火しないことがある）
    try {
      const cache = await caches.open('hagemashi-pending')
      await cache.put('/__click-log', new Response('clicked@' + new Date().toISOString() + ' ' + SW_VERSION + ' pushId=' + pushId))
      if (pushId) await cache.put('/__pending-push', new Response(pushId))
    } catch (_e) {}

    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const client = clientList.find((c) => c.url.includes('/hagemashi'))
    if (client) {
      try { client.postMessage({ type: 'hagemashi-push-click', pushId }) } catch (_e) {}
      return client.focus()
    }
    return self.clients.openWindow(self.location.origin + '/hagemashi')
  })())
})
