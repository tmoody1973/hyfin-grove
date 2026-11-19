import type { GlobalConfig } from "payload";

/** Heartbeat for the CDS sync: written by every run, read by /api/cron/cds-sync/health. */
export const CdsSyncStatus: GlobalConfig = {
  slug: "cds-sync-status",
  label: "CDS sync status",
  admin: { description: "Written by the 15-minute CDS sync. Read-only." },
  access: { read: ({ req }) => Boolean(req.user), update: () => false },
  fields: [
    { name: "lastRunAt", type: "date", admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } } },
    { name: "lastSuccessAt", type: "date", admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } } },
    { name: "lastError", type: "textarea", admin: { readOnly: true } },
    { name: "lastCounts", type: "json", admin: { readOnly: true } },
  ],
};
