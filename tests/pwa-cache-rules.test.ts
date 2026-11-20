import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

/** Runs public/sw-rules.js exactly as the service worker loads it (a classic script that sets self.HYFIN_SW). */
const self: { HYFIN_SW?: { strategyFor: (r: Req) => string; trim: <T>(keys: T[], max: number) => T[] } } = {};
runInNewContext(readFileSync("public/sw-rules.js", "utf8"), { self, URL });
const { strategyFor, trim } = self.HYFIN_SW!;

type Req = { method: string; url: string; origin: string; destination: string; rsc: boolean };
const O = "https://hyfin.org";
const get = (path: string, o: Partial<Req> = {}): string => strategyFor({ method: "GET", url: path.startsWith("http") ? path : O + path, origin: O, destination: "", rsc: false, ...o });

describe("sw-rules: what the service worker may cache (plan 15, task 2)", () => {
  it("never touches the admin, the API, staff tools, server actions or anything that isn't a GET", () => {
    for (const p of ["/admin", "/admin/collections/posts", "/api/cron/cds-sync", "/api/form-submissions", "/staff/add-event", "/sw.js", "/sw-rules.js"]) expect(get(p, { destination: "document" })).toBe("pass");
    expect(get("/newsletter", { method: "POST", destination: "document" })).toBe("pass");
    expect(get("/support", { method: "HEAD" })).toBe("pass");
  });
  it("never caches other sites: the stream, Funraise, Mailchimp, Cloudflare, image hosts", () => {
    for (const u of ["https://wyms.streamguys1.com/hyfin", "https://funraise.org/give/x", "https://us7.api.mailchimp.com/3.0/lists", "https://challenges.cloudflare.com/turnstile/v0/api.js", "https://x.public.blob.vercel-storage.com/a.jpg"]) {
      expect(get(u, { destination: "image" })).toBe("pass");
    }
  });
  it("leaves Next's in-app navigation data (RSC) to the network", () => {
    expect(get("/music?_rsc=abc")).toBe("pass");
    expect(get("/music", { rsc: true })).toBe("pass");
  });
  it("pages: network first, then the cached copy, then the offline screen", () => {
    expect(get("/", { destination: "document" })).toBe("page");
    expect(get("/music/some-story", { destination: "document" })).toBe("page");
  });
  it("hashed build files and fonts: cache first; images and icons: show cached, refresh in the background", () => {
    expect(get("/_next/static/chunks/app-123.js", { destination: "script" })).toBe("static");
    expect(get("/_next/static/media/font.woff2", { destination: "font" })).toBe("static");
    expect(get("/_next/image?url=%2Fx.jpg&w=640&q=75", { destination: "image" })).toBe("image");
    expect(get("/app/icon-192.png", { destination: "image" })).toBe("image");
  });
  it("feeds and crawler files go straight to the network", () => {
    for (const p of ["/feed.xml", "/sitemap.xml", "/robots.txt"]) expect(get(p)).toBe("pass");
  });
});

describe("trim: caches stay bounded", () => {
  it("returns the oldest entries beyond the limit, for deleting", () => {
    expect(trim(["a", "b", "c", "d"], 2)).toEqual(["a", "b"]);
    expect(trim(["a"], 2)).toEqual([]);
  });
});

describe("public/offline.html: the offline screen's own script", () => {
  const html = readFileSync("public/offline.html", "utf8");
  const script = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
  const ctx: { HYFIN_OFFLINE?: { retryTarget: (s: string) => string | null; titleOf: (h: string) => string | null } } = {};
  runInNewContext(script, { self: ctx, URLSearchParams });
  const { retryTarget, titleOf } = ctx.HYFIN_OFFLINE!;

  it("Try again returns to the page that couldn't load", () => {
    expect(retryTarget("?from=%2Fculture")).toBe("/culture");
    expect(retryTarget("?from=%2Fmusic%2Fx%3Fpage%3D2")).toBe("/music/x?page=2");
  });
  it("Try again never leaves the site", () => {
    for (const s of ["?from=https%3A%2F%2Fevil.example", "?from=%2F%2Fevil.example", "?from=%2F%5Cevil.example", "?from=javascript%3Aalert(1)", ""]) expect(retryTarget(s)).toBeNull();
  });
  it("lists saved pages by their title, without the site name", () => {
    expect(titleOf("<head><title>Rock &amp; Roll&#x27;s return · HYFIN</title></head>")).toBe("Rock & Roll's return");
    expect(titleOf("<p>no title</p>")).toBeNull();
  });
});
