// Service Worker for 4Front Trackity-doo PWA
const CACHE_NAME = "trackity-doo-v1.0.0";
const STATIC_CACHE_NAME = "trackity-doo-static-v1.0.0";

// Files to cache for offline functionality
const STATIC_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install event - cache static files
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installing...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("📦 Caching static files");
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log("✅ Service Worker installed successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ Service Worker installation failed:", error);
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log("🗑️ Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("✅ Service Worker activated");
        return self.clients.claim();
      }),
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle navigation requests
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches
        .match("/index.html")
        .then((response) => {
          return response || fetch(event.request);
        })
        .catch(() => {
          return caches.match("/index.html");
        }),
    );
    return;
  }

  // Handle other requests with cache-first strategy for static files
  if (STATIC_FILES.some((file) => event.request.url.includes(file))) {
    event.respondWith(
      caches
        .match(event.request)
        .then((response) => {
          return (
            response ||
            fetch(event.request).then((fetchResponse) => {
              // Cache the new response
              if (fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                caches.open(STATIC_CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return fetchResponse;
            })
          );
        })
        .catch(() => {
          // Fallback for offline
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }
        }),
    );
  } else {
    // Network-first strategy for dynamic content
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(event.request);
        }),
    );
  }
});

// Handle background sync (future feature)
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("🔄 Background sync triggered");
    // Could implement offline data sync here
  }
});

// Handle push notifications (future feature)
self.addEventListener("push", (event) => {
  console.log("📱 Push notification received");

  const options = {
    body: event.data ? event.data.text() : "Time tracking reminder",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "2",
    },
    actions: [
      {
        action: "log-time",
        title: "Log Time",
        icon: "/icon-192.png",
      },
      {
        action: "view-reports",
        title: "View Reports",
        icon: "/icon-192.png",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("4Front Trackity-doo", options),
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification clicked:", event.action);

  event.notification.close();

  event.waitUntil(
    clients.openWindow("/?utm_source=notification&action=" + event.action),
  );
});
