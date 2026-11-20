/** The phone shell's bottom tabs (plan 15; mockup docs/mockups-html/screens/08-phone-app/app-home.html). */
export type TabId = "home" | "listen" | "stories" | "milwaukee" | "more";

export const TABS: readonly { id: TabId; label: string; href: string | null; icon: string }[] = [
  { id: "home", label: "Home", href: "/", icon: "M3 11l9-8 9 8v10h-6v-6H9v6H3z" },
  { id: "listen", label: "Listen", href: "/listen/playlist", icon: "M4 15v-3a8 8 0 0116 0v3M4 15h3v5H4zM17 15h3v5h-3z" },
  { id: "stories", label: "Stories", href: "/stories", icon: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" },
  { id: "milwaukee", label: "Milwaukee", href: "/milwaukee", icon: "M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" },
  { id: "more", label: "More", href: null, icon: "M4 7h16M4 12h16M4 17h16" },
];

// A Map, not an object literal: "/constructor" or "/__proto__" must not match a built-in property (as lib/signal.ts).
const BY_SECTION = new Map<string, TabId>([
  ["listen", "listen"],
  ["shows", "listen"],
  ["hosts", "listen"],
  ["stories", "stories"],
  ["music", "stories"],
  ["culture", "stories"],
  ["milwaukee", "milwaukee"],
  ["events", "milwaukee"],
]);

const firstSegment = (pathname: string) => pathname.split("/")[1] ?? "";

export function activeTab(pathname: string): TabId {
  if (pathname === "/") return "home";
  return BY_SECTION.get(firstSegment(pathname)) ?? "more";
}

/** The top bar's "/section": "/mke" at home (as the mockup), else the first path segment if it's a short plain word. */
export function sectionLabel(pathname: string): string {
  const seg = firstSegment(pathname);
  return /^[a-z][a-z-]{0,15}$/.test(seg) ? `/${seg}` : "/mke";
}
