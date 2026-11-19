import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { toBody, type CdsDocument } from "@/lib/cds/toPost";
import { CdsBody } from "@/components/story/CdsBody";

const MIX = "https://player-widget.mixcloud.com/widget/iframe/?26=1&amp;hide_cover=1&amp;feed=%2Frhythmlab%2Frlr-11626%2F";
const prof = (name: string) => [{ href: "/v1/profiles/document" }, { href: `/v1/profiles/${name}` }];
const docWith = (html: string): CdsDocument =>
  ({
    id: "g-s921-1",
    layout: [{ href: "#/assets/a1" }, { href: "#/assets/a2" }, { href: "#/assets/a3" }],
    assets: {
      a1: { id: "a1", profiles: prof("text"), text: "<p>Before</p>" },
      a2: { id: "a2", profiles: prof("html-block"), html },
      a3: { id: "a3", profiles: prof("text"), text: "<p>After</p>" },
    },
  }) as unknown as CdsDocument;

describe("CDS html blocks", () => {
  it("keeps an allowed player (Mixcloud) as an embed block, in order", () => {
    const blocks = toBody(docWith(`<iframe src="${MIX}" height="130" width="100%" title="Rhythm Lab"></iframe>`), undefined);
    expect(blocks.map((b) => b.kind)).toEqual(["html", "embed", "html"]);
    const e = blocks[1] as { kind: "embed"; provider: string; url: string };
    expect(e.provider).toBe("mixcloud");
    expect(e.url).toContain("https://player-widget.mixcloud.com/widget/iframe/");
    expect(e.url).toContain("hide_cover=1");
  });
  it("drops a block with a player that isn't on the allowed list, or a script", () => {
    expect(toBody(docWith('<iframe src="https://evil.example.com/x"></iframe>'), undefined).map((b) => b.kind)).toEqual(["html", "html"]);
    expect(toBody(docWith("<script>alert(1)</script>"), undefined).map((b) => b.kind)).toEqual(["html", "html"]);
  });
  it("CdsBody draws the player", () => {
    const html = renderToStaticMarkup(CdsBody({ blocks: toBody(docWith(`<iframe src="${MIX}"></iframe>`), undefined) }));
    expect(html).toContain("<iframe");
    expect(html).toContain("player-widget.mixcloud.com");
  });
});
