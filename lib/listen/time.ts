/** Listen pages show Central time; every day boundary and label here is America/Chicago, DST included. */
const TZ = "America/Chicago";
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function local(ms: number) {
  const p = Object.fromEntries(parts.formatToParts(ms).map((x) => [x.type, Number(x.value)])) as Record<string, number>;
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

const offsetMs = (ms: number) => {
  const p = local(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
};

const utcDay = (key: string) => { const [y, m, d] = key.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const addDays = (key: string, n: number): string => new Date(utcDay(key) + n * 86_400_000).toISOString().slice(0, 10);

/** Local midnight of `key`, in epoch ms. Two passes: the offset can change across a DST switch. */
function midnight(key: string): number {
  const naive = utcDay(key);
  return naive - offsetMs(naive - offsetMs(naive));
}

export function todayKey(now: number): string {
  const p = local(now);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export const chicagoDayRange = (key: string) => ({ fromMs: midnight(key), toMs: midnight(addDays(key, 1)) });

export function weekKeys(now: number): string[] {
  const today = todayKey(now);
  const sinceMonday = (new Date(utcDay(today)).getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - sinceMonday));
}

export const isValidDayKey = (s: string): boolean => DAY_KEY.test(s) && addDays(s, 0) === s;

const suffix = (hour: number) => (hour < 12 ? "am" : "pm");
const clock = (hour: number, minute: number) => `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""}`;

/** "2:37 pm" */
export function formatTime(ms: number): string {
  const p = local(ms);
  return `${p.hour % 12 || 12}:${String(p.minute).padStart(2, "0")} ${suffix(p.hour)}`;
}

/** "12 to 5 pm", "6 am to 12 pm", "10 pm to 12 am", "9:30 to 11 pm" */
export function formatRange(startMs: number, endMs: number): string {
  const a = local(startMs);
  const b = local(endMs);
  const head = suffix(a.hour) === suffix(b.hour) ? clock(a.hour, a.minute) : `${clock(a.hour, a.minute)} ${suffix(a.hour)}`;
  return `${head} to ${clock(b.hour, b.minute)} ${suffix(b.hour)}`;
}

const shortDate = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const dayLabelFmt = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

/** "Dec 4" */
export const formatShortDate = (ms: number): string => shortDate.format(ms);

/** "Sat, Oct 3" for a day key */
export const formatDayKey = (key: string): string => dayLabelFmt.format(utcDay(key));

/** "5 pm", "5:30 pm" */
export function formatClock(ms: number): string {
  const p = local(ms);
  return `${clock(p.hour, p.minute)} ${suffix(p.hour)}`;
}

/** 0 = Sunday … 6 = Saturday, in Central time. */
export const weekdayOf = (ms: number): number => new Date(utcDay(todayKey(ms))).getUTCDay();
