import type { Payload } from "payload";

/** Public form submissions are kept 12 months (plan 13), then deleted by the 15-minute cron. */
export const submissionCutoff = (now: number): string => {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString();
};

export async function pruneSubmissions(payload: Pick<Payload, "delete">, now: number): Promise<{ deleted: number }> {
  const { docs } = await payload.delete({ collection: "form-submissions", where: { createdAt: { less_than: submissionCutoff(now) } } });
  return { deleted: docs.length };
}
