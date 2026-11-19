import { describe, expect, it } from "vitest";
import { authorNameFromHtml } from "@/lib/wordpress/authorName";

describe("authorNameFromHtml", () => {
  it("reads the author meta tag hyfin.org pages carry", () =>
    expect(authorNameFromHtml('<head><meta name="author" content="Anthony Foster" /></head>')).toBe("Anthony Foster"));
  it("decodes entities", () => expect(authorNameFromHtml('<meta name="author" content="Ren&eacute;e O&#039;Neil">')).toBe("Renée O'Neil"));
  it("returns null when the page has none", () => expect(authorNameFromHtml("<head></head>")).toBeNull());
});
