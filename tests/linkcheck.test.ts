import { describe, expect, it } from "vitest";
import { classify, isExcluded, judge, parseExclusions, parseGaCsv } from "@/lib/linkcheck";

describe("classify", () => {
  it.each([
    ["/", "home"],
    ["/2024/04/07/szas-lyrics/", "dated post"],
    ["/2025/01/17/", "date archive"],
    ["/category/news/music/verified/", "category"],
    ["/tag/dei/", "tag"],
    ["/author/hyfinstg/", "author"],
    ["/events/blackity-black-holiday-market/", "event"],
    ["/event/x/", "event"],
    ["/venue/grace-center/", "event"],
    ["/organizer/dandy/", "event"],
    ["/hyfin-event/rb-live/", "event"],
    ["/podcast/the-original-rainbow-coalition-2/", "podcast"],
    ["/page/2/", "paging"],
    ["/feed/", "feed"],
    ["/wp-content/uploads/2024/04/x.jpg", "upload"],
    ["/thewiz/", "page"],
    ["/members/kim-shine-2/", "other"],
  ])("%s → %s", (path, kind) => expect(classify(path)).toBe(kind));
});

describe("exclusions", () => {
  const list = parseExclusions("# comment\n^/wp-admin/   # WordPress admin probes\n/null$  # broken links\n\n");
  it("reads one pattern per line with its reason", () => {
    expect(list.map((e) => e.reason)).toEqual(["WordPress admin probes", "broken links"]);
  });
  it("matches paths", () => {
    expect(isExcluded("/wp-admin/x", list)).toBe(true);
    expect(isExcluded("/2024/01/01/x/null", list)).toBe(true);
    expect(isExcluded("/thewiz/", list)).toBe(false);
  });
});

describe("judge", () => {
  const host = "https://hyfin.example";
  it("passes a final 200 within 2 redirects on our own site", () => {
    expect(judge({ status: 200, hops: 2, finalUrl: `${host}/music/x` }, host)).toBe("pass");
  });
  it("fails a 404, too many hops, or a hop to another site", () => {
    expect(judge({ status: 404, hops: 1, finalUrl: `${host}/x` }, host)).toBe("fail");
    expect(judge({ status: 200, hops: 3, finalUrl: `${host}/x` }, host)).toBe("fail");
    expect(judge({ status: 200, hops: 1, finalUrl: "https://evil.example/x" }, host)).toBe("fail");
  });
  it("allows Radio Milwaukee's donate page as the one off-site landing", () => {
    expect(judge({ status: 200, hops: 1, finalUrl: "https://radiomilwaukee.org/donate" }, host)).toBe("pass");
  });
});

describe("parseGaCsv", () => {
  it("skips comment lines and the header, keeps path and views", () => {
    const csv = "# GA\n# x\nPage path and screen class,Views,Active users\n/,88523,29023\n/thewiz/,8163,10\n,5,1\n";
    expect(parseGaCsv(csv)).toEqual([{ path: "/", views: 88523 }, { path: "/thewiz/", views: 8163 }]);
  });
  it("keeps addresses that contain commas (quoted in the CSV)", () => {
    expect(parseGaCsv('h\n"/2024/01/01/a,b-c/",12,3\n"/x ""y""/",4,1\n')).toEqual([{ path: "/2024/01/01/a,b-c/", views: 12 }, { path: '/x "y"/', views: 4 }]);
  });
});
