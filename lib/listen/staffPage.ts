/**
 * Host photos and bios from radiomilwaukee.org staff pages (Tarik, 2026-11-19). Uses jsdom: seed script
 * only, never the live server bundle.
 */
import { JSDOM } from "jsdom";
import { normalizeName } from "./attach";

/** normalized name → profile URL, from https://radiomilwaukee.org/radio-milwaukee-staff */
export function profileLinks(html: string): Map<string, string> {
  const doc = new JSDOM(html).window.document;
  const links = [...doc.querySelectorAll<HTMLAnchorElement>('a[aria-label][href*="/people/"]')];
  return new Map(links.map((a) => [normalizeName(a.getAttribute("aria-label") ?? ""), a.href]));
}

export function profileFromHtml(html: string): { photoUrl: string | null; bio: string | null } {
  const doc = new JSDOM(html).window.document;
  const photoUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;
  const paragraphs = [...doc.querySelectorAll(".AuthorPage-fullBiography-content p")].map((p) => p.textContent?.replace(/\s+/g, " ").trim() ?? "");
  const bio = paragraphs.filter(Boolean).join("\n") || null;
  return { photoUrl, bio };
}
