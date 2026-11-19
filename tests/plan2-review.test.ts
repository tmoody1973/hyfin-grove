/** Final-review findings on plan 2. */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { embedFromUrl } from "@/lib/embeds";
import { extractEmbeds, MARKER } from "@/lib/wordpress/embedsInHtml";
import { EmbedBlock } from "@/components/story/EmbedBlock";
import { loadPostViews } from "@/lib/reviewRules";

describe("#2 only real player addresses are accepted", () => {
  it("turns a Spotify share link into its player", () => {
    expect(embedFromUrl("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc")?.url).toBe("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC");
    expect(embedFromUrl("https://open.spotify.com/intl-fr/album/1ATL5GLyefJaxhQzSPVrLX")?.url).toBe("https://open.spotify.com/embed/album/1ATL5GLyefJaxhQzSPVrLX");
  });
  it("refuses ordinary web pages on player hosts", () => {
    expect(embedFromUrl("https://www.npr.org/2024/01/01/123/some-story")).toBeNull();
    expect(embedFromUrl("https://artist.bandcamp.com/album/x")).toBeNull();
    expect(embedFromUrl("https://open.spotify.com/user/someone")).toBeNull();
    expect(embedFromUrl("https://odesli.co/about")).toBeNull();
  });
  it("still accepts the real player addresses", () => {
    expect(embedFromUrl("https://www.npr.org/player/embed/nx-s1-4526570/nx-s1-9546829")?.provider).toBe("npr");
    expect(embedFromUrl("https://bandcamp.com/EmbeddedPlayer/album=954092468/size=large/")?.provider).toBe("bandcamp");
    expect(embedFromUrl("https://odesli.co/embed/?url=x")?.provider).toBe("odesli");
    expect(embedFromUrl("https://www.instagram.com/p/CxOJNsNRzub/")?.provider).toBe("instagram");
    expect(embedFromUrl("https://www.instagram.com/someone/")).toBeNull();
  });
});

describe("#3 embed markers keep order and stay at the top level", () => {
  const order = (html: string) => {
    const r = extractEmbeds(html);
    return { html: r.html, ids: r.embeds.map((e) => (e.kind === "embed" ? e.embed.url.split("/").pop() : "audio")) };
  };
  it("two embeds in one paragraph come out in order, after the paragraph", () => {
    const r = order('<p>Watch <iframe src="https://youtu.be/aaaaaaaaaaa"></iframe> and <iframe src="https://youtu.be/bbbbbbbbbbb"></iframe></p>');
    expect(r.ids).toEqual(["aaaaaaaaaaa", "bbbbbbbbbbb"]);
    expect(r.html).toBe(`<p>Watch  and </p><p>${MARKER}0</p><p>${MARKER}1</p>`);
  });
  it("embeds across list items come out in order, after the list", () => {
    const r = order('<ul><li><iframe src="https://youtu.be/aaaaaaaaaaa"></iframe></li><li><iframe src="https://youtu.be/bbbbbbbbbbb"></iframe></li></ul>');
    expect(r.html).toBe(`<ul><li></li><li></li></ul><p>${MARKER}0</p><p>${MARKER}1</p>`);
  });
  it("a paragraph inside a list item or a blockquote still puts the marker at the top level", () => {
    expect(order('<ul><li><p>x <iframe src="https://youtu.be/aaaaaaaaaaa"></iframe></p></li></ul>').html).toBe(`<ul><li><p>x </p></li></ul><p>${MARKER}0</p>`);
    expect(order('<blockquote><p>q <iframe src="https://youtu.be/aaaaaaaaaaa"></iframe></p></blockquote>').html).toBe(`<blockquote><p>q </p></blockquote><p>${MARKER}0</p>`);
  });
});

describe("captions", () => {
  it("an embed's caption is kept as a paragraph after its block", () => {
    const r = extractEmbeds('<figure class="wp-block-embed"><div class="wp-block-embed__wrapper"><iframe src="https://youtu.be/aaaaaaaaaaa"></iframe></div><figcaption>Jay-Z at the Grammys</figcaption></figure>');
    expect(r.html).toBe(`<p>${MARKER}0</p><p><em>Jay-Z at the Grammys</em></p>`);
  });
});

describe("rendering hardening", () => {
  it("player iframes are sandboxed", () => {
    const html = renderToStaticMarkup(EmbedBlock({ url: "https://youtu.be/aaaaaaaaaaa", provider: "youtube", title: null }));
    expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"');
    expect(html).toContain('title="YouTube video"');
  });
  it("a stored address that fails the allowlist is only linked if it's a web address", () => {
    expect(renderToStaticMarkup(EmbedBlock({ url: "javascript:alert(1)", provider: "youtube", title: null }))).not.toContain("href");
    expect(renderToStaticMarkup(EmbedBlock({ url: "https://example.com/x", provider: "youtube", title: null }))).toContain('href="https://example.com/x"');
  });
  it("social cards have distinct screen-reader names", () => {
    expect(renderToStaticMarkup(EmbedBlock({ url: "https://www.instagram.com/p/CxOJNsNRzub/", provider: "instagram", title: null }))).toContain('aria-label="View Instagram post CxOJNsNRzub"');
  });
  it("audio from WordPress is upgraded to https", () => {
    const [a] = extractEmbeds('<figure class="wp-block-audio"><audio src="http://traffic.megaphone.fm/x.mp3"></audio></figure>').embeds;
    expect(a).toMatchObject({ kind: "audio", url: "https://traffic.megaphone.fm/x.mp3" });
  });
});

describe("traffic CSV missing", () => {
  it("means no top-traffic posts, not a crash", () => {
    expect(loadPostViews("docs/does-not-exist.csv").size).toBe(0);
  });
});

describe("real player shapes found in the archive", () => {
  it("keeps NPR Tiny Desk video players (28 posts) with their story and media IDs", () => {
    expect(embedFromUrl("https://www.npr.org/embedded-video?storyId=1248539873&mediaId=1248982417&jwMediaType=music")?.url).toBe("https://www.npr.org/embedded-video?storyId=1248539873&mediaId=1248982417&jwMediaType=music");
  });
  it("keeps Instagram TV posts", () => {
    expect(embedFromUrl("https://www.instagram.com/tv/Cewq2rCMA26/?utm_source=ig_embed")?.url).toBe("https://www.instagram.com/tv/Cewq2rCMA26/");
  });
  it("converts Spotify's old embed?uri= form to the player", () => {
    expect(embedFromUrl("https://open.spotify.com/embed?uri=spotify%3Aplaylist%3A2X8C17SHeoo1BFimWBt8Vo")?.url).toBe("https://open.spotify.com/embed/playlist/2X8C17SHeoo1BFimWBt8Vo");
  });
});

describe("NPR video", () => {
  it("Tiny Desk videos get a 16:9 frame; NPR audio keeps its player height", async () => {
    const { playerHeight } = await import("@/lib/embeds");
    expect(playerHeight({ provider: "npr", url: "https://www.npr.org/embedded-video?storyId=1", title: null })).toBe("16:9");
    expect(playerHeight({ provider: "npr", url: "https://www.npr.org/player/embed/a/b", title: null })).toBe(235);
  });
});
