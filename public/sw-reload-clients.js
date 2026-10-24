let replacesWorker = false

self.addEventListener('install', () => {
  replacesWorker = Boolean(self.registration.active)
})

self.addEventListener('activate', (event) => {
  if (!replacesWorker) return
  event.waitUntil(
    self.clients.claim()
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        for (const client of clients) client.navigate(client.url).catch(() => null)
      }),
  )
})
