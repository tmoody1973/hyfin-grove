/**
 * Home-screen icons from the Signal badge (app/icon.svg) on black (plan 15, task 1).
 * "any": the badge fills 84% of the square. "maskable": 64%, inside Android's safe circle (the inner 80%), so round
 * and squircle crops never clip it.
 *   pnpm tsx scripts/make-app-icons.ts
 */
import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("app/icon.svg");
mkdirSync("public/app", { recursive: true });

async function icon(size: number, share: number, out: string) {
  const inner = Math.round(size * share);
  const badge = await sharp(svg, { density: 600 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#000000" } })
    .composite([{ input: badge, gravity: "center" }])
    .png()
    .toFile(out);
  console.log(out);
}

await icon(192, 0.84, "public/app/icon-192.png");
await icon(512, 0.84, "public/app/icon-512.png");
await icon(512, 0.64, "public/app/icon-maskable-512.png");
