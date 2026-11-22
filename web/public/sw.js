function rutaSegura(url) {
  if (typeof url !== 'string' || url.length > 200 || !url.startsWith('/') || url.startsWith('//') || url.includes('\\') || Array.from(url).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return '/'
  return url
}

self.addEventListener('push', (event) => {
  let data
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const options = {
    body: typeof data.body === 'string' ? data.body : '',
    icon: '/assets/icons/moni.png',
    data: { url: rutaSegura(data.url) },
  }
  if (typeof data.tag === 'string' && data.tag) options.tag = data.tag
  event.waitUntil(self.registration.showNotification(typeof data.title === 'string' && data.title ? data.title : 'Moni', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  let destino = new URL(rutaSegura(event.notification.data && event.notification.data.url), self.location.origin)
  if (destino.origin !== self.location.origin) destino = new URL('/', self.location.origin)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const propia = windows.find((w) => new URL(w.url).origin === destino.origin)
      if (propia) {
        const abierta = 'navigate' in propia && destino.pathname + destino.search !== '/' ? propia.navigate(destino.href).catch(() => propia) : propia
        return Promise.resolve(abierta).then((w) => (w || propia).focus())
      }
      return self.clients.openWindow(destino.href)
    }),
  )
})
