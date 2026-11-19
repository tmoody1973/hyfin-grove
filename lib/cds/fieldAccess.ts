import type { FieldAccess } from "payload";

/**
 * CDS-owned fields are rewritten by every sync, so editors can't change them on synced posts
 * (spec anti-goal: an edit silently lost on the next sync). The sync writes with overrideAccess.
 */
/** Synced sources own these fields; an edit would be overwritten by the next sync. */
const SYNCED = new Set(["cds", "station"]);
export const cdsLocked: FieldAccess = ({ doc }) => !SYNCED.has((doc as { source?: string } | undefined)?.source ?? "");
