"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";
import { acceptNprDoc } from "@/lib/npr/accept";
import { searchNpr, type NprResult } from "@/lib/npr/search";
import { newNprPost, nprBylineNames, nprDocsById } from "@/lib/npr/sync";
import { CATEGORIES, type Category } from "@/lib/taxonomy";

/** A search result, with the HYFIN copy if there is one. */
export type PickerResult = NprResult & { postId: number | null };
export type FindResult = { ok: true; results: PickerResult[] } | { ok: false; message: string };
export type AddResult = { ok: true; postId: number; existed: boolean } | { ok: false; message: string };

const NPR_ID = /^[a-z0-9][a-z0-9-]{2,63}$/i;

/** Signed-in staff only: the admin page is behind login, but a server action can be called directly. */
async function staff() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  return user ? { payload, user } : null;
}

export async function findNpr(query: string): Promise<FindResult> {
  const s = await staff();
  if (!s) return { ok: false, message: "Your sign-in expired. Reload the page and sign in again." };
  const results = await searchNpr(String(query ?? "").slice(0, 300), { token: process.env.NPR_CDS_TOKEN });
  const ids = results.map((r) => r.id);
  const { docs } = ids.length
    ? await s.payload.find({ collection: "posts", where: { "cds.documentId": { in: ids } }, depth: 0, limit: ids.length, select: { cds: true } })
    : { docs: [] };
  const onHyfin = new Map(docs.map((d) => [d.cds?.documentId, d.id]));
  return { ok: true, results: results.map((r) => ({ ...r, postId: onHyfin.get(r.id) ?? null })) };
}

/**
 * Adds an NPR story to HYFIN as a picked copy in `category`. Already there as an automatic Race copy: it becomes picked
 * (so it never expires) and moves to `category`. Already picked: left as it is.
 */
export async function addNpr(id: string, category: string): Promise<AddResult> {
  const s = await staff();
  if (!s) return { ok: false, message: "Your sign-in expired. Reload the page and sign in again." };
  if (!NPR_ID.test(String(id)) || !(CATEGORIES as readonly string[]).includes(category)) return { ok: false, message: "That story or section isn't valid." };
  const token = process.env.NPR_CDS_TOKEN;
  if (!token) return { ok: false, message: "NPR isn't connected (NPR_CDS_TOKEN)." };
  const now = new Date();
  const picked = { origin: "picked" as const, pickedBy: s.user.id as number, pickedAt: now.toISOString() };

  const { docs: existing } = await s.payload.find({ collection: "posts", where: { "cds.documentId": { equals: id } }, depth: 0, limit: 1, select: { npr: true, source: true } });
  if (existing[0]) {
    const post = existing[0];
    if (post.source === "npr" && post.npr?.origin !== "picked") {
      await s.payload.update({ collection: "posts", id: post.id, data: { category: category as Category, npr: picked } as never });
    }
    return { ok: true, postId: post.id, existed: true };
  }

  try {
    const doc = (await nprDocsById([id], token)).get(id);
    const data = doc ? acceptNprDoc(doc, await nprBylineNames([doc], token)) : null;
    if (!data) return { ok: false, message: "NPR doesn't let HYFIN show this story (another station's, premium, or gone)." };
    const post = await s.payload.create({ collection: "posts", data: { ...newNprPost(data, now, { category: category as Category, origin: "picked", pickedBy: s.user.id as number }) } as never });
    return { ok: true, postId: post.id, existed: false };
  } catch (err) {
    s.payload.logger.error(`[add-from-npr] ${id}: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: "Couldn't add it. Try again in a minute." };
  }
}
