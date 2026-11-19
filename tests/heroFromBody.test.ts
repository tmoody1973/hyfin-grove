import { describe, expect, it } from "vitest";
import { fillHeroFromBody, firstUploadId } from "@/lib/heroFromBody";

const upload = (value: unknown, relationTo = "media") => ({ type: "upload", relationTo, value });
const body = (...children: unknown[]) => ({ root: { type: "root", children } });

describe("firstUploadId", () => {
  it("finds the first media upload, however deeply nested", () => {
    expect(firstUploadId(body({ type: "paragraph", children: [{ type: "text" }] }, { type: "quote", children: [upload(2)] }, upload(9)))).toBe(2);
  });
  it("accepts a populated upload ({ id })", () => {
    expect(firstUploadId(body(upload({ id: 5, url: "x" })))).toBe(5);
  });
  it("ignores uploads from other collections, blocks and empty bodies", () => {
    expect(firstUploadId(body(upload(3, "files"), { type: "block", fields: { blockType: "embed" } }))).toBeNull();
    expect(firstUploadId(null)).toBeNull();
    expect(firstUploadId(undefined)).toBeNull();
  });
});

describe("fillHeroFromBody", () => {
  it("fills an empty feature photo from the text", () => {
    expect(fillHeroFromBody({ heroImage: null, body: body(upload(2)) }).heroImage).toBe(2);
  });
  it("never replaces a photo someone chose", () => {
    expect(fillHeroFromBody({ heroImage: 7, body: body(upload(2)) }).heroImage).toBe(7);
  });
  it("leaves data alone when the text has no photo (no heroImage key added)", () => {
    const data = { title: "x", body: body({ type: "paragraph", children: [] }) };
    expect(fillHeroFromBody(data)).toBe(data);
  });
  it("on a partial update, respects the photo already saved", () => {
    expect(fillHeroFromBody({ body: body(upload(2)) }, { heroImage: 7 }).heroImage).toBeUndefined();
    expect(fillHeroFromBody({ body: body(upload(2)) }, { heroImage: null }).heroImage).toBe(2);
  });
});

describe("Posts save hook", async () => {
  const { Posts } = await import("@/collections/Posts");
  it("fills an empty feature photo when a story is saved", async () => {
    let data: Record<string, unknown> = { title: "x", heroImage: null, body: body(upload(2)) };
    for (const hook of Posts.hooks?.beforeChange ?? []) data = (await hook({ data, originalDoc: undefined, req: { user: null }, operation: "update" } as never)) ?? data;
    expect(data.heroImage).toBe(2);
  });
});
