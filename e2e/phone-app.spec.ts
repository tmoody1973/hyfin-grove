import { expect, test } from "@playwright/test";

/** The phone app shell (plan 15). Phones: iPhone 13 and Pixel 7 projects. Desktop: the shell must not show. */
const phone = (name: string) => name !== "desktop";

// Vercel preview protection: one visit with the secret in the address sets a cookie for this deployment only, so the
// secret never travels to the other hosts the page calls (the stream, Convex, fonts).
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const ownHeaders = bypass ? { "x-vercel-protection-bypass": bypass } : undefined;
test.beforeEach(async ({ page }) => {
  if (bypass) await page.goto(`/?x-vercel-protection-bypass=${encodeURIComponent(bypass)}&x-vercel-set-bypass-cookie=true`);
});

test.describe("phone app shell", () => {
  test.beforeEach(({}, info) => test.skip(!phone(info.project.name), "phones only"));

  test("the tab bar changes screens and marks the current tab", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("navigation", { name: "App sections" });
    await expect(tabs.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: "Listen" }).click();
    await expect(page).toHaveURL(/\/listen\/playlist$/);
    await expect(tabs.getByRole("link", { name: "Listen" })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: "Stories" }).click();
    await expect(page).toHaveURL(/\/stories$/);
    await expect(page.getByRole("heading", { level: 1, name: "Stories" })).toBeVisible();
  });

  test("More opens a sheet that keeps focus, and Escape closes it", async ({ page }) => {
    await page.goto("/");
    const more = page.getByRole("navigation", { name: "App sections" }).getByRole("button", { name: "More" });
    await more.click();
    const sheet = page.getByRole("dialog", { name: "More" });
    await expect(sheet.getByRole("link", { name: "Music" })).toBeFocused({ timeout: 10_000 });
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await expect(more).toBeFocused();
  });

  test("Latest swipes, with the mockup's hint", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Swipe · \d+ stories/)).toBeVisible();
  });

  test("the live player keeps playing across tabs", async ({ page }, info) => {
    test.skip(info.project.name === "iphone", "WebKit in CI can't decode the live stream");
    await page.goto("/");
    await page.locator('[aria-label="Now playing"]').getByRole("button").first().click();
    await expect.poll(() => page.evaluate(() => !document.querySelector("audio")!.paused), { timeout: 20_000 }).toBe(true);
    await page.getByRole("navigation", { name: "App sections" }).getByRole("link", { name: "Milwaukee" }).click();
    await expect(page).toHaveURL(/\/milwaukee$/);
    expect(await page.evaluate(() => !document.querySelector("audio")!.paused)).toBe(true);
  });
});

test.describe("installable app", () => {
  test("the manifest says full-screen HYFIN", async ({ request }) => {
    const m = await (await request.get("/manifest.webmanifest", { headers: ownHeaders })).json();
    expect(m).toMatchObject({ name: "HYFIN", display: "standalone", start_url: "/?source=pwa" });
  });
  test("the service worker is never cached by the browser, and the offline screen is served", async ({ request }) => {
    const sw = await request.get("/sw.js", { headers: ownHeaders });
    expect(sw.headers()["cache-control"]).toContain("no-store");
    expect((await request.get("/offline.html", { headers: ownHeaders })).status()).toBe(200);
  });
});

test("desktop shows no phone shell", async ({ page }, info) => {
  test.skip(phone(info.project.name), "desktop only");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "App sections" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});
