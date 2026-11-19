import { describe, expect, it, vi } from "vitest";
import { createPreviewPlayer } from "@/lib/listen/previewPlayer";

function fakeAudio() {
  const listeners = new Map<string, Array<() => void>>();
  const audio = {
    src: "",
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    addEventListener: (type: string, fn: () => void) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
  };
  return audio;
}

describe("preview player", () => {
  it("plays one 30-second clip and reports its state", async () => {
    const audio = fakeAudio();
    const p = createPreviewPlayer(() => audio);
    await p.play("song-a", "https://audio/a.m4a");
    expect(audio.src).toBe("https://audio/a.m4a");
    expect(p.get()).toEqual({ kind: "loading", id: "song-a" });
    audio.fire("playing");
    expect(p.get()).toEqual({ kind: "playing", id: "song-a" });
  });
  it("resumes the live stream exactly once when the clip ends", async () => {
    const audio = fakeAudio();
    const resume = vi.fn();
    const p = createPreviewPlayer(() => audio);
    await p.play("song-a", "https://audio/a.m4a", resume);
    audio.fire("ended");
    audio.fire("ended");
    expect(p.get()).toEqual({ kind: "idle" });
    expect(resume).toHaveBeenCalledTimes(1);
  });
  it("switching clips doesn't resume the stream in between; stopping does", async () => {
    const audio = fakeAudio();
    const resume = vi.fn();
    const p = createPreviewPlayer(() => audio);
    await p.play("song-a", "https://audio/a.m4a", resume);
    await p.play("song-b", "https://audio/b.m4a");
    expect(resume).not.toHaveBeenCalled();
    expect(audio.src).toBe("https://audio/b.m4a");
    p.stop();
    expect(resume).toHaveBeenCalledTimes(1);
    expect(audio.pause).toHaveBeenCalled();
  });
  it("a clip that fails to load shows an error and still gives the stream back", async () => {
    const audio = fakeAudio();
    const resume = vi.fn();
    const p = createPreviewPlayer(() => audio);
    await p.play("song-a", "https://audio/a.m4a", resume);
    audio.fire("error");
    expect(p.get()).toEqual({ kind: "error", id: "song-a" });
    expect(resume).toHaveBeenCalledTimes(1);
  });
  it("tells subscribers about every change", async () => {
    const audio = fakeAudio();
    const p = createPreviewPlayer(() => audio);
    const seen: string[] = [];
    p.subscribe((s) => seen.push(s.kind));
    await p.play("song-a", "https://audio/a.m4a");
    audio.fire("playing");
    p.stop();
    expect(seen).toEqual(["loading", "playing", "idle"]);
  });
});
