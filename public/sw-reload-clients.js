let replacesWorker = false

self.addEventListener('install', () => {
  replacesWorker = Boolean(self.registration.active)
})

self.addEventListener('activate', (event) => {
  if (!replacesWorker) return
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) =>
      Promise.all(clients.map((client) => client.navigate(client.url).catch(() => null))),
    ),
  )
})
