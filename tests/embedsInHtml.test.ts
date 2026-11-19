import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractEmbeds, insertEmbedBlocks, MARKER } from "@/lib/wordpress/embedsInHtml";
import { prepareBodyHtml } from "@/lib/wordpress/transform";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/wp-embeds/${name}.html`, import.meta.url), "utf8");
const kinds = (html: string) => extractEmbeds(html).embeds.map((e) => (e.kind === "audio" ? "audio" : e.embed.provider));

describe("extractEmbeds on real hyfin.org posts", () => {
  it("finds every player, in order", () => {
    expect(kinds(fixture("438884-youtube-spreaker"))).toEqual(["spreaker", "youtube"]);
    expect(kinds(fixture("438379-bandcamp"))).toEqual(["odesli", "bandcamp", "bandcamp", "odesli", "odesli", "bandcamp", "odesli"]);
    expect(kinds(fixture("438891-npr"))).toEqual(["npr"]);
    expect(kinds(fixture("441423-prx"))).toEqual(["prx"]);
    expect(kinds(fixture("73009-spotify"))).toEqual(["spreaker", "spotify"]);
    expect(kinds(fixture("72761-audio"))).toEqual(["audio"]);
  });

  it("turns social posts into permalinks and drops their scripts", () => {
    const ig = extractEmbeds(fixture("73002-instagram"));
    expect(kinds(fixture("73002-instagram"))).toEqual(["instagram", "spotify"]);
    expect(ig.embeds[0]).toMatchObject({ kind: "embed", embed: { provider: "instagram", url: "https://www.instagram.com/p/CxOJNsNRzub/" } });
    expect(ig.html).not.toContain("<script");
    expect(ig.html).not.toContain("instagram-media");
    const tw = extractEmbeds(fixture("71908-twitter"));
    expect(kinds(fixture("71908-twitter"))).toEqual(["twitter", "twitter"]);
    expect(tw.html).not.toContain("<script");
    expect(kinds(fixture("27571-tiktok"))).toEqual(["tiktok"]);
  });

  it("leaves a marker paragraph where each embed was, and no iframes", () => {
    const r = extractEmbeds(fixture("438884-youtube-spreaker"));
    expect(r.html).toContain(`<p>${MARKER}0</p>`);
    expect(r.html).toContain(`<p>${MARKER}1</p>`);
    expect(r.html).not.toContain("<iframe");
    expect(r.html).not.toContain("wp-block-embed");
  });

  it("keeps the audio block's MP3 URL", () => {
    const [a] = extractEmbeds(fixture("72761-audio")).embeds;
    expect(a).toMatchObject({ kind: "audio", url: expect.stringContaining("megaphone.fm") });
  });

  it("keeps surrounding text when an embed sits inside a paragraph (Review Focus 1)", () => {
    const r = extractEmbeds('<p>Text before <iframe src="https://youtu.be/dp45V_M4Akw"></iframe> after</p>');
    expect(r.html).toBe(`<p>Text before  after</p><p>${MARKER}0</p>`);
  });

  it("turns an off-allowlist iframe into a link paragraph", () => {
    const r = extractEmbeds('<iframe src="https://evil.example.com/x"></iframe>');
    expect(r.embeds).toEqual([]);
    expect(r.html).toContain('<a href="https://evil.example.com/x">');
  });
});

describe("prepareBodyHtml clean-up", () => {
  it("strips [irp] related-post shortcodes", () => {
    expect(prepareBodyHtml(fixture("72216-irp"), new Map())).not.toMatch(/\[irp/);
  });
  it("unwraps galleries into separate images", () => {
    const out = prepareBodyHtml(fixture("73020-gallery"), new Map());
    expect(out).not.toContain("wp-block-gallery");
  });
  it("drops scripts and styles", () => {
    expect(prepareBodyHtml("<p>a</p><script>x()</script><style>p{}</style><noscript>n</noscript>", new Map())).toBe("<p>a</p>");
  });
});

describe("insertEmbedBlocks", () => {
  const para = (text: string) => ({ type: "paragraph", children: [{ type: "text", text }] });
  type N = { type?: string; text?: string; children?: N[] };
  const state = (children: N[]) => ({ root: { type: "root", children } });

  it("swaps each marker paragraph for a Payload block node", () => {
    const embeds = [{ kind: "embed" as const, embed: { provider: "youtube" as const, url: "https://www.youtube-nocookie.com/embed/dp45V_M4Akw", title: null } }];
    const out = insertEmbedBlocks(state([para("hi"), para(`${MARKER}0`)]), embeds);
    expect(out.root.children[0]).toEqual(para("hi"));
    expect(out.root.children[1]).toMatchObject({ type: "block", version: 2, format: "", fields: { blockName: "", blockType: "embed", url: "https://www.youtube-nocookie.com/embed/dp45V_M4Akw", provider: "youtube" } });
    expect((out.root.children[1] as { fields: { id: string } }).fields.id).toMatch(/^[0-9a-f]{24}$/);
  });

  it("makes audio blocks too", () => {
    const out = insertEmbedBlocks(state([para(`${MARKER}0`)]), [{ kind: "audio", url: "https://x/a.mp3", title: "Ep" }]);
    expect(out.root.children[0]).toMatchObject({ type: "block", fields: { blockType: "audio", url: "https://x/a.mp3", title: "Ep" } });
  });

  it("handles a body that is only an embed (Review Focus 3), without mutating its input", () => {
    const input = state([para(`${MARKER}0`)]);
    const out = insertEmbedBlocks(input, [{ kind: "embed", embed: { provider: "npr", url: "https://www.npr.org/player/embed/a/b", title: null } }]);
    expect(out.root.children).toHaveLength(1);
    expect(input.root.children[0]).toEqual(para(`${MARKER}0`));
  });
});
