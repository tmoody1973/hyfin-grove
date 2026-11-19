import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseStationFeed } from "@/lib/station/feed";

const xml = readFileSync("tests/station/fixtures/hyfin-tag.rss", "utf8");

describe("parseStationFeed (radiomilwaukee.org/tags/hyfin.rss, saved 2026-11-19)", () => {
  const eps = parseStationFeed(xml);
  it("keeps only the 3 Uniquely Milwaukee episodes, not Ladies First or Rhythm Lab", () => {
    expect(eps.map((e) => e.url.split("/").pop())).toEqual(["kasi-lemmons-movies-eves-bayou", "ex-fabula-milwaukee-storytelling-after-dark", "my-way-out-milwaukee"]);
  });
  it("reads title, summary, author, photo and an ISO date", () => {
    const e = eps[1];
    expect(e.title).toBe("‘AfterDark’ reveals truths about creation, inspiration and liberation");
    expect(e.summary).toMatch(/^The event featuring storytellers of color/);
    expect(e.author).toBe("Kim Shine");
    expect(e.imageUrl).toMatch(/^https:\/\/npr\.brightspotcdn\.com\/.*792x446/);
    expect(e.publishedAt).toBe("2026-11-05T12:00:00.000Z");
  });
  it("decodes entities and CDATA", () => {
    const one = `<rss><channel><item><title><![CDATA[Tom & Jerry]]></title><link>https://radiomilwaukee.org/podcast/uniquely-milwaukee/2026-01-01/x</link><description>A &amp; B &#8217;s &lt;b&gt;</description><pubDate>Thu, 01 Jan 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
    const [e] = parseStationFeed(one);
    expect(e.title).toBe("Tom & Jerry");
    expect(e.summary).toBe("A & B ’s <b>");
    expect(e.author).toBeNull();
    expect(e.imageUrl).toBeNull();
  });
  it("skips items without a usable date or with a look-alike address", () => {
    const bad = `<rss><channel><item><title>x</title><link>https://evil.example/podcast/uniquely-milwaukee/x</link><pubDate>Thu, 01 Jan 2026 12:00:00 GMT</pubDate></item><item><title>y</title><link>https://radiomilwaukee.org/podcast/uniquely-milwaukee/2026-01-01/y</link><pubDate>nope</pubDate></item></channel></rss>`;
    expect(parseStationFeed(bad)).toEqual([]);
  });
  it("throws on something that isn't RSS (an HTML error page, empty text)", () => {
    expect(() => parseStationFeed("<!DOCTYPE html><html><body>Oops</body></html>")).toThrow();
    expect(() => parseStationFeed("")).toThrow();
  });
  it("survives an impossible character code instead of dropping the whole feed", () => {
    const one = `<rss><channel><item><title>Bad &#99999999; char</title><link>https://radiomilwaukee.org/show/x</link><pubDate>Thu, 01 Jan 2026 12:00:00 GMT</pubDate></item><item><title>Fine</title><link>https://radiomilwaukee.org/podcast/uniquely-milwaukee/2026-01-01/y</link><pubDate>Thu, 01 Jan 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
    expect(parseStationFeed(one).map((e) => e.title)).toEqual(["Fine"]);
  });
  it("drops tracking codes and fragments from episode links, so they can't create duplicates", () => {
    const one = `<rss><channel><item><title>T</title><link>https://radiomilwaukee.org/podcast/uniquely-milwaukee/2026-01-01/y?utm_source=rss#top</link><pubDate>Thu, 01 Jan 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
    expect(parseStationFeed(one)[0].url).toBe("https://radiomilwaukee.org/podcast/uniquely-milwaukee/2026-01-01/y");
  });
});
