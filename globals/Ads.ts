import type { GlobalConfig } from "payload";
import { parseSize } from "../lib/ads/slots";

const size = (v: unknown) => (parseSize(v) ? true : "Width x height, e.g. 728x90");
const phoneSize = (v: unknown) => (v == null || v === "" || parseSize(v) ? true : "Width x height, e.g. 300x50, or empty for desktop only");

/**
 * Admin → Ads (issue #22). Google Ad Manager runs the campaigns; this decides which ad spots exist on hyfin.org and
 * whether each is on. Read per request, so a switch takes effect on the next page view. Rules: lib/ads/slots.ts.
 */
export const Ads: GlobalConfig = {
  slug: "ads",
  label: "Ads",
  admin: { description: "Google Ad Manager ad spots on hyfin.org. Campaigns, dates and creatives stay in Ad Manager; this only turns spots on or off. Turning a spot on loads Google's ad tag on that page." },
  access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    { name: "enabled", label: "Ads on (site-wide)", type: "checkbox", defaultValue: false, admin: { description: "Off hides every ad spot at once." } },
    { name: "networkCode", label: "Ad Manager network code", type: "text", defaultValue: "118058336", admin: { description: "Radio Milwaukee's Google Ad Manager network." } },
    {
      name: "slots",
      label: "Ad spots",
      type: "array",
      labels: { singular: "Ad spot", plural: "Ad spots" },
      admin: { initCollapsed: false },
      fields: [
        { name: "name", type: "text", required: true },
        { name: "enabled", label: "On", type: "checkbox", defaultValue: false },
        { name: "placement", type: "select", required: true, defaultValue: "playlist-banner", options: [{ label: "Playlist: banner under On air", value: "playlist-banner" }, { label: "Playlist: sidebar skyscraper (desktop)", value: "playlist-sidebar" }] },
        { name: "adUnit", label: "Ad unit", type: "text", required: true, admin: { description: "The ad unit's name in Ad Manager, e.g. HYFIN-Playlist-Banner." } },
        { type: "row", fields: [
          { name: "desktopSize", label: "Desktop size", type: "text", required: true, defaultValue: "728x90", validate: size },
          { name: "mobileSize", label: "Phone size", type: "text", defaultValue: "300x50", validate: phoneSize, admin: { description: "Empty = desktop only." } },
        ] },
        { name: "label", label: "Label above the ad (optional)", type: "text", admin: { description: "e.g. Support for HYFIN comes from" } },
        { type: "row", fields: [
          { name: "startsAt", label: "Starts (optional)", type: "date", admin: { date: { pickerAppearance: "dayAndTime" } } },
          { name: "endsAt", label: "Ends (optional)", type: "date", admin: { date: { pickerAppearance: "dayAndTime" } } },
        ] },
      ],
    },
  ],
};
