// No light rays (CLAUDE.md, the owner's word of 2026-11-08). A burst of
// separate beams behind a thing, a repeating conic gradient, is vibe-coded AI
// slop: he caught it behind the Pantocrator in the 1.8 promo's edit frames,
// then had the app's own two taken out (the Dome light banner and the gift
// box's opening). Light is a soft pool or nothing, everywhere the app draws.
// scripts/mock-check.mjs holds mockups to the same, and
// lib/marketing/__tests__/promoLooks.test.ts the promo.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const ROOTS = ["app", "components", "lib"];
const KINDS = /\.(css|tsx?|mjs)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) walk(file, out);
    else if (KINDS.test(name)) out.push(file);
  }
  return out;
}

describe("no light rays in the app", () => {
  const files = ROOTS.flatMap((r) => walk(path.join(ROOT, r)));

  it("reads the app's code", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("draws no repeating conic gradient anywhere", () => {
    const found = files.filter((f) => /repeating-conic-gradient/.test(readFileSync(f, "utf8"))).map((f) => path.relative(ROOT, f));
    expect(found).toEqual([]);
  });

  it("the Dome light banner is a soft light from above, keeping its id so a chosen banner stays chosen", () => {
    const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
    const dome = css.slice(css.indexOf(".banner-motion-rays::before {"), css.indexOf(".banner-motion-rays::after"));
    expect(dome).toContain("radial-gradient(closest-side");
    expect(dome).toContain("animation: bm-dome");
    expect(readFileSync(path.join(ROOT, "lib/profile/cosmetics.ts"), "utf8")).toContain('"rays"');
  });

  it("the gift box opens in its flood of light, embers and mandorla, with no ray layers", () => {
    const box = readFileSync(path.join(ROOT, "components/gifts/GiftBox.tsx"), "utf8");
    expect(box).toContain("gift-flood");
    expect(box).not.toMatch(/gift-rays|light\.rays/);
  });
});
