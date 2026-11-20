/*
 * HYFIN service worker rules (plan 15, task 2): which strategy each request gets. A classic script so the worker can
 * importScripts() it and tests/pwa-cache-rules.test.ts can run the exact same code.
 *   "pass"   the worker stays out of it (the network decides, nothing cached)
 *   "page"   network first (3 s), then the cached copy, then /offline
 *   "static" cache first (hashed build files and fonts never change)
 *   "image"  serve the cached copy, refresh it in the background
 */
(function (root) {
  // Never cached: the CMS, server routes, staff tools, the worker itself, feeds and crawler files.
  var NEVER = /^\/(admin|api|staff)(\/|$)|^\/(sw|sw-rules)\.js$|^\/(feed\.xml|sitemap\.xml|robots\.txt)$/;

  function strategyFor(req) {
    if (req.method !== "GET") return "pass";
    var url = new URL(req.url);
    // Other sites (the stream, Funraise, Mailchimp, Cloudflare, image hosts) are never cached.
    if (url.origin !== req.origin) return "pass";
    if (NEVER.test(url.pathname)) return "pass";
    // Next's in-app navigation data: left to the network so it never mixes with cached pages.
    if (req.rsc || url.searchParams.has("_rsc")) return "pass";
    if (req.destination === "document") return "page";
    if (url.pathname.indexOf("/_next/static/") === 0) return "static";
    if (url.pathname.indexOf("/_next/image") === 0 || req.destination === "image" || /^\/app\//.test(url.pathname)) return "image";
    return "pass";
  }

  /** The oldest keys beyond `max`, to delete (Cache API keys come back oldest first). */
  function trim(keys, max) {
    return keys.length > max ? keys.slice(0, keys.length - max) : [];
  }

  root.HYFIN_SW = { strategyFor: strategyFor, trim: trim };
})(self);
