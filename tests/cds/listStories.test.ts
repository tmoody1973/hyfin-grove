import { afterEach, describe, expect, it, vi } from "vitest";
import { listStories } from "@/lib/cds";

vi.mock("server-only", () => ({}));

afterEach(() => vi.unstubAllGlobals());

describe("homepage story list", () => {
  it("shows only stories the sync stores, so every /stories/<id> link resolves", async () => {
    vi.stubEnv("NPR_CDS_TOKEN", "t");
    vi.stubEnv("NPR_LADIES_FIRST_SERIES_ID", "g-s921-13049");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ resources: [{ id: "g-s921-1", title: "A", publishDateTime: "2026-11-01T00:00:00Z" }, { id: "hyfin-2", title: "B", publishDateTime: "2026-11-01T00:00:00Z" }] })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const stories = await listStories();
    expect(stories.map((s) => s.id)).toEqual(["g-s921-1"]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("excludedProfileIds=has-premium-audio");
  });
});
