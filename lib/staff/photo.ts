/**
 * The quick-add form's optional event photo (Tarik, 2026-11-20). The browser shrinks it to 2,000 px JPEG first
 * (components/staff/shrinkPhoto.ts), so phone photos fit under Vercel's 4.5 MB request cap; this is the server's check.
 */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type Photo = { file: File; alt: string };

export function checkPhoto(file: File | null, alt: string): { ok: true; photo: Photo | null } | { ok: false; error: string } {
  if (!file || file.size === 0) return { ok: true, photo: null };
  if (!TYPES.has(file.type)) return { ok: false, error: "Use a JPEG, PNG or WebP photo." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "That photo is too big. Try a smaller one." };
  const description = alt.trim();
  if (!description) return { ok: false, error: "Describe the photo in a few words (for people who can't see it)." };
  return { ok: true, photo: { file, alt: description.slice(0, 200) } };
}
