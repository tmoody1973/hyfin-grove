/** Event types (plan 9). Synced rm-playlist events are always concerts; staff pick any. Changing the list is a code change. */
export const EVENT_TYPES = [
  { value: "concert", label: "Concert" },
  { value: "hyfin-event", label: "HYFIN event" },
  { value: "community", label: "Community" },
  { value: "workshop", label: "Workshop or panel" },
  { value: "party", label: "Party or DJ night" },
  { value: "broadcast", label: "Live broadcast" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];

export const typeLabel = (t: string | null | undefined): string => EVENT_TYPES.find((x) => x.value === t)?.label ?? "Event";

export const isEventType = (t: unknown): t is EventType => EVENT_TYPES.some((x) => x.value === t);
