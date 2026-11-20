import { chicagoDayRange } from "../listen/time";
import { isEventType, type EventType } from "../events/types";

/** The staff quick-add form's fields, checked (plan 9, task 6). Dates and times are Milwaukee local. */
export type StaffEventData = {
  title: string;
  type: EventType;
  startsAt: string;
  endsAt: string | null;
  dateOnly: boolean;
  venue: string | null;
  address: string | null;
  city: string | null;
  ticketUrl: string | null;
  priceText: string | null;
  description: Record<string, unknown> | null;
  publish: boolean;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const hourIn = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "2026-12-06" + "19:00" in Milwaukee → an exact UTC time, correct on the days the clocks change. */
export function chicagoToIso(date: string, time: string): string {
  const [h, m] = time.split(":").map(Number);
  let ms = chicagoDayRange(date).fromMs + (h * 60 + m) * 60_000;
  const [lh, lm] = hourIn.format(ms).split(":").map(Number);
  ms += (h * 60 + m - (lh * 60 + lm)) * 60_000; // midnight + hours drifts by an hour across a DST change
  return new Date(ms).toISOString();
}

const text = (f: FormData, k: string, max = 300): string | null => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
};

/** Plain text → Lexical rich text, one paragraph per blank-line-separated block. */
function paragraphs(body: string): Record<string, unknown> {
  const node = (t: string) => ({ type: "paragraph", version: 1, direction: "ltr", format: "", indent: 0, textFormat: 0, children: [{ type: "text", version: 1, text: t, format: 0, detail: 0, mode: "normal", style: "" }] });
  return { root: { type: "root", version: 1, direction: "ltr", format: "", indent: 0, children: body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map(node) } };
}

export function parseEventInput(f: FormData): { ok: true; data: StaffEventData } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const rawTitle = typeof f.get("title") === "string" ? String(f.get("title")).trim() : "";
  if (!rawTitle) errors.title = "Add a title.";
  else if (rawTitle.length > 140) errors.title = "Keep the title under 140 characters.";
  const type = f.get("type");
  if (!isEventType(type)) errors.type = "Pick a type.";
  const date = text(f, "date") ?? "";
  if (!DATE.test(date)) errors.date = "Pick a date.";
  const start = text(f, "start");
  const end = text(f, "end");
  if (start && !TIME.test(start)) errors.start = "Use a time like 7:00 pm.";
  if (end && !TIME.test(end)) errors.end = "Use a time like 10:00 pm.";
  const ticketUrl = text(f, "ticketUrl", 500);
  if (ticketUrl && !/^https:\/\/[^\s]+$/i.test(ticketUrl)) errors.ticketUrl = "Ticket links must start with https://";

  let startsAt = "";
  let endsAt: string | null = null;
  if (!errors.date && !errors.start) startsAt = start ? chicagoToIso(date, start) : `${date}T00:00:00.000Z`;
  if (startsAt && end && !errors.end) {
    endsAt = chicagoToIso(date, end);
    if (!start || Date.parse(endsAt) <= Date.parse(startsAt)) errors.end = "The end time has to be after the start time.";
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const body = text(f, "description", 5000);
  return {
    ok: true,
    data: {
      title: rawTitle,
      type: type as EventType,
      startsAt,
      endsAt,
      dateOnly: !start,
      venue: text(f, "venue"),
      address: text(f, "address"),
      city: text(f, "city"),
      ticketUrl,
      priceText: text(f, "priceText", 120),
      description: body ? paragraphs(body) : null,
      publish: f.get("publish") === "on",
    },
  };
}
