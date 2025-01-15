/* eslint-disable no-restricted-globals */
const BUILD_VERSION = ""

importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.3.0/workbox-sw.js")
// const env = loadEnv(mode, process.cwd(), "")
if (workbox && BUILD_VERSION) {
    console.log(`Yay! Workbox is loaded 🎉`)

    const CACHE_NAME = `app_space_${BUILD_VERSION}`
    // Set up App Shell-style routing, so that all navigation requests
    // are fulfilled with your index.html shell. Learn more at
    // https://developers.google.com/web/fundamentals/architecture/app-shell
    const fileExtensionRegexp = /\/[^/?]+\.[^/]+$/
    workbox.routing.registerRoute(
        // Return false to exempt requests from being fulfilled by index.html.
        ({ request, url }) => {
            // If this isn't a navigation, skip.
            if (request.mode !== "navigate") {
                return false
            }
            // If this is a URL that starts with /_, skip.
            if (url.pathname.startsWith("/_")) {
                return false
            }
            // If this looks like a URL for a resource, because it contains
            // a file extension, skip.
            return !url.pathname.match(fileExtensionRegexp)
        },
        new workbox.strategies.NetworkFirst({ cacheName: CACHE_NAME })
    )

    workbox.routing.registerRoute(
        ({ url }) => url.pathname.match(/\.(js|ttf|json)$/),
        new workbox.strategies.StaleWhileRevalidate({
            cacheName: CACHE_NAME,
            plugins: [
                // Ensure that once this runtime cache reaches a maximum size the
                // least-recently used images are removed.
                new workbox.expiration.ExpirationPlugin({ maxEntries: 50 }),
            ],
        })
    )

    // Customize this with a different URL if needed.
    // const OFFLINE_URL = "/offline.html"

    self.__WB_DISABLE_DEV_LOGS = true

    self.addEventListener("install", (event) => {
        // event.waitUntil(
        //     (async () => {
        //         const cache = await caches.open(CACHE_NAME)

        //         await Promise.all(
        //             [OFFLINE_URL].map((path) => {
        //                 return cache.add(new Request(path))
        //             })
        //         )
        //     })()
        // )
        // Force the waiting service worker to become the active service worker.
        self.skipWaiting()
    })

    self.addEventListener("activate", async (event) => {
        // Tell the active service worker to take control of the page immediately.
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Delete any outdated caches
                            return name !== CACHE_NAME
                        })
                        .map((name) => {
                            return caches.delete(name)
                        })
                )
            })
        )

        // Claim clients immediately so the new service worker takes over
        self.clients.claim()
    })

    self.addEventListener("fetch", (event) => {
        if (event.request.mode === "navigate") {
            event.respondWith(
                (async () => {
                    try {
                        // First, try to use the navigation preload response if it's
                        // supported.
                        const preloadResponse = await event.preloadResponse
                        if (preloadResponse) {
                            return preloadResponse
                        }

                        // Always try the network first.
                        const networkResponse = await fetch(event.request)
                        return networkResponse
                    } catch (error) {
                        const cache = await caches.open(CACHE_NAME)
                        const cachedResponse = await cache.match(OFFLINE_URL)
                        return cachedResponse
                    }
                })()
            )
        }
    })

    workbox.routing.registerRoute(
        ({ request }) => request.destination === "style",
        new workbox.strategies.StaleWhileRevalidate({
            cacheName: CACHE_NAME,
            plugins: [
                // Ensure that only requests that result in a 200 status are cached
                new workbox.cacheableResponse.CacheableResponse({
                    statuses: [200],
                }),
            ],
        })
    )

    // Images are handled with a Cache First strategy
    workbox.routing.registerRoute(
        ({ url }) =>
            url.origin === self.location.origin &&
            (url.pathname.endsWith(".png") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".jpeg")),
        new workbox.strategies.CacheFirst({
            cacheName: CACHE_NAME,
            plugins: [
                // Ensure that only requests that result in a 200 status are cached
                new workbox.cacheableResponse.CacheableResponse({
                    statuses: [200],
                }),
                // Don't cache more than 50 items, and expire them after 30 days
                new workbox.expiration.CacheExpiration("images", {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
                }),
            ],
        })
    )
} else {
    console.log(`Boo! Workbox didn't load 😬`)
}

// Any other custom service worker logic can go here.
