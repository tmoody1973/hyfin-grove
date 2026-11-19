import { describe, expect, it } from "vitest";
import { cdsLocked } from "@/lib/cds/fieldAccess";

const call = (doc: unknown) => cdsLocked({ doc } as Parameters<typeof cdsLocked>[0]);

describe("cdsLocked", () => {
  it("blocks editing CDS-owned fields on a synced post", () => expect(call({ source: "cds" })).toBe(false));
  it("allows editing on archive posts", () => expect(call({ source: "wordpress" })).toBe(true));
  it("allows setting the field when creating", () => expect(call(undefined)).toBe(true));
});
