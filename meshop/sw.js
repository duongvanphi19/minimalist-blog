// sw.js (Tạo file riêng sw.js trong root folder)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('invoice-v3').then((cache) => {
            return cache.addAll([
                '/',
                '/styles.css',
                '/script.js',
                '/assets/uploads/transparent.png',
                // Thêm các assets khác như flower images, fonts nếu host locally
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});