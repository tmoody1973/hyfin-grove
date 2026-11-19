import { describe, expect, it } from "vitest";
import { FrontPage } from "@/globals/FrontPage";

const req = (user: unknown) => ({ req: { user } }) as never;

describe("Front page global", () => {
  it("has four optional lead pins pointing at posts", () => {
    const fields = FrontPage.fields as Array<{ name?: string; type: string; relationTo?: string; required?: boolean }>;
    for (const name of ["homeLead", "musicLead", "cultureLead", "milwaukeeLead"]) {
      const f = fields.find((x) => x.name === name);
      expect(f, name).toBeDefined();
      expect(f?.type).toBe("relationship");
      expect(f?.relationTo).toBe("posts");
      expect(f?.required).not.toBe(true);
    }
  });
  it("anyone can read it; only signed-in staff can change it", () => {
    expect(FrontPage.slug).toBe("front-page");
    expect(FrontPage.access?.read?.(req(null))).toBe(true);
    expect(FrontPage.access?.update?.(req(null))).toBe(false);
    expect(FrontPage.access?.update?.(req({ id: 7, role: "editor" }))).toBe(true);
  });
});
