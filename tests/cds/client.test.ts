import { describe, expect, it, vi } from "vitest";
import { fetchByIds, fetchScopedDocuments } from "@/lib/cds/client";

const page = (ids: string[]) => new Response(JSON.stringify({ resources: ids.map((id) => ({ id })) }));

describe("CDS client", () => {
  it("pages until a short page and drops WordPress copies", async () => {
    const full = Array.from({ length: 100 }, (_, i) => `g-s921-${i}`);
    const fetchImpl = vi.fn().mockResolvedValueOnce(page([...full.slice(0, 99), "hyfin-9"])).mockResolvedValueOnce(page(["g-s921-500"]));
    const docs = await fetchScopedDocuments("t", fetchImpl);
    expect(docs.map((d) => d.id)).toEqual([...full.slice(0, 99), "g-s921-500"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstUrl = String(fetchImpl.mock.calls[0][0]);
    expect(firstUrl).toContain("collectionIds=g-s921-16131%2Cg-s921-13049");
    expect(firstUrl).toContain("excludedProfileIds=has-premium-audio");
  });
  it("fails loudly on an error status", async () => {
    await expect(fetchScopedDocuments("t", vi.fn().mockResolvedValue(new Response("no", { status: 401 })))).rejects.toThrow(/401/);
  });
  it("reports which stored ids CDS still has", async () => {
    const still = await fetchByIds("t", ["a", "b"], vi.fn().mockResolvedValue(page(["a"])));
    expect([...still]).toEqual(["a"]);
  });
});
