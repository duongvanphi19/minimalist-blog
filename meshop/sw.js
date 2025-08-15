const CACHE_NAME = "invoice-app-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/styles.css",
    "/script.js",
    "/icon-192.png",
    "/icon-512.png",
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});

self.addEventListener("activate", (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) =>
                    cacheWhitelist.includes(cacheName) ? null : caches.delete(cacheName)
                )
            )
        )
    );
});

self.addEventListener("push", (event) => {
    const data = event.data?.json() || {};
    const title = data.title || "Invoice App";
    const options = {
        body: data.body || "Thông báo từ ứng dụng",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
    };
    event.waitUntil(self.registration.showNotification(title, options));
});