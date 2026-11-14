// A reader's profile, opened the first time (build 97 note 6). Measured on the
// export at 390x844 with the CPU slowed four times (scripts/profile-open-walk.mjs):
// Follow was drawn only once the viewer's standing came, about a second after
// the card, and pushed the menu 83px aside in one frame; a status line the
// feed did not know arrived at full strength and pushed Follow down a line.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { HOUSE_EASE, HOUSE_MS, ROW_OPENS, followShown, followingNow, openRow } from "@/lib/profile/openedFirst";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const viewer = read("components/community/profile/ProfileViewer.tsx");
const card = read("components/community/profile/ProfileCard.tsx");

describe("Follow stands from the card's first frame", () => {
  it("for a signed-in reader before the relation is read, never on their own card or signed out", () => {
    expect(followShown(true, false, null)).toBe(true);
    expect(followShown(true, false, { mine: false })).toBe(true);
    expect(followShown(true, true, null)).toBe(false);
    expect(followShown(true, false, { mine: true })).toBe(false);
    expect(followShown(false, false, null)).toBe(false);
  });

  it("a tap before the relation is kept over it; the relation draws it otherwise", () => {
    expect(followingNow(null, null)).toBe(false);
    expect(followingNow(null, { following: true })).toBe(true);
    expect(followingNow(true, null)).toBe(true);
    expect(followingNow(true, { following: false })).toBe(true);
    expect(followingNow(false, { following: true })).toBe(false);
  });

  it("the viewer draws Follow by that rule, not once the relation has come", () => {
    expect(viewer).toMatch(/followShown\(signedIn, mine, relation\) \? \(\s*<button[^>]*onClick=\{\(\) => void toggleFollow\(\)\}/);
    expect(viewer).not.toMatch(/relation && !relation\.mine \? \(\s*<button[^>]*toggleFollow/);
    // A tap answers while the standing is read: toggleFollow does not wait on it.
    const toggle = viewer.slice(viewer.indexOf("async function toggleFollow()"), viewer.indexOf("async function greet()"));
    expect(toggle).not.toMatch(/!relation/);
    expect(toggle).toMatch(/setChosen\(next\)/);
  });
});

describe("a status line the feed did not know opens instead of pushing", () => {
  it("opens from nothing on the house curve, words fading in, held backwards", () => {
    expect(HOUSE_EASE).toBe(read("app/globals.css").match(/--ease-house:\s*([^;]+);/)?.[1].trim());
    expect(`${HOUSE_MS}ms`).toBe(read("app/globals.css").match(/--duration-base:\s*([^;]+);/)?.[1].trim());
    const animate = vi.fn(() => ({}) as Animation);
    const el = { animate, ownerDocument: { documentElement: { dataset: {} }, defaultView: { matchMedia: () => ({ matches: false }) } } };
    openRow(el as unknown as HTMLElement);
    expect(animate).toHaveBeenCalledWith(ROW_OPENS, { duration: HOUSE_MS, easing: HOUSE_EASE, fill: "backwards" });
    expect(ROW_OPENS[0]).toEqual({ gridTemplateRows: "0fr", opacity: 0 });
  });

  it("with motion off it is simply there", () => {
    const animate = vi.fn();
    const still = { animate, ownerDocument: { documentElement: { dataset: { motion: "reduce" } }, defaultView: { matchMedia: () => ({ matches: false }) } } };
    expect(openRow(still as unknown as HTMLElement)).toBeNull();
    const asked = { animate, ownerDocument: { documentElement: { dataset: {} }, defaultView: { matchMedia: () => ({ matches: true }) } } };
    expect(openRow(asked as unknown as HTMLElement)).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });

  it("the face wraps a late status in the opening row; the viewer says when it is late", () => {
    expect(card).toMatch(/<ArrivingRow arrives=\{statusArrives\}>/);
    expect(card).toMatch(/<div ref=\{openRowOnMount\} data-opening-row className="grid[^"]*">\s*<div className="min-h-0 overflow-hidden/);
    expect(card).toMatch(/const openRowOnMount = \(el: HTMLDivElement \| null\) => \{\s*openRow\(el\);\s*\};/);
    expect(viewer).toMatch(/statusArrives=\{statusLate\}/);
    expect(viewer).toMatch(/setStatusLate\(!cached && Boolean\(seed\) && !seed\?\.status\)/);
  });
});
