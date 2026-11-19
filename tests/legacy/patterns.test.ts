import { describe, expect, it } from "vitest";
import { patternTarget } from "@/lib/legacy/patterns";

/** A fake Payload with a few rows; `find` understands the handful of where shapes the rules use. */
const DATA: Record<string, Array<Record<string, unknown>>> = {
  posts: [
    { slug: "the-original-rainbow-coalition", category: "culture", title: "x", legacy: { wpSlug: "the-original-rainbow-coalition-2" } },
    { slug: "womack-sisters-chauffeur-interview", category: "music", title: "Ladies First: The Womack Sisters", legacy: {} },
    { slug: "szas-lyrics", category: "music", title: "SZA", legacy: { wpSlug: "szas-lyrics" } },
  ],
  tags: [{ slug: "interviews" }, { slug: "new-releases" }],
  hosts: [{ slug: "element-everest-blanks" }, { slug: "anthony-foster" }, { slug: "megan-mathews" }],
  shows: [{ slug: "ladies-first" }, { slug: "rhythm-lab-radio" }],
  media: [
    { sourceUrl: "https://hyfin.org/wp-content/uploads/2024/04/a.jpg", url: "https://x.public.blob.vercel-storage.com/a.jpg" },
    { sourceUrl: "https://hyfin.org/wp-content/uploads/2024/04/IMG_9206.jpg", url: "https://x.public.blob.vercel-storage.com/IMG_9206.jpg" },
  ],
};
const get = (row: Record<string, unknown>, path: string) => path.split(".").reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], row);
const match = (row: Record<string, unknown>, where: Record<string, unknown>): boolean =>
  Object.entries(where).every(([k, c]) => {
    if (k === "or") return (c as Record<string, unknown>[]).some((w) => match(row, w));
    if (k === "and") return (c as Record<string, unknown>[]).every((w) => match(row, w));
    const cond = c as { equals?: unknown; like?: string };
    const v = get(row, k);
    if ("equals" in cond) return v === cond.equals;
    if ("like" in cond) return cond.like!.toLowerCase().split(/\s+/).every((w) => String(v ?? "").toLowerCase().includes(w));
    return true;
  });
const db = { find: async ({ collection, where }: { collection: string; where: Record<string, unknown> }) => ({ docs: (DATA[collection] ?? []).filter((r) => match(r, where ?? {})) }) };
const go = (path: string) => patternTarget(path, db as never);

describe("pattern rules", () => {
  it.each([
    ["/category/news/music/verified", "/music"],
    ["/category/music", "/music"],
    ["/category/news/milwaukee", "/milwaukee"],
    ["/category/interviews/yesterday-today-tomorrow", "/tag/interviews"],
    ["/category/news/new-releases", "/tag/new-releases"],
    ["/category/podcasts/ladies-first", "/shows/ladies-first"],
    ["/category/news/music/page/3", "/music"],
    ["/category/gift-guide", "/"],
    ["/tag/interviews", "/tag/interviews"],
    ["/tag/epigenetics", "/"],
    ["/author/elementradiomilwaukee-org", "/hosts/element-everest-blanks"],
    ["/author/anthonyradiomilwaukee-org", "/hosts/anthony-foster"],
    ["/author/rainanewsgmail-com", "/"],
    ["/events/blackity-black-holiday-market", "/events"],
    ["/event/hyfin-ecommerce-summit", "/events"],
    ["/venue/grace-center", "/events"],
    ["/organizer/dandy", "/events"],
    ["/hyfin-event/rb-live-milwaukee", "/events"],
    ["/podcast/the-original-rainbow-coalition-2", "/culture/the-original-rainbow-coalition"],
    ["/podcast/never-imported", "/shows"],
    ["/members/element-everest-blanks", "/hosts/element-everest-blanks"],
    ["/members/megan-matthews", "/hosts/megan-mathews"],
    ["/members/kim-shine-2", "/listen/schedule"],
    ["/radiochannel/hyfin", "/listen/playlist"],
    ["/shows/rhythm-lab", "/shows/rhythm-lab-radio"],
    ["/shows/weekends-with-megan-mathews", "/hosts/megan-mathews"],
    ["/shows/jazz-night-in-america", "/shows"],
    ["/2025/01/17", "/"],
    ["/2024/10", "/"],
    ["/page/2", "/"],
    ["/feed", "/feed.xml"],
    ["/category/music/feed", "/feed.xml"],
    ["/wp-content/uploads/2024/04/a.jpg", "https://x.public.blob.vercel-storage.com/a.jpg"],
    ["/wp-content/uploads/2024/04/missing.jpg", null],
    ["/wp-content/uploads/2024/04/IMG_9206.jpg", "https://x.public.blob.vercel-storage.com/IMG_9206.jpg"],
    ["/Tag/Interviews", "/tag/interviews"],
    ["/2026/08/21/ladies-first-the-womack-sisters", "/music/womack-sisters-chauffeur-interview"],
    ["/2025/04/25/deleted-on-hyfin-org", "/"],
    ["/szas-lyrics", "/music/szas-lyrics"],
    ["/chart/hyfins-fresh-finds", "/listen/playlist"],
    ["/chartcategory/verified", "/listen/playlist"],
    ["/charts-elementor", "/listen/playlist"],
    ["/playlist", "/listen/playlist"],
    ["/podcastfilter/rhythm-lab-radio", "/shows/rhythm-lab-radio"],
    ["/podcastfilter/hyfinated-conversations", "/shows"],
    ["/podcastfilter/hyfin-verified/page/4", "/shows"],
    ["/hyfin-events/list/page/2", "/events"],
    ["/event-location/insomniac-studios", "/events"],
    ["/mec-fes-builder/submit-event", "/events"],
    ["/event-directory", "/events"],
    ["/qtvideo/poison-lips", "/"],
    ["/product/hyfin-hoodie", "/"],
    ["/cart", "/"],
    ["/checkout", "/"],
    ["/wpautoterms/terms-and-conditions", "https://radiomilwaukee.org/privacy-policy"],
    ["/privacy-policy-2", "https://radiomilwaukee.org/privacy-policy"],
    ["/blog-horizontal", "/"],
    ["/blog-grid/page/2", "/"],
    ["/home-page-6", "/"],
    ["/hyfin-home-page-24", "/"],
    ["/hyfin-landing-page-02", "/"],
    ["/test-page-w-sidebar", "/"],
    ["/sample-page", "/"],
    ["/ladiesfirst", "/shows/ladies-first"],
    ["/holidaymarket", "/blackity-black-holiday-market"],
    ["/thewiz2", "/thewiz"],
    ["/wiz-old", "/thewiz"],
    ["/eventtype/community", "/events"],
    ["/event-type/concert", "/events"],
    ["/place/turner-hall-ballroom", "/events"],
    ["/new-hyfin-event-calendar", "/events"],
    ["/podcasts/x", "/shows"],
    ["/podcast-archive", "/shows"],
    ["/schedule/friday-2", "/listen/schedule"],
    ["/schedulefilter/testfilter", "/listen/schedule"],
    ["/filter/afrobeats", "/listen/playlist"],
    ["/support/ways-to-give", "https://radiomilwaukee.org/donate"],
    ["/2024/04/07/szas-lyrics/amp", "/music/szas-lyrics"],
    ["/mec_esb/hyfin-default", "/"],
    ["/jet-popup/anti-gala", "/"],
    ["/videos-archive", "/"],
    ["/blackbusiness", "/hyfin-100"],
    ["/blackityblack", "/blackity-black-holiday-market"],
    ["/thewiz", null],
    ["/music/no-such-story", null],
  ])("%s → %s", async (path, target) => expect(await go(path)).toBe(target));
});
