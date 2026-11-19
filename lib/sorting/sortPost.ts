import { JSDOM } from "jsdom";
import type { PostDraft } from "../wordpress/types";
import { BODY_CHARS } from "./questions";

export * from "./questions";

export function sortStateFor(draft: Pick<PostDraft, "title" | "excerpt" | "bodyHtml">): string {
  const body = JSDOM.fragment(`<div>${draft.bodyHtml}</div>`).textContent?.replace(/\s+/g, " ").trim() ?? "";
  return `Title: ${draft.title}\nSummary: ${draft.excerpt}\nArticle: ${body.slice(0, BODY_CHARS)}`;
}
