import type { FieldAccess } from "payload";

/** Fields the rm-playlist concert sync rewrites; a staff edit would be lost, so they're read-only on synced events. */
export const rmLocked: FieldAccess = ({ doc }) => (doc as { source?: string } | undefined)?.source !== "rm-playlist";
