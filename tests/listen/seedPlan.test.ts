import { describe, expect, it } from "vitest";
import { planSeed } from "@/lib/listen/seedPlan";

type Row = { slug: string; name?: string | null; description?: string | null; cadenceProgramName?: string | null };

describe("planSeed", () => {
  it("creates shows that don't exist yet", () => {
    expect(planSeed<Row>([], [{ slug: "rhythm-lab-radio", name: "Rhythm Lab Radio" }]).create.map((r) => r.slug)).toEqual(["rhythm-lab-radio"]);
  });
  it("fills an empty field", () => {
    const plan = planSeed<Row>([{ slug: "ladies-first", name: "Ladies First", description: null }], [{ slug: "ladies-first", description: "Spotlights…" }]);
    expect(plan.update).toEqual([{ slug: "ladies-first", data: { description: "Spotlights…" } }]);
  });
  it("leaves a staff edit alone", () => {
    const plan = planSeed<Row>([{ slug: "ladies-first", description: "Edited by staff" }], [{ slug: "ladies-first", description: "From the sheet" }]);
    expect(plan.update).toEqual([]);
  });
  it("an incoming null or empty value never clears anything", () => {
    const plan = planSeed<Row>([{ slug: "x", cadenceProgramName: "X" }], [{ slug: "x", cadenceProgramName: null, description: "" }]);
    expect(plan.update).toEqual([]);
  });
});
