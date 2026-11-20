"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";
import { parseEventInput, valuesOf } from "@/lib/staff/eventInput";
import { checkPhoto } from "@/lib/staff/photo";

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
  const photo = checkPhoto(form.get("photo") instanceof File ? (form.get("photo") as File) : null, String(form.get("photoAlt") ?? ""));
  if (!parsed.ok || !photo.ok) {
    const errors = { ...(parsed.ok ? {} : parsed.errors), ...(photo.ok ? {} : { photo: `${photo.error} (Choose the photo again.)` }) };
    return { status: "error", errors, values: valuesOf(form) };
  }
  const { publish, ...data } = parsed.data;
  let imageId: number | undefined;
  try {
    if (photo.photo) {
      const { file, alt } = photo.photo;
      const media = await payload.create({
        collection: "media",
        data: { alt },
        file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name, size: file.size },
        user,
        overrideAccess: false,
      });
      imageId = media.id;
    }
    const doc = await payload.create({
      collection: "events",
      data: { ...data, ...(imageId ? { image: imageId } : {}), source: "staff", _status: publish ? "published" : "draft" } as never,
      draft: !publish,
      user,
      overrideAccess: false,
    });
    const slug = (doc as { slug?: string | null }).slug;
    return { status: "added", title: data.title, href: publish && slug ? `/events/${slug}` : null, published: publish };
  } catch (err) {
    payload.logger.error(`[staff add-event] ${err instanceof Error ? err.message : String(err)}`);
    // Don't leave an orphan photo behind when the event itself failed to save.
    if (imageId) await payload.delete({ collection: "media", id: imageId }).catch(() => undefined);
    return { status: "error", message: "Couldn't save the event. Try again, or add it in the admin.", values: valuesOf(form) };
  }
}
