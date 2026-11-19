/** CSV for the import report: one quoted-field writer and a record-aware reader (fields may hold newlines). */

export const csvCell = (v: unknown): string => {
  const s = Array.isArray(v) ? v.join("|") : v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Parse CSV text into records (header row dropped). Handles quotes, escaped quotes and newlines in fields. */
export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = "", row: string[] = [], quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) records.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); records.push(row); }
  return records.slice(1);
}
