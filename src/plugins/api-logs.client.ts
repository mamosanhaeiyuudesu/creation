export default defineNuxtPlugin(() => {
  const patched = $fetch.create({
    onResponse({ response }) {
      const raw = response.headers.get('x-api-logs')
      if (!raw) return
      try {
        const logs: string[] = JSON.parse(decodeURIComponent(raw))
        logs.forEach((msg) => console.log(msg))
      } catch {}
    },
  })
  ;(globalThis as any).$fetch = patched
})
