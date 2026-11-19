import type { FieldAccess } from "payload";

/**
 * CDS-owned fields are rewritten by every sync, so editors can't change them on synced posts
 * (spec anti-goal: an edit silently lost on the next sync). The sync writes with overrideAccess.
 */
export const cdsLocked: FieldAccess = ({ doc }) => (doc as { source?: string } | undefined)?.source !== "cds";
