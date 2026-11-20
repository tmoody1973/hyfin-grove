import { todayKey } from "../listen/time";

/** A staff event's address: its title plus its Milwaukee date, so the same title on two nights never clashes. */
export function staffEventSlug(title: string, startsAt: string): string {
  const words = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${words || "event"}-${todayKey(Date.parse(startsAt))}`;
}
