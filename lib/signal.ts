/**
 * Signal design (concept slide 6, docs/HYFIN_Logos/README.txt): each color means something.
 * Red = live and on air, green = Milwaukee and events, blue = series and originals, white = neutral.
 */
export const CHANNEL = { red: "#ff0040", green: "#00ff9f", blue: "#0070ff", white: "#ffffff" } as const;
export type Channel = keyof typeof CHANNEL;

const BY_SECTION: Record<string, Channel> = {
  listen: "red",
  hosts: "red",
  milwaukee: "green",
  events: "green",
  shows: "blue",
};

/** The logo color for a page, from the first segment of its address (so Milwaukee stories are green too). */
export function logoChannel(pathname: string): Channel {
  return BY_SECTION[pathname.split("/")[1] ?? ""] ?? "white";
}

/** Where the Stabilize switch remembers its choice. */
export const STABLE_KEY = "hyfin-stable";

/**
 * Runs before first paint (Next guide "Preventing flash before hydration"): a saved Stabilize choice, or the reader's
 * reduced-motion setting, calms the glitch before any headline can flicker.
 */
export const STABLE_SCRIPT = `(function(){try{var s=localStorage.getItem("${STABLE_KEY}");if(s==="1"||(s===null&&matchMedia("(prefers-reduced-motion: reduce)").matches))document.documentElement.setAttribute("data-stable","")}catch(e){}})()`;
