import { slugField, type Access, type CollectionConfig, type Field, type Where } from "payload";
import { rmLocked } from "../lib/events/fieldAccess";
import { eventSlugify } from "../lib/events/slug";
import { EVENT_TYPES } from "../lib/events/types";
import { SITE_URL } from "../lib/seo";

const signedIn: Access = ({ req }) => Boolean(req.user);

/** The public sees published, unhidden events; signed-in staff see everything, drafts included. */
const PUBLIC: Where = { and: [{ _status: { equals: "published" } }, { hidden: { not_equals: true } }] };
const readEvents: Access = ({ req }) => (req.user ? true : PUBLIC);

const synced = (data: { source?: string } | undefined) => data?.source === "rm-playlist";

/** Sync-owned: rewritten by the rm-playlist concert sync, so read-only on synced events (plan 9, Global Constraints). */
const owned = (field: Field): Field => ({ ...field, access: { ...(("access" in field && field.access) || {}), update: rmLocked } }) as Field;

/**
 * Every event on the site (plan 9, decision 013): rm-playlist concerts synced every 15 minutes, and HYFIN's own
 * events added by staff. Past events stay, with a recap and photos; nothing is deleted by the sync.
 */
export const Events: CollectionConfig = {
  slug: "events",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "type", "startsAt", "source", "hidden"],
    listSearchableFields: ["title", "venue", "artist"],
    preview: (doc) => (doc?.slug ? `${SITE_URL}/events/${doc.slug as string}` : null),
    description: "Concerts sync in from the playlist every 15 minutes (their details are read-only). Add HYFIN's own events here.",
  },
  versions: { drafts: true },
  access: { read: readEvents, create: signedIn, update: signedIn, delete: signedIn },
  fields: [
    owned({ name: "title", type: "text", required: true }),
    // Payload's slugField(): builds the address on create, then leaves it alone unless an editor ticks "regenerate".
    slugField({
      slugify: eventSlugify,
      overrides: (row) => ({
        ...row,
        fields: row.fields.map((f) =>
          "name" in f && f.name === "slug" ? { ...f, access: { update: rmLocked }, admin: { ...f.admin, description: "The address: /events/<slug>." } } : f,
        ) as typeof row.fields,
      }),
    }),
    owned({ name: "type", type: "select", required: true, defaultValue: "hyfin-event", options: EVENT_TYPES.map((t) => ({ ...t })), admin: { position: "sidebar" } }),
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "staff",
      options: [
        { label: "Added by staff", value: "staff" },
        { label: "Playlist concert (synced)", value: "rm-playlist" },
      ],
      access: { update: () => false },
      admin: { position: "sidebar", readOnly: true },
    },
    { name: "externalId", type: "text", unique: true, index: true, admin: { position: "sidebar", readOnly: true, condition: (d) => synced(d) } },
    owned({ name: "startsAt", type: "date", required: true, admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } } }),
    { name: "endsAt", type: "date", admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } } },
    owned({ name: "dateOnly", type: "checkbox", defaultValue: false, admin: { position: "sidebar", description: "No set start time." } }),
    // Not "status": Payload names the drafts enum enum_events_status, and two fields would share it (migration failed 2026-11-20).
    owned({ name: "eventStatus", type: "select", defaultValue: "scheduled", options: ["scheduled", "cancelled", "postponed"].map((v) => ({ label: v[0].toUpperCase() + v.slice(1), value: v })), admin: { position: "sidebar" } }),
    { name: "featured", type: "checkbox", defaultValue: false, admin: { position: "sidebar", description: "Listed first on its day." } },
    { name: "hidden", type: "checkbox", defaultValue: false, admin: { position: "sidebar", description: "Keep off the site (synced concerts included)." } },
    owned({ name: "venue", type: "text" }),
    { name: "address", type: "text" },
    owned({ name: "city", type: "text" }),
    owned({ name: "metro", type: "text", admin: { condition: (d) => synced(d) } }),
    owned({ name: "ticketUrl", type: "text" }),
    { name: "priceText", type: "text", admin: { description: "e.g. \"Free\" or \"$15 advance, $20 door\"." } },
    { name: "image", type: "upload", relationTo: "media", admin: { description: "Replaces the synced concert image, if any." } },
    owned({ name: "imageUrl", type: "text", admin: { readOnly: true, condition: (d) => synced(d) } }),
    owned({ name: "artist", type: "text", admin: { condition: (d) => synced(d), description: "The act HYFIN plays." } }),
    owned({ name: "headliners", type: "text", hasMany: true, admin: { condition: (d) => synced(d) } }),
    owned({ name: "supports", type: "text", hasMany: true, admin: { condition: (d) => synced(d) } }),
    owned({ name: "playCount", type: "number", admin: { readOnly: true, condition: (d) => synced(d) } }),
    { name: "description", type: "richText" },
    { name: "recap", type: "richText", admin: { description: "Shown once the event has passed." } },
    { name: "gallery", type: "upload", relationTo: "media", hasMany: true, admin: { description: "Photos, shown with the recap." } },
    { name: "relatedPosts", type: "relationship", relationTo: "posts", hasMany: true },
  ],
};
