import { describe, expect, it } from "vitest";
import { embedFromUrl, isSocial, playerHeight } from "@/lib/embeds";

const YT = "https://www.youtube-nocookie.com/embed/fEpUD3mHFJU";

describe("embedFromUrl", () => {
  it("cleans a WordPress YouTube embed to the privacy-friendly player (post 438884)", () => {
    expect(embedFromUrl("https://www.youtube.com/embed/fEpUD3mHFJU?enablejsapi=1&autoplay=0&cc_load_policy=0&iv_load_policy=1&loop=0")).toEqual({ provider: "youtube", url: YT, title: null });
  });

  it("accepts every YouTube URL shape (Review Focus 2)", () => {
    for (const u of [
      "https://youtu.be/fEpUD3mHFJU",
      "https://www.youtube.com/watch?v=fEpUD3mHFJU&t=3",
      "https://www.youtube.com/shorts/fEpUD3mHFJU",
      "//www.youtube.com/embed/fEpUD3mHFJU",
      "https://m.youtube.com/watch?v=fEpUD3mHFJU",
    ]) expect(embedFromUrl(u)?.url, u).toBe(YT);
  });

  it("recognizes each audio provider from real hyfin.org posts", () => {
    expect(embedFromUrl("https://open.spotify.com/embed/artist/2CQAfzpwwaMxj3YNlb4Gbj?utm_source=generator")).toEqual({ provider: "spotify", url: "https://open.spotify.com/embed/artist/2CQAfzpwwaMxj3YNlb4Gbj", title: null }); // 73009
    expect(embedFromUrl("https://widget.spreaker.com/player?episode_id=68726131&theme=light&hide-logo=false")?.url).toBe("https://widget.spreaker.com/player?episode_id=68726131&theme=light&hide-logo=false"); // 438884
    expect(embedFromUrl("https://www.npr.org/player/embed/nx-s1-4526570/nx-s1-9546829")?.provider).toBe("npr"); // 438891
    expect(embedFromUrl("https://play.prx.org/e?ge=prx_13461_4b6e6e18&uf=https%3A%2F%2Fpublicfeeds.net%2Ff%2F13461")?.url).toBe("https://play.prx.org/e?ge=prx_13461_4b6e6e18&uf=https%3A%2F%2Fpublicfeeds.net%2Ff%2F13461"); // 441423
    expect(embedFromUrl("https://bandcamp.com/EmbeddedPlayer/album=954092468/size=large/bgcol=ffffff/")?.provider).toBe("bandcamp"); // 438379
    expect(embedFromUrl("https://odesli.co/embed/?url=https%3A%2F%2Falbum.link%2Fi%2F1839850101&theme=dark")?.provider).toBe("odesli"); // 438937
    expect(embedFromUrl("https://embed.music.apple.com/us/album/x/123")?.provider).toBe("apple-music");
    expect(embedFromUrl("https://embed.podcasts.apple.com/us/podcast/x/id1")?.provider).toBe("apple-podcasts");
    expect(embedFromUrl("https://w.soundcloud.com/player/?url=x")?.provider).toBe("soundcloud");
    expect(embedFromUrl("https://player-widget.mixcloud.com/widget/iframe/?feed=x")?.provider).toBe("mixcloud");
  });

  it("forces https and refuses anything off the allowlist (Review Focus 5)", () => {
    expect(embedFromUrl("http://open.spotify.com/embed/track/abc")?.url).toBe("https://open.spotify.com/embed/track/abc");
    expect(embedFromUrl("https://evil.example.com/embed/x")).toBeNull();
    expect(embedFromUrl("https://youtube.com.evil.example/embed/x")).toBeNull();
    expect(embedFromUrl("javascript:alert(1)")).toBeNull();
    expect(embedFromUrl("not a url")).toBeNull();
  });

  it("keeps social posts as permalinks", () => {
    expect(embedFromUrl("https://www.instagram.com/p/CxOJNsNRzub/?utm_source=ig_embed&utm_campaign=loading")).toEqual({ provider: "instagram", url: "https://www.instagram.com/p/CxOJNsNRzub/", title: null });
    expect(embedFromUrl("https://twitter.com/x/status/1")?.provider).toBe("twitter");
    expect(embedFromUrl("https://x.com/x/status/1")?.provider).toBe("twitter");
    expect(embedFromUrl("https://www.tiktok.com/@onlybriajae/video/7132243977641954606")?.provider).toBe("tiktok");
    expect(isSocial("instagram")).toBe(true);
    expect(isSocial("youtube")).toBe(false);
  });

  it("carries a title through", () => {
    expect(embedFromUrl("https://youtu.be/fEpUD3mHFJU", "SZA live")?.title).toBe("SZA live");
  });
});

describe("playerHeight", () => {
  const e = (provider: Parameters<typeof isSocial>[0], url = "x") => ({ provider, url, title: null });
  it("is 16:9 for YouTube and a fixed height for audio players", () => {
    expect(playerHeight(e("youtube"))).toBe("16:9");
    expect(playerHeight(e("spotify", "https://open.spotify.com/embed/track/a"))).toBe(152);
    expect(playerHeight(e("spotify", "https://open.spotify.com/embed/album/a"))).toBe(352);
    expect(playerHeight(e("spreaker"))).toBe(200);
    expect(playerHeight(e("npr"))).toBe(235);
    expect(playerHeight(e("bandcamp"))).toBe(120);
  });
});
