import type { Where } from "payload";

/** Every site lookup goes through this: a CDS story that was withdrawn stays in the database but off the site. */
export const visible = (where: Where): Where => ({ and: [where, { "cds.withdrawnAt": { exists: false } }] });

/** Stories whose byline names this person anywhere ("Kenny Perez, Paula Lovo" counts for both). */
export const bylineWhere = (name: string): Where => visible({ byline: { like: name.trim() } });
