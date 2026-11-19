import { describe, expect, it } from "vitest";
import { profileFromHtml, profileLinks } from "@/lib/listen/staffPage";

describe("radiomilwaukee.org staff pages", () => {
  it("maps names to profile pages", () => {
    const html = '<a aria-label="Paula Lovo" href="https://radiomilwaukee.org/people/paula-lovo"></a><a aria-label="Kenny Perez" href="https://radiomilwaukee.org/people/kenny-perez">';
    expect(profileLinks(html).get("paula lovo")).toBe("https://radiomilwaukee.org/people/paula-lovo");
    expect(profileLinks(html).size).toBe(2);
  });
  it("reads the photo and the biography as plain text", () => {
    const html = `<meta property="og:image" content="https://npr.brightspotcdn.com/x.jpg?a=1&amp;b=2">
      <div class="AuthorPage-fullBiography-content RTB"><p><b>Hometown:</b> Milwaukee.</p><p><b>First concert:</b> &quot;Best of Both Worlds&quot;</p></div>`;
    expect(profileFromHtml(html)).toEqual({ photoUrl: "https://npr.brightspotcdn.com/x.jpg?a=1&b=2", bio: 'Hometown: Milwaukee.\nFirst concert: "Best of Both Worlds"' });
  });
  it("returns nulls when a page has neither", () => expect(profileFromHtml("<html></html>")).toEqual({ photoUrl: null, bio: null }));
});
