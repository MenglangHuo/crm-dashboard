// Self-unregistering service worker to clean up stale/legacy registrations on this origin
self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		self.registration.unregister().then(() => {
			return self.clients.matchAll();
		}),
	);
});
