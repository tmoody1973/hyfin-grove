import { randomBytes } from "node:crypto";
import { JSDOM } from "jsdom";
import { embedFromUrl, type Embed } from "../embeds";

/** Marker text left where an embed was; swapped for a block node after HTML → Lexical conversion. */
export const MARKER = "HYFIN-EMBED-";

export type FoundEmbed = { kind: "embed"; embed: Embed } | { kind: "audio"; url: string; title: string | null };

const TARGETS = "iframe, audio, blockquote.instagram-media, blockquote.twitter-tweet, blockquote.tiktok-embed";

/** The URL an element points at, per WordPress's markup for each kind of embed. */
function sourceOf(el: Element): string | null {
  if (el.tagName === "IFRAME") return el.getAttribute("src");
  if (el.tagName === "AUDIO") return el.getAttribute("src") ?? el.querySelector("source")?.getAttribute("src") ?? null;
  if (el.classList.contains("instagram-media")) {
    return el.getAttribute("data-instgrm-permalink") ?? el.querySelector('a[href*="instagram.com/"]')?.getAttribute("href") ?? null;
  }
  if (el.classList.contains("twitter-tweet")) {
    const links = [...el.querySelectorAll('a[href*="/status/"]')];
    return links.at(-1)?.getAttribute("href") ?? null;
  }
  if (el.classList.contains("tiktok-embed")) return el.getAttribute("cite");
  return null;
}

/**
 * Pull every embed out of WordPress HTML before rich-text conversion (which can't represent them).
 * Each becomes `<p>HYFIN-EMBED-n</p>` in its own paragraph; an embed sitting inside a paragraph or list
 * leaves that text in place and gets its marker right after. Off-allowlist iframes become a plain link.
 */
export function extractEmbeds(html: string): { html: string; embeds: FoundEmbed[] } {
  const doc = new JSDOM(`<body>${html}</body>`).window.document;
  doc.querySelectorAll("script").forEach((s) => s.remove());
  const embeds: FoundEmbed[] = [];

  for (const el of [...doc.querySelectorAll(TARGETS)]) {
    if (!el.isConnected) continue; // removed along with an earlier wrapper
    const src = sourceOf(el);
    const wrapper = el.closest("figure.wp-block-embed, figure.wp-block-audio") ?? el;

    let found: FoundEmbed | null = null;
    if (el.tagName === "AUDIO") {
      found = src && /^https?:\/\//.test(src) ? { kind: "audio", url: src, title: el.getAttribute("title") } : null;
    } else {
      const embed = src ? embedFromUrl(src, el.getAttribute("title")) : null;
      found = embed ? { kind: "embed", embed } : null;
    }

    const replacement = doc.createElement("p");
    if (found) {
      replacement.textContent = `${MARKER}${embeds.length}`;
      embeds.push(found);
    } else if (src) {
      const a = doc.createElement("a");
      a.href = src;
      a.textContent = src;
      replacement.appendChild(a);
    }

    // Inside a paragraph or list: keep the text, put the embed's paragraph right after that block.
    const host = wrapper.parentElement?.closest("p, li");
    if (host) {
      wrapper.remove();
      const after = host.tagName === "LI" ? host.closest("ul, ol") ?? host : host;
      if (replacement.hasChildNodes()) after.after(replacement);
    } else if (replacement.hasChildNodes()) {
      wrapper.replaceWith(replacement);
    } else {
      wrapper.remove();
    }
  }
  return { html: doc.body.innerHTML, embeds };
}

type Node = { type?: string; text?: string; children?: Node[]; [key: string]: unknown };

const textOf = (n: Node): string => (n.text ?? "") + (n.children ?? []).map(textOf).join("");

const blockFor = (e: FoundEmbed) => ({
  type: "block",
  version: 2,
  format: "",
  fields: {
    id: randomBytes(12).toString("hex"),
    blockName: "",
    ...(e.kind === "audio"
      ? { blockType: "audio", url: e.url, title: e.title }
      : { blockType: "embed", url: e.embed.url, provider: e.embed.provider, title: e.embed.title }),
  },
});

/** Replace each top-level marker paragraph with its Payload block node. Returns a new state. */
export function insertEmbedBlocks<T extends { root: { children: Node[] } }>(state: T, embeds: FoundEmbed[]): T {
  const pattern = new RegExp(`^${MARKER}(\\d+)$`);
  const children = state.root.children.map((node) => {
    const m = node.type === "paragraph" ? pattern.exec(textOf(node).trim()) : null;
    const found = m ? embeds[Number(m[1])] : undefined;
    return found ? blockFor(found) : node;
  });
  return { ...state, root: { ...state.root, children } };
}
