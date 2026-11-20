import type { CdsPostData } from "@/lib/cds/toPost";

/**
 * What one NPR sync run changes (plan 11, task 2). Pure, so every rule is tested without CDS or a database.
 * NPR marks its stories "refresh regularly, do not store beyond display": copies are refreshed every run, withdrawn
 * when NPR stops serving them, and Race copies nobody picked are deleted 30 days after publishing.
 */
export type StoredNpr = {
  postId: number;
  cdsId: string;
  origin: "race" | "picked";
  publishedAt: string;
  editorialLastModified: string | null;
  withdrawnAt: string | null;
};

export type NprPlan = {
  create: CdsPostData[];
  update: Array<{ postId: number; data: CdsPostData }>;
  withdraw: number[];
  restore: Array<{ postId: number; data: CdsPostData }>;
  expire: number[];
};

const KEEP_RACE_MS = 30 * 86_400_000;
const newer = (a: string, b: string | null) => b === null || Date.parse(a) > Date.parse(b);

/**
 * `race`: NPR's Race topic now (accepted stories). `stored`: HYFIN's NPR copies. `current`: what CDS says about each
 * stored copy now: the story, or null when NPR no longer serves it as an acceptable story. A copy missing from
 * `current` got no answer (CDS down) and is left alone.
 */
export function planNprSync({ race, stored, current, now }: { race: CdsPostData[]; stored: StoredNpr[]; current: ReadonlyMap<string, CdsPostData | null>; now: Date }): NprPlan {
  const have = new Set(stored.map((s) => s.cdsId));
  const inRace = new Set(race.map((r) => r.cdsId));
  const plan: NprPlan = { create: race.filter((r) => !have.has(r.cdsId)), update: [], withdraw: [], restore: [], expire: [] };
  for (const s of stored) {
    if (s.origin === "race" && !inRace.has(s.cdsId) && now.getTime() - Date.parse(s.publishedAt) > KEEP_RACE_MS) {
      plan.expire.push(s.postId);
      continue;
    }
    if (!current.has(s.cdsId)) continue;
    const d = current.get(s.cdsId) ?? null;
    if (d === null) {
      if (!s.withdrawnAt) plan.withdraw.push(s.postId);
    } else if (s.withdrawnAt) plan.restore.push({ postId: s.postId, data: d });
    else if (newer(d.editorialLastModified, s.editorialLastModified)) plan.update.push({ postId: s.postId, data: d });
  }
  return plan;
}
