import { describe, expect, it } from "vitest";
import { parseLegacyPath } from "@/lib/legacy";

const at = (slug: string, year = "2024", month = "04", day = "07") => parseLegacyPath({ year, month, day, slug });

describe("parseLegacyPath", () => {
  it("reads the WordPress slug from a dated address", () => {
    expect(at("szas-lyrics")).toEqual({ wpSlug: "szas-lyrics" });
  });

  it("ignores letter case, as WordPress did", () => {
    expect(at("SZAS-Lyrics")).toEqual({ wpSlug: "szas-lyrics" });
  });

  it("decodes URL-encoded characters such as curly apostrophes", () => {
    expect(at("it%e2%80%99s-here")).toEqual({ wpSlug: "it’s-here" });
  });

  it("rejects addresses that are not real dates", () => {
    expect(at("x", "24")).toBeNull();
    expect(at("x", "2024", "13")).toBeNull();
    expect(at("x", "2024", "04", "32")).toBeNull();
  });

  it("rejects an empty slug or one with bad encoding", () => {
    expect(at("")).toBeNull();
    // A literal % (not decodable) is kept as-is; the lookup then simply finds nothing.
    expect(at("%E0%A4%A")).toEqual({ wpSlug: "%e0%a4%a" });
  });
});
