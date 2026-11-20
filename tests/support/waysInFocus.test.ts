// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { WaysIn } from "@/components/support/WaysIn";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("WaysIn keyboard focus", () => {
  let host: HTMLDivElement;
  afterEach(() => host.remove());

  it("'Back' puts focus on the Three ways in heading, not the page body", async () => {
    host = document.body.appendChild(document.createElement("div"));
    const root = createRoot(host);
    await act(async () => root.render(createElement(PlayerProvider, null, createElement(WaysIn, { initial: { step: "checkout", plan: "member-monthly" } }))));
    const back = Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.startsWith("Back"));
    await act(async () => back!.click());
    expect(document.activeElement?.id).toBe("ways-in-heading");
    await act(async () => root.unmount());
  });
});
