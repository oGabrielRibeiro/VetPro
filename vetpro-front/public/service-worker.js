const SW_VERSION = "v3";
const STATIC_CACHE = `vetpro-static-${SW_VERSION}`;
const RUNTIME_CACHE = `vetpro-runtime-${SW_VERSION}`;

const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("vetpro-"))
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|webp|avif)$/i.test(
    pathname,
  );
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match("/index.html");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkFetch.catch(() => {});
    return cached;
  }

  const response = await networkFetch;
  if (response) return response;
  return caches.match("/index.html");
}

async function networkOnlyApi(request) {
  try {
    return await fetch(request);
  } catch (_) {
    return new Response(
      JSON.stringify({
        error: "offline",
        message:
          "Sem conexao com o servidor. A acao sera retomada quando houver internet.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !isApiRequest(url)) return;

  if (isApiRequest(url)) {
    event.respondWith(networkOnlyApi(request));
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(networkFirstNavigation(request));
});

self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
