// お客様の声（匿名）をメールで受け取る。誰が送ったかが分かる情報（IP・UA・ログイン情報）は一切付けない。
// 送信は Resend。NUXT_RESEND_API_KEY（secret）が無いときは 503 を返す。
const TO = 'mamosanhaeiyuudesu@gmail.com'
const SERVICE_NAME = '宮古議事録'
const MAX = 2000

export default defineEventHandler(async (event) => {
  const body = await readBody<{ message?: unknown; page?: unknown; website?: unknown }>(event)
  // ボット避けの隠し欄が埋まっていたら、成功したふりをして捨てる
  if (typeof body?.website === 'string' && body.website) return { ok: true }

  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, MAX) : ''
  if (!message) throw createError({ statusCode: 400, message: 'ご意見を入力してください' })
  const page = typeof body?.page === 'string' ? body.page.slice(0, 200) : ''

  const key = useRuntimeConfig(event).resendApiKey as string
  if (!key) throw createError({ statusCode: 503, message: '現在ご意見を受け付けられません' })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${SERVICE_NAME} お客様の声 <onboarding@resend.dev>`,
      to: [TO],
      subject: `【${SERVICE_NAME}】お客様の声`,
      text: `${message}\n\n――\nサービス: ${SERVICE_NAME}\nページ: ${page}\n（匿名で送信されました）`,
    }),
  })
  if (!res.ok) {
    console.error('feedback send failed', res.status, await res.text().catch(() => ''))
    throw createError({ statusCode: 502, message: '送信できませんでした。時間をおいてもう一度お試しください' })
  }
  return { ok: true }
})
