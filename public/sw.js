/*
 * HYFIN service worker (plan 15, task 2; decision 018). Hand-written, per the Next.js PWA guide; the routing rules
 * live in sw-rules.js and are unit-tested.
 *
 * Kill switch: if a release ever misbehaves, replace this file's contents with
 *   self.addEventListener("install", () => self.skipWaiting());
 *   self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).then(() => self.registration.unregister())));
 * and deploy: every visitor's worker removes itself and its caches on their next visit.
 */
importScripts("/sw-rules.js");

var VERSION = "v1"; // bump to replace every visitor's caches (and show the "New version" toast)
var PAGES = "hyfin-pages-" + VERSION;
var STATIC = "hyfin-static-" + VERSION;
var IMAGES = "hyfin-images-" + VERSION;
var KEEP = [PAGES, STATIC, IMAGES];
var OFFLINE = "/offline.html"; // self-contained: no Next code to load (see the file)
var LIMITS = { pages: 50, images: 200 };
var PAGE_TIMEOUT_MS = 3000;

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(PAGES).then(function (c) {
      return c.add(OFFLINE);
    }).then(function () {
      return caches.open(IMAGES).then(function (c) {
        return c.addAll(["/app/icon-192.png", "/app/icon-512.png"]);
      });
    }),
  );
  // No skipWaiting here: a new version waits until the visitor taps "Refresh" (never mid-song).
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("hyfin-") === 0 && KEEP.indexOf(k) === -1; }).map(function (k) { return caches.delete(k); }));
    }).then(function () {
      return self.clients.claim();
    }),
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function trimCache(name, max) {
  return caches.open(name).then(function (c) {
    return c.keys().then(function (keys) {
      return Promise.all(self.HYFIN_SW.trim(keys, max).map(function (k) { return c.delete(k); }));
    });
  });
}

function store(name, request, response, max) {
  if (!response || !response.ok || response.type === "opaque") return Promise.resolve();
  var copy = response.clone();
  return caches.open(name).then(function (c) {
    return c.put(request, copy);
  }).then(function () {
    return max ? trimCache(name, max) : undefined;
  });
}

/** Registers a save with the event up front (browsers refuse a late waitUntil); resolve it when the save is done. */
function keepAlive(event) {
  var done;
  event.waitUntil(new Promise(function (resolve) { done = resolve; }));
  return function (p) { done(Promise.resolve(p).catch(function () {})); };
}

/** Network first with a 3 s head start; then the cached copy; then the offline screen. */
function page(event) {
  var request = event.request;
  var saved = keepAlive(event);
  var network = fetch(request).then(
    function (res) { saved(store(PAGES, request, res, LIMITS.pages)); return res; },
    function (err) { saved(); throw err; },
  );
  network.catch(function () {}); // a late failure after a cached copy was served is expected, not an error
  var cached = function () { return caches.match(request, { cacheName: PAGES }); };
  var timeout = new Promise(function (resolve) { setTimeout(resolve, PAGE_TIMEOUT_MS); });
  return Promise.race([network, timeout.then(cached)])
    .then(function (res) { return res || network; })
    .catch(function () {
      return cached().then(function (res) {
        if (res) return res;
        var url = new URL(request.url);
        if (url.pathname === OFFLINE) return caches.match(OFFLINE, { cacheName: PAGES, ignoreSearch: true });
        // Redirect, so the address bar shows the offline screen and Try again knows where to go back to.
        return Response.redirect(new URL(OFFLINE + "?from=" + encodeURIComponent(url.pathname + url.search), self.location.origin).href, 302);
      });
    })
    .then(function (res) {
      return res || new Response("You're offline.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
    });
}

function cacheFirst(event, name) {
  var saved = keepAlive(event);
  return caches.match(event.request, { cacheName: name }).then(function (hit) {
    if (hit) { saved(); return hit; }
    return fetch(event.request).then(
      function (res) { saved(store(name, event.request, res)); return res; },
      function (err) { saved(); throw err; },
    );
  });
}

function staleWhileRevalidate(event, name, max) {
  var saved = keepAlive(event);
  var refresh = fetch(event.request).then(
    function (res) { saved(store(name, event.request, res, max)); return res; },
    function (err) { saved(); throw err; },
  );
  refresh.catch(function () {});
  return caches.match(event.request, { cacheName: name }).then(function (hit) { return hit || refresh; });
}

self.addEventListener("fetch", function (event) {
  var r = event.request;
  var kind = self.HYFIN_SW.strategyFor({
    method: r.method,
    url: r.url,
    origin: self.location.origin,
    destination: r.destination,
    rsc: r.headers.get("RSC") === "1",
  });
  if (kind === "page") event.respondWith(page(event));
  else if (kind === "static") event.respondWith(cacheFirst(event, STATIC));
  else if (kind === "image") event.respondWith(staleWhileRevalidate(event, IMAGES, LIMITS.images));
  // "pass": no respondWith, so the browser handles it as if there were no worker.
});
