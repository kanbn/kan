/// <reference lib="webworker" />
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

const swScope = self as unknown as ServiceWorkerGlobalScope;

const DAY = 24 * 60 * 60;
const MONTH = 30 * DAY;

const onlyGoodResponses = new CacheableResponsePlugin({ statuses: [0, 200] });

const serwist = new Serwist({
  clientsClaim: true,
  navigationPreload: true,

  precacheEntries: [{ url: "/offline.html", revision: "1" }],
  precacheOptions: { cleanupOutdatedCaches: true },

  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },

  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "page-cache",
        networkTimeoutSeconds: 3,
        plugins: [
          onlyGoodResponses,
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: DAY,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },

    {
      matcher: ({ request, url }) =>
        url.pathname.startsWith("/_next/static/") ||
        ["script", "style", "font", "worker"].includes(request.destination),
      handler: new CacheFirst({
        cacheName: "static-resources",
        plugins: [
          onlyGoodResponses,
          new ExpirationPlugin({
            maxEntries: 150,
            maxAgeSeconds: MONTH,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },

    {
      matcher: ({ request }) => request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "image-cache",
        plugins: [
          onlyGoodResponses,
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: MONTH,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

swScope.addEventListener("push", (ev) => {
  let payload: PushPayload = { title: "Notification" };
  try {
    const parsed = ev.data?.json() as PushPayload | undefined;
    if (parsed) payload = parsed;
  } catch {
    const text = ev.data?.text();
    if (text) payload = { title: "Notification", body: text };
  }

  ev.waitUntil(
    swScope.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      data: { url: payload.url ?? "/" },
    }),
  );
});

swScope.addEventListener("notificationclick", (ev) => {
  ev.notification.close();
  const data = (ev.notification.data ?? {}) as { url?: string };
  const targetUrl = new URL(data.url ?? "/", swScope.location.origin).href;

  ev.waitUntil(
    (async () => {
      const allClients = await swScope.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus a tab already on the target URL…
      for (const client of allClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      return swScope.clients.openWindow(targetUrl);
    })(),
  );
});
