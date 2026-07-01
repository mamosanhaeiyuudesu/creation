import { ref, computed } from 'vue'

export interface PushPrefs {
  enabled: boolean
  hour: number
  minute: number
  timezone: string
  minIntervalDays: number
  nudgeAfterSilentDays: number
}

const DEFAULT_PREFS: PushPrefs = {
  enabled: false,
  hour: 20,
  minute: 0,
  timezone: 'Asia/Tokyo',
  minIntervalDays: 1,
  nudgeAfterSilentDays: 3,
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function usePushNotifications() {
  const supported = ref(false)
  const permission = ref<NotificationPermission>('default')
  const subscribed = ref(false)
  const busy = ref(false)
  const error = ref('')
  const prefs = ref<PushPrefs>({ ...DEFAULT_PREFS })

  // iOS では「ホーム画面に追加した PWA」でのみ通知が使える
  const isStandalone = computed(
    () =>
      import.meta.client &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true)
  )
  const isIos = computed(
    () => import.meta.client && /iphone|ipad|ipod/i.test(navigator.userAgent)
  )
  // iOS Safari（非スタンドアロン）ではホーム画面追加を促す
  const needsInstall = computed(() => isIos.value && !isStandalone.value)

  async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null
    return navigator.serviceWorker.ready
  }

  async function init() {
    if (!import.meta.client) return
    supported.value =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported.value) return

    permission.value = Notification.permission
    try {
      prefs.value = await $fetch<PushPrefs>('/api/hagemashi/push/prefs')
    } catch {
      prefs.value = { ...DEFAULT_PREFS }
    }
    const reg = await getRegistration().catch(() => null)
    const sub = await reg?.pushManager.getSubscription().catch(() => null)
    subscribed.value = !!sub
  }

  async function enable() {
    error.value = ''
    if (!supported.value) {
      error.value = 'この端末は通知に対応していません'
      return false
    }
    busy.value = true
    try {
      const perm = await Notification.requestPermission()
      permission.value = perm
      if (perm !== 'granted') {
        error.value = '通知が許可されませんでした'
        return false
      }

      const { publicKey } = await $fetch<{ publicKey: string }>('/api/hagemashi/push/vapid-key')
      const reg = await getRegistration()
      if (!reg) {
        error.value = 'Service Worker が利用できません'
        return false
      }

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      const json = sub.toJSON()
      await $fetch('/api/hagemashi/push/subscribe', {
        method: 'POST',
        body: { endpoint: json.endpoint, keys: json.keys },
      })

      // タイムゾーンは端末のものを採用
      prefs.value.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo'
      prefs.value.enabled = true
      await savePrefs()
      subscribed.value = true
      return true
    } catch (e: any) {
      error.value = e?.message || '通知の有効化に失敗しました'
      return false
    } finally {
      busy.value = false
    }
  }

  async function disable() {
    busy.value = true
    error.value = ''
    try {
      const reg = await getRegistration().catch(() => null)
      const sub = await reg?.pushManager.getSubscription().catch(() => null)
      if (sub) {
        await $fetch('/api/hagemashi/push/subscribe', {
          method: 'DELETE',
          body: { endpoint: sub.endpoint },
        }).catch(() => {})
        await sub.unsubscribe().catch(() => {})
      }
      prefs.value.enabled = false
      await savePrefs()
      subscribed.value = false
    } finally {
      busy.value = false
    }
  }

  async function savePrefs() {
    await $fetch('/api/hagemashi/push/prefs', { method: 'PUT', body: prefs.value })
  }

  return {
    supported,
    permission,
    subscribed,
    busy,
    error,
    prefs,
    isStandalone,
    isIos,
    needsInstall,
    init,
    enable,
    disable,
    savePrefs,
  }
}
