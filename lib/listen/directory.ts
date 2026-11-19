import "server-only";
import config from "@payload-config";
import { getPayload } from "payload";
import { cache } from "react";
import type { Host, Media, Show } from "@/payload-types";
import type { HostLite, ShowLite } from "./attach";

const mediaUrl = (m: number | Media | null | undefined): string | null => (m && typeof m === "object" ? m.url ?? null : null);

export const toShowLite = (s: Show): ShowLite => ({
  slug: s.slug, name: s.name, cadenceProgramName: s.cadenceProgramName ?? null, description: s.description ?? null, artworkUrl: mediaUrl(s.artwork),
});
export const toHostLite = (h: Host): HostLite => ({
  slug: h.slug, name: h.name, cadenceHostName: h.cadenceHostName ?? null, photoUrl: mediaUrl(h.photo),
});

/** Every show and host staff keep in Payload (a few dozen rows; read whole). */
export const getDirectory = cache(async () => {
  const payload = await getPayload({ config });
  const [shows, hosts] = await Promise.all([
    payload.find({ collection: "shows", pagination: false, depth: 1, sort: "name" }),
    payload.find({ collection: "hosts", pagination: false, depth: 1, sort: "name" }),
  ]);
  return { shows: shows.docs, hosts: hosts.docs };
});
