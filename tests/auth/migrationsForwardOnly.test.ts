import { describe, expect, it } from "vitest";
import { down as rolesDown } from "@/migrations/20261119_125230_roles";
import { down as subDown } from "@/migrations/20261119_125528_google_sub";

describe("auth migrations are forward-only", () => {
  it("refuse to roll back (re-applying would promote editors and unlink Google accounts)", async () => {
    await expect(rolesDown({} as never)).rejects.toThrow(/forward-only/);
    await expect(subDown({} as never)).rejects.toThrow(/forward-only/);
  });
});
