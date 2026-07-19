/*
 * Purify service worker. Hand-rolled (no Workbox / Serwist) so we stay
 * inside Next 16's expectations without an extra build-tool integration.
 *
 * Three strategies, by URL shape:
 *   - NetworkFirst   for HTML navigations (so fresh content always wins
 *                    when the network is up; cached HTML is served
 *                    offline).
 *   - StaleWhileRevalidate for /_next/static, fonts, saint icons, and
 *                    /saints/icons/* — fast paint, refreshes silently.
 *   - CacheFirst     for the manifest + icon files (rarely change).
 *
 * No analytics or auth requests are intercepted: anything to /api/*,
 * Supabase, or API.Bible is left to the network unmodified, so credentials
 * never touch the cache.
 *
 * Bump CACHE_VERSION on substantial UI changes to force eviction of the
 * old precache (the install handler doesn't precache, so the bump is
 * really about the runtime caches below — bumping it changes cache names
 * and the activate handler drops the old names).
 */
const CACHE_VERSION = "purify-beta-2.3.0";
const HTML_CACHE = `${CACHE_VERSION}-html`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const ASSETS_CACHE = `${CACHE_VERSION}-assets`;

const ALL_CACHES = [HTML_CACHE, STATIC_CACHE, ASSETS_CACHE];

// Routes never to cache — credentials and live API traffic must always
// hit the network so revocations, license usage tracking, and Supabase
// sessions stay honest.
const NEVER_CACHE = [
  "/api/",
  "/auth/",
  "/_next/data/",
  ".supabase.co",
  "api.scripture.api.bible",
];

// Exceptions to NEVER_CACHE — endpoints that ARE safe to cache because
// they return public, deterministic content (no auth, no PII).
const ALWAYS_CACHE_API = [
  "/api/prayer/rule/", // localized rule JSON for morning / evening
];

self.addEventListener("install", (event) => {
  // No precache — we'd rather first-visit work feel snappy than block on
  // a static manifest list. Runtime strategies below populate caches as
  // pages are visited.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function shouldBypass(url) {
  if (ALWAYS_CACHE_API.some((pat) => url.pathname.startsWith(pat))) return false;
  return NEVER_CACHE.some((pat) => url.href.includes(pat));
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Last-ditch offline fallback: return the cached Today surface if
    // we have one (the route most users will return to).
    const today = await cache.match("/prayers/today");
    if (today) return today;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Don't intercept CDNs.
  if (shouldBypass(url)) return;

  // Audio is served with HTTP Range requests (206 Partial Content). The Cache
  // API rejects partial responses, so let the browser handle media natively
  // rather than routing it through a runtime cache.
  if (url.pathname.startsWith("/audio/")) return;

  // HTML navigations.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, HTML_CACHE));
    return;
  }

  // Static build output + fonts.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Saint icons and small app icons.
  if (
    url.pathname.startsWith("/saints/icons/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // Everything else: try cache, fall back to network silently.
  event.respondWith(staleWhileRevalidate(request, ASSETS_CACHE));
});

// Web Push handler — opt-in prayer reminders. Payload is a small JSON
// object: { title, body, url }. The notification opens `url` on click.
self.addEventListener("push", (event) => {
  let payload = { title: "Prayer reminder", body: "", url: "/prayers" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore malformed payloads */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.kind || "prayer",
      data: { url: payload.url },
      requireInteraction: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/prayers";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.endsWith(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
