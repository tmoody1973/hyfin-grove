"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";
import { parseEventInput, valuesOf } from "@/lib/staff/eventInput";

export type AddEventState = { status: "idle" } | { status: "error"; message?: string; errors?: Record<string, string>; values?: Record<string, string> } | { status: "added"; title: string; href: string | null; published: boolean };

/**
 * Saves a staff event as the signed-in person (payload skill: Local API with a user needs overrideAccess: false,
 * so their permissions apply). Ticked "Publish now" → live; unticked → a draft for an admin to finish.
 */
export async function createEvent(_prev: AddEventState, form: FormData): Promise<AddEventState> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) return { status: "error", message: "Your sign-in expired. Sign in again to add the event.", values: valuesOf(form) };
  const parsed = parseEventInput(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, values: parsed.values };
  const { publish, ...data } = parsed.data;
  try {
    const doc = await payload.create({
      collection: "events",
      data: { ...data, source: "staff", _status: publish ? "published" : "draft" } as never,
      draft: !publish,
      user,
      overrideAccess: false,
    });
    const slug = (doc as { slug?: string | null }).slug;
    return { status: "added", title: data.title, href: publish && slug ? `/events/${slug}` : null, published: publish };
  } catch (err) {
    payload.logger.error(`[staff add-event] ${err instanceof Error ? err.message : String(err)}`);
    return { status: "error", message: "Couldn't save the event. Try again, or add it in the admin.", values: valuesOf(form) };
  }
}
