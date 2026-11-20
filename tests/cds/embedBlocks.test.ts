import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { toBody, type CdsDocument } from "@/lib/cds/toPost";
import { CdsBody } from "@/components/story/CdsBody";

const MIX = "https://player-widget.mixcloud.com/widget/iframe/?26=1&amp;hide_cover=1&amp;feed=%2Frhythmlab%2Frlr-11626%2F";
const prof = (name: string) => [{ href: "/v1/profiles/document" }, { href: `/v1/profiles/${name}` }];
const docWith = (html: string): CdsDocument =>
  ({
    id: "g-s921-1",
    layout: [{ href: "#/assets/a1" }, { href: "#/assets/a2" }, { href: "#/assets/a3" }],
    assets: {
      a1: { id: "a1", profiles: prof("text"), text: "<p>Before</p>" },
      a2: { id: "a2", profiles: prof("html-block"), html },
      a3: { id: "a3", profiles: prof("text"), text: "<p>After</p>" },
    },
  }) as unknown as CdsDocument;

describe("CDS html blocks", () => {
  it("keeps an allowed player (Mixcloud) as an embed block, in order", () => {
    const blocks = toBody(docWith(`<iframe src="${MIX}" height="130" width="100%" title="Rhythm Lab"></iframe>`), undefined);
    expect(blocks.map((b) => b.kind)).toEqual(["html", "embed", "html"]);
    const e = blocks[1] as { kind: "embed"; provider: string; url: string };
    expect(e.provider).toBe("mixcloud");
    expect(e.url).toContain("https://player-widget.mixcloud.com/widget/iframe/");
    expect(e.url).toContain("hide_cover=1");
  });
  it("drops a block with a player that isn't on the allowed list, or a script", () => {
    expect(toBody(docWith('<iframe src="https://evil.example.com/x"></iframe>'), undefined).map((b) => b.kind)).toEqual(["html", "html"]);
    expect(toBody(docWith("<script>alert(1)</script>"), undefined).map((b) => b.kind)).toEqual(["html", "html"]);
  });
  it("CdsBody draws the player", () => {
    const html = renderToStaticMarkup(CdsBody({ blocks: toBody(docWith(`<iframe src="${MIX}"></iframe>`), undefined) }));
    expect(html).toContain("<iframe");
    expect(html).toContain("player-widget.mixcloud.com");
  });
});

// Shapes copied from NPR's real stories (2026-11-20): Orchestra Noir (g-s1-154644), Gracie's Corner Tiny Desk (g-s1-150990).
const videoDoc = (assets: Record<string, unknown>): CdsDocument =>
  ({ id: "g-s1-1", layout: Object.keys(assets).filter((k) => k !== "thumb").map((k) => ({ href: `#/assets/${k}` })), assets }) as unknown as CdsDocument;
const yt = { id: "g-s1-154644-100", profiles: [{ href: "/v1/profiles/youtube-video" }, { href: "/v1/profiles/document" }], videoId: "nI2m15Y1RNo" };
const stream = (o: Record<string, unknown> = {}) => ({
  id: "g-s1-153642",
  profiles: [{ href: "/v1/profiles/has-images" }, { href: "/v1/profiles/stream-player-video" }, { href: "/v1/profiles/document" }],
  title: "Gracie's Corner: Tiny Desk Video",
  isEmbeddable: true,
  enclosures: [{ href: "https://cdn.jwplayer.com/manifests/abGWFYuW.m3u8", rels: ["hls"], type: "application/vnd.apple.mpegurl" }],
  images: [{ href: "#/assets/thumb", rels: ["thumbnail"] }],
  ...o,
});
const thumb = { id: "thumb", profiles: prof("image"), enclosures: [{ href: "https://npr.brightspotcdn.com/wide.jpg", rels: ["image-wide", "scalable"] }] };

describe("NPR videos in story bodies", () => {
  it("a YouTube video block becomes a YouTube embed", () => {
    expect(toBody(videoDoc({ v: yt }), undefined)).toEqual([{ kind: "embed", id: "g-s1-154644-100", provider: "youtube", url: "https://www.youtube-nocookie.com/embed/nI2m15Y1RNo", title: null }]);
  });
  it("NPR's own video player block becomes a video with its stream and thumbnail", () => {
    expect(toBody(videoDoc({ v: stream(), thumb }), undefined)).toEqual([{ kind: "video", id: "g-s1-153642", src: "https://cdn.jwplayer.com/manifests/abGWFYuW.m3u8", poster: "https://npr.brightspotcdn.com/wide.jpg", title: "Gracie's Corner: Tiny Desk Video" }]);
  });
  it("drops a video NPR marks not embeddable or restricted, one with no stream, or a stream off https", () => {
    for (const o of [{ isEmbeddable: false }, { isRestrictedToAuthorizedOrgServiceIds: true }, { enclosures: [] }, { enclosures: [{ href: "http://cdn.jwplayer.com/x.m3u8", rels: ["hls"] }] }]) {
      expect(toBody(videoDoc({ v: stream(o), thumb }), undefined)).toEqual([]);
    }
    expect(toBody(videoDoc({ v: { ...yt, videoId: "bad id!" } }), undefined)).toEqual([]);
  });
  it("draws the video with native controls, its title and poster, and loads nothing until played", () => {
    const html = renderToStaticMarkup(CdsBody({ blocks: toBody(videoDoc({ v: stream(), thumb }), undefined) }));
    expect(html).toContain('<video');
    expect(html).toContain('src="https://cdn.jwplayer.com/manifests/abGWFYuW.m3u8"');
    expect(html).toContain('poster="https://npr.brightspotcdn.com/wide.jpg"');
    expect(html).toContain('preload="none"');
    expect(html).toContain("Gracie&#x27;s Corner: Tiny Desk Video");
  });
});
