import { describe, expect, it } from "vitest";
import { Posts } from "@/collections/Posts";
import { cdsLocked } from "@/lib/cds/fieldAccess";

type F = { name?: string; type?: string; options?: Array<{ value: string }>; fields?: F[]; unique?: boolean; index?: boolean };
const field = (name: string) => (Posts.fields as F[]).find((f) => f.name === name);

describe("posts from the Radio Milwaukee site", () => {
  it("source can be station", () => {
    expect(field("source")?.options?.map((o) => o.value)).toContain("station");
  });
  it("station.url is the unique key, indexed", () => {
    const url = field("station")?.fields?.find((f) => f.name === "url");
    expect(url?.unique).toBe(true);
    expect(url?.index).toBe(true);
    expect(field("station")?.fields?.map((f) => f.name)).toContain("cdsCopyId");
  });
  it("synced fields are locked on station posts like on CDS posts", () => {
    const can = (source: string) => cdsLocked({ doc: { source } } as never);
    expect(can("station")).toBe(false);
    expect(can("cds")).toBe(false);
    expect(can("wordpress")).toBe(true);
  });
});
