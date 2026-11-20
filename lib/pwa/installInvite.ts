/** When to invite someone to add HYFIN to their home screen (plan 15, task 8). Never a pop-up, never on a first look. */
export type InstallPlatform = "ios" | "prompt" | "other";

const DAY = 86_400_000;

/**
 * "ios": Safari on iPhone/iPad, where installing is Share → Add to Home Screen. "prompt": the browser offered its
 * own install prompt (Android Chrome's beforeinstallprompt). Anything else can't be invited usefully.
 */
export function installPlatform(userAgent: string, hasPrompt: boolean): InstallPlatform {
  if (hasPrompt) return "prompt";
  const ios = /iPhone|iPad|iPod/.test(userAgent);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return ios && !otherBrowser ? "ios" : "other";
}

export function shouldInvite(s: { installed: boolean; platform: InstallPlatform; visits: number; listenedSeconds: number; dismissedAt: number | null; now: number }): boolean {
  if (s.installed || s.platform === "other") return false;
  if (s.dismissedAt !== null && s.now - s.dismissedAt < 30 * DAY) return false;
  return s.visits >= 2 || s.listenedSeconds >= 60;
}
