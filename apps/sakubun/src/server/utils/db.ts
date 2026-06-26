import type { H3Event } from 'h3'

export function getSakubunDb(event: H3Event): any {
  return (event.context as any).cloudflare?.env?.SAKUBUN_DB ?? null
}

export async function fingerprint(event: H3Event): Promise<string> {
  const ip =
    getHeader(event, 'cf-connecting-ip') ??
    getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() ??
    'local'
  const ua = getHeader(event, 'user-agent') ?? ''
  const raw = `${ip}|${ua}`
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
