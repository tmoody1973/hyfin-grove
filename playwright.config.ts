import { defineConfig, devices } from "@playwright/test";

/**
 * Phone-app checks against a real deployment (plan 15, task 9). CI only builds and has no database, so these run in
 * the deploy smoke test (.github/workflows/smoke.yml) against each Vercel deployment:
 *   BASE_URL=https://hyfin-grove.vercel.app pnpm exec playwright test
 * Previews are behind Vercel login; e2e/phone-app.spec.ts gets past it with VERCEL_AUTOMATION_BYPASS_SECRET as a
 * deployment-only cookie. Never as extraHTTPHeaders: those go to every host the page calls (the stream, Convex, fonts).
 */

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "https://hyfin-grove.vercel.app",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    { name: "pixel", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
