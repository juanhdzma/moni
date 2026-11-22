self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Moni', {
      body: data.body || '',
      icon: '/assets/icons/moni.png',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windows) => (windows.length ? windows[0].focus() : self.clients.openWindow('/'))),
  )
})
