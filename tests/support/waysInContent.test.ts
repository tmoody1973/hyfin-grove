// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { WaysIn } from "@/components/support/WaysIn";
import { DEFAULT_SUPPORT, mergeSupport } from "@/lib/supportContent";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("WaysIn renders Admin → Support page", () => {
  it("shows staff's card text and prices, and registers their Funraise forms", async () => {
    const content = mergeSupport({
      member: { title: "Be a member now", perks: [{ text: "Tee and a tote" }] },
      plans: [{ tier: "member", price: "$12 / month", donateLabel: "Donate $12 monthly", formId: 50001, fallbackUrl: "https://funraise.org/give/Radio-Milwaukee/abc" }],
    });
    const host = document.body.appendChild(document.createElement("div"));
    const root = createRoot(host);
    await act(async () => root.render(createElement(PlayerProvider, null, createElement(WaysIn, { content }))));
    expect(host.textContent).toContain("Be a member now");
    expect(host.textContent).toContain("Tee and a tote");
    expect(host.textContent).toContain("$12/month");
    expect(host.querySelector("button[data-formid='50001']")).not.toBeNull();
    expect(host.querySelector("button[data-formid='45593']")).not.toBeNull(); // HYFIN100 kept its defaults
    // Funraise's queue is flat: push("create", { form }) adds "create" then the options object.
    const queued = (window as unknown as { funraise: unknown[] }).funraise;
    expect(queued.some((x) => !!x && typeof x === "object" && (x as { form?: number }).form === 50001)).toBe(true);
    expect(DEFAULT_SUPPORT.member.title).toBe("Become a member");
    await act(async () => root.unmount());
    host.remove();
  });
});
