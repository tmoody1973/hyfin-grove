/**
 * Regression guard: production 500'd because payload.config pulled jsdom (import-only code) into the
 * live server, where jsdom fails to load on Vercel's Node runtime. Nothing payload.config imports may
 * reach jsdom.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");
const resolveLocal = (from: string, spec: string): string | null => {
  const base = spec.startsWith("@/") ? resolve(ROOT, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
};

function reaches(entry: string, pkg: string): string[] | null {
  const seen = new Set<string>();
  const walk = (file: string, path: string[]): string[] | null => {
    if (seen.has(file)) return null;
    seen.add(file);
    for (const m of readFileSync(file, "utf8").matchAll(/(?:^|\n)\s*(?:import|export)\s[^'"]*?from\s+["']([^"']+)["']/g)) {
      const spec = m[1];
      if (spec === pkg || spec.startsWith(`${pkg}/`)) return [...path, file, spec];
      const next = resolveLocal(file, spec);
      const hit = next ? walk(next, [...path, file]) : null;
      if (hit) return hit;
    }
    return null;
  };
  return walk(entry, []);
}

const rel = (chain: string[] | null) => chain?.map((f) => f.replace(`${ROOT}/`, "")) ?? null;

describe("live server bundle", () => {
  it("payload.config never imports jsdom, directly or indirectly", () => {
    expect(rel(reaches(resolve(ROOT, "payload.config.ts"), "jsdom"))).toBeNull();
  });
  it("the CDS sync routes never import jsdom", () => {
    for (const route of ["app/(payload)/api/cron/cds-sync/route.ts", "app/(payload)/api/cron/cds-sync/health/route.ts"]) {
      expect(rel(reaches(resolve(ROOT, route), "jsdom"))).toBeNull();
    }
  });
  it("the story page never imports jsdom", () => {
    expect(rel(reaches(resolve(ROOT, "app/(frontend)/[category]/[slug]/page.tsx"), "jsdom"))).toBeNull();
  });
});
