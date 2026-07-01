// クライアントが PushManager.subscribe() に渡す VAPID 公開鍵を返す
export default defineEventHandler((event) => {
  const { vapidPublicKey } = useRuntimeConfig(event)
  if (!vapidPublicKey) {
    throw createError({ statusCode: 503, message: 'プッシュ通知は未設定です' })
  }
  return { publicKey: vapidPublicKey as string }
})
