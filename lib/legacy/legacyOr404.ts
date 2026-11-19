import "server-only";
import config from "@payload-config";
import { notFound, permanentRedirect } from "next/navigation";
import { getPayload } from "payload";
import { resolveLegacy } from "./resolve";

/** For a page that found nothing: send an old hyfin.org address where it now lives, else the normal 404. */
export async function legacyOr404(path: string): Promise<never> {
  const target = await resolveLegacy(path, await getPayload({ config }));
  if (target) permanentRedirect(target);
  notFound();
}
