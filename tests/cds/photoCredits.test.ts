import { describe, expect, it } from "vitest";
import { photoCredit, toBody, toPostData, type CdsDocument } from "@/lib/cds/toPost";

const img = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  profiles: [{ href: "/v1/profiles/image" }],
  caption: `Caption ${id}`,
  altText: `Alt ${id}`,
  producer: "Brandon Bell",
  provider: "Getty Images",
  enclosures: [{ href: `https://npr.brightspotcdn.com/${id}.jpg`, rels: ["image-wide"], width: 1600, height: 900 }],
  ...over,
});
const doc = (assets: Record<string, unknown>, layout: string[], primary: string): CdsDocument =>
  ({ id: "d", title: "T", publishDateTime: "2026-11-13T00:00:00Z", assets, layout: layout.map((k) => ({ href: `#/assets/${k}` })), images: [{ href: `#/assets/${primary}`, rels: ["primary"] }] }) as unknown as CdsDocument;

describe("photo credits", () => {
  it("joins photographer and agency the way NPR does", () => {
    expect(photoCredit({ producer: "Brandon Bell", provider: "Getty Images" } as never)).toBe("Brandon Bell/Getty Images");
    expect(photoCredit({ producer: "Sea Stachura for NPR" } as never)).toBe("Sea Stachura for NPR");
    expect(photoCredit({ provider: "AP" } as never)).toBe("AP");
    expect(photoCredit({} as never)).toBeNull();
  });
  it("gives the top photo its caption, credit and alt text", () => {
    const d = toPostData(doc({ h: img("h") }, [], "h"));
    expect(d).toMatchObject({ imageUrl: "https://npr.brightspotcdn.com/h.jpg", imageCaption: "Caption h", imageCredit: "Brandon Bell/Getty Images", imageAlt: "Alt h" });
  });
  it("body photos carry the full credit", () => {
    const [b] = toBody(doc({ b: img("b") }, ["b"], "x"), undefined);
    expect(b).toMatchObject({ kind: "image", caption: "Caption b", credit: "Brandon Bell/Getty Images" });
  });
  it("never shows photos NPR restricts to authorized organizations", () => {
    const restricted = img("r", { isRestrictedToAuthorizedOrgServiceIds: true });
    expect(toBody(doc({ r: restricted }, ["r"], "x"), undefined)).toEqual([]);
    expect(toPostData(doc({ r: restricted }, [], "r")).imageUrl).toBeNull();
  });
});

describe("synced CDS stories keep their top photo's caption and credit", async () => {
  const { cdsOwnedFields } = await import("@/lib/cds/plan");
  const { Posts } = await import("@/collections/Posts");
  it("the sync writes caption, credit and alt text", () => {
    const d = toPostData(doc({ h: img("h") }, [], "h"));
    expect(cdsOwnedFields(d, new Date(0)).cds).toMatchObject({ imageCaption: "Caption h", imageCredit: "Brandon Bell/Getty Images", imageAlt: "Alt h" });
  });
  it("posts have somewhere to keep them", () => {
    const cds = (Posts.fields as Array<{ name?: string; fields?: Array<{ name?: string }> }>).find((f) => f.name === "cds");
    expect(cds?.fields?.map((f) => f.name)).toEqual(expect.arrayContaining(["imageCaption", "imageCredit", "imageAlt"]));
  });
});
