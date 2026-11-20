import { describe, expect, it } from "vitest";
import { lexicalText, toSearchRow, MAX_BODY } from "@/lib/search/rows";

const lexical = (...paras: string[]) => ({ root: { type: "root", children: paras.map((t) => ({ type: "paragraph", children: [{ type: "text", text: t }] })) } });

describe("toSearchRow: what each kind of content puts in search (plan 12, task 1)", () => {
  it("a story: its address, section label, summary with byline, and plain text from rich text", () => {
    const row = toSearchRow("posts", { title: "Tems in Milwaukee", slug: "tems-mke", category: "music", source: "wordpress", excerpt: "A night at the Rave.", byline: "Ken Lamb", body: lexical("Tems played", "Beyoncé watched"), publishedAt: "2026-11-01T00:00:00Z" }, null);
    expect(row).toEqual({ kind: "story", title: "Tems in Milwaukee", href: "/music/tems-mke", label: "Music", date: "2026-11-01T00:00:00Z", imageUrl: null, excerpt: "A night at the Rave. · By Ken Lamb", body: "Tems played\nBeyoncé watched", visible: true });
  });
  it("a synced story's text comes from its CDS blocks, tags stripped", () => {
    const row = toSearchRow("posts", { title: "T", slug: "t", category: "culture", source: "cds", cdsBody: [{ kind: "html", html: "<p>Hello <b>world</b> &amp; friends</p>" }, { kind: "image", url: "x" }], cds: { imageUrl: "https://img/x.jpg" }, publishedAt: "2026-11-01" }, null);
    expect(row).toMatchObject({ body: "Hello world & friends", imageUrl: "https://img/x.jpg" });
  });
  it("an NPR copy opens its /npr page and is labelled NPR; a withdrawn story is kept but not visible", () => {
    expect(toSearchRow("posts", { title: "T", slug: "npr-g-s1-1", category: "music", source: "npr", cds: { documentId: "g-s1-1" }, publishedAt: "2026-11-01" }, null)).toMatchObject({ href: "/npr/g-s1-1", label: "NPR", visible: true });
    expect(toSearchRow("posts", { title: "T", slug: "t", category: "music", source: "cds", cds: { withdrawnAt: "2026-11-02" }, publishedAt: "2026-11-01" }, null)).toMatchObject({ visible: false });
  });
  it("shows, hosts and pages: their addresses, descriptions and pictures", () => {
    expect(toSearchRow("shows", { name: "Rhythm Lab", slug: "rhythm-lab", description: "Global beats." }, "/art.jpg")).toMatchObject({ kind: "show", title: "Rhythm Lab", href: "/shows/rhythm-lab", label: "Show", excerpt: "Global beats.", imageUrl: "/art.jpg", visible: true });
    expect(toSearchRow("hosts", { name: "Anthony Foster", slug: "anthony-foster", bio: "Afternoons on HYFIN." }, null)).toMatchObject({ kind: "host", href: "/hosts/anthony-foster", label: "Host", excerpt: "Afternoons on HYFIN." });
    expect(toSearchRow("pages", { title: "The Wiz", slug: "thewiz", body: lexical("A musical.") }, null)).toMatchObject({ kind: "page", href: "/thewiz", body: "A musical." });
  });
  it("an event: venue, city and artists in the summary; hidden or unpublished ones aren't visible", () => {
    const ev = { title: "Tems", slug: "tems-2026-12-01", startsAt: "2026-12-01T02:00:00Z", venue: "The Rave", city: "Milwaukee", artist: "Tems", headliners: "Tems", supports: "Odeal", _status: "published", imageUrl: "https://e/x.jpg" };
    expect(toSearchRow("events", ev, null)).toMatchObject({ kind: "event", href: "/events/tems-2026-12-01", label: "Event", date: "2026-12-01T02:00:00Z", excerpt: "The Rave · Milwaukee · Tems · Odeal", imageUrl: "https://e/x.jpg", visible: true });
    expect(toSearchRow("events", { ...ev, hidden: true }, null)?.visible).toBe(false);
    expect(toSearchRow("events", { ...ev, _status: "draft" }, null)?.visible).toBe(false);
  });
  it("caps very long text", () => {
    const row = toSearchRow("pages", { title: "Long", slug: "long", body: lexical("x".repeat(MAX_BODY + 500)) }, null);
    expect(row?.body.length).toBe(MAX_BODY);
  });
  it("unknown collections and things with no address produce nothing", () => {
    expect(toSearchRow("media", { title: "x" }, null)).toBeNull();
    expect(toSearchRow("posts", { title: "No slug", category: "music", source: "cds" }, null)).toBeNull();
  });
});

describe("lexicalText", () => {
  it("joins paragraphs with newlines and ignores non-text nodes", () => {
    expect(lexicalText(lexical("a", "b"))).toBe("a\nb");
    expect(lexicalText({ root: { children: [{ type: "block", fields: {} }] } })).toBe("");
    expect(lexicalText(null)).toBe("");
  });
});
