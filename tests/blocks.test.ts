import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Embed } from "@/blocks/Embed";
import { Audio } from "@/blocks/Audio";
import { EmbedBlock } from "@/components/story/EmbedBlock";

type FieldLike = { name?: string; validate?: (v: unknown) => true | string; hooks?: { beforeValidate?: Array<(a: unknown) => unknown> } };
const field = (fields: unknown[], name: string) => (fields as FieldLike[]).find((f) => f.name === name)!;

describe("Embed block config", () => {
  it("accepts allowlisted URLs and rejects others with a clear message", () => {
    const validate = field(Embed.fields, "url").validate!;
    expect(validate("https://youtu.be/abc12345678")).toBe(true);
    expect(validate("https://evil.example.com/x")).toMatch(/Not a supported embed/);
  });
  it("fills the provider from the URL", () => {
    const hook = field(Embed.fields, "provider").hooks!.beforeValidate![0];
    expect(hook({ siblingData: { url: "https://open.spotify.com/embed/track/x" } })).toBe("spotify");
  });
});

describe("Audio block config", () => {
  it("only accepts http(s) audio URLs", () => {
    const validate = field(Audio.fields, "url").validate!;
    expect(validate("https://traffic.megaphone.fm/x.mp3")).toBe(true);
    expect(validate("javascript:alert(1)")).toMatch(/http/);
  });
});

describe("EmbedBlock", () => {
  it("draws YouTube as a lazy, titled, privacy-friendly player", () => {
    const html = renderToStaticMarkup(EmbedBlock({ url: "https://www.youtube.com/embed/abc12345678", provider: "youtube", title: "Clip" }));
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/abc12345678"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('title="Clip"');
  });
  it("re-checks the allowlist when drawing: a stored bad URL never becomes an iframe", () => {
    const html = renderToStaticMarkup(EmbedBlock({ url: "https://evil.example.com/x", provider: "youtube", title: null }));
    expect(html).not.toContain("<iframe");
  });
  it("draws social posts as a link card, with no third-party script", () => {
    const html = renderToStaticMarkup(EmbedBlock({ url: "https://www.instagram.com/p/x/", provider: "instagram", title: null }));
    expect(html).toContain("View on Instagram");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<iframe");
  });
  it("gives audio players a fixed height", () => {
    const html = renderToStaticMarkup(EmbedBlock({ url: "https://widget.spreaker.com/player?episode_id=1", provider: "spreaker", title: "Ep" }));
    expect(html).toContain('height="200"');
  });
});
