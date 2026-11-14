// A reader's profile, opened the first time (build 97 note 6). Measured on the
// export at 390x844 with the CPU slowed four times (scripts/profile-open-walk.mjs):
// Follow was drawn only once the viewer's standing came, about a second after
// the card, and pushed the menu 83px aside in one frame; a status line the
// feed did not know arrived at full strength and pushed Follow down a line.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { HOUSE_EASE, HOUSE_MS, ROW_OPENS, followShown, followingNow, openRow, statusWay } from "@/lib/profile/openedFirst";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const viewer = read("components/community/profile/ProfileViewer.tsx");
const card = read("components/community/profile/ProfileCard.tsx");
const feed = read("components/community/CommunityClient.tsx");
const walk = read("scripts/profile-open-walk.mjs");

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
    expect(card).toMatch(/<ArrivingRow arrives=\{statusArrives \|\| statusHeld\} held=\{statusHeld\}>/);
    expect(card).toMatch(/<div ref=\{openRowOnMount\} data-opening-row data-profile-status className=\{cn\("grid[^"]*"[^}]*\)\}>\s*<div className="min-h-0 overflow-hidden/);
    expect(card).toMatch(/const openRowOnMount = \(el: HTMLDivElement \| null\) => \{\s*openRow\(el\);\s*\};/);
    expect(viewer).toMatch(/statusArrives=\{statusLate\}/);
    expect(viewer).toMatch(/setStatusLate\(way === "late"\)/);
  });
});

// The second mend (Updates 66), measured on the export of cdb67306a: the main
// web's feed sent no author_status (0 of 50 posts), so every status came about
// a second after the card and opened on the curve, pushing Follow, the menu and
// the doors 5 to 11px a frame (30px in one frame with motion off); the card
// grew 240px in one frame with motion off; and the walk read the status's
// opening row as the @handle, a 141 to 153px "move" that was never on screen.
describe("a status the feed's server did not say keeps its place", () => {
  it("held when the seed's server did not say, late when it said none, known otherwise", () => {
    expect(statusWay({ status: undefined }, false)).toBe("held");
    expect(statusWay({}, false)).toBe("held");
    expect(statusWay({ status: null }, false)).toBe("late");
    expect(statusWay({ status: "Lord, have mercy" }, false)).toBe("known");
    expect(statusWay({ status: undefined }, true)).toBe("known");
    expect(statusWay(null, false)).toBe("known");
  });

  it("the feed hands the card 'did not say' as it came, not as none", () => {
    expect(feed).toMatch(/status: post\.author_status,/);
    expect(feed).toMatch(/status: r\.author_status,/);
    expect(feed).not.toMatch(/author_status \?\? null/);
  });

  it("the viewer holds the place by that rule for the opening", () => {
    expect(viewer).toMatch(/const way = statusWay\(seed, Boolean\(cached\)\);/);
    expect(viewer).toMatch(/setStatusHeld\(way === "held"\)/);
    expect(viewer).toMatch(/statusHeld=\{statusHeld\}/);
  });

  it("the face keeps one line's place, empty or with the line opening inside it", () => {
    expect(card).toMatch(/\{profile\.status \|\| statusHeld \? \(\s*<ArrivingRow arrives=\{statusArrives \|\| statusHeld\} held=\{statusHeld\}>/);
    expect(card).toMatch(/if \(held && !children\) return <div data-profile-status aria-hidden className="min-h-\[30px\] w-full" \/>;/);
    expect(card).toMatch(/data-opening-row data-profile-status className=\{cn\("grid w-full justify-items-center", held && "min-h-\[30px\]"\)\}/);
    // The place is one status line and the space above it: 9px, then 15.5px at 1.35.
    const size = Number(card.match(/compact \? "text-detail" : "text-\[([\d.]+)px\]",\s*statusArrives \|\| statusHeld/)?.[1]);
    const leading = Number(card.match(/font-serif italic leading-\[([\d.]+)\]/)?.[1]);
    const above = Number(card.match(/overflow-hidden pt-\[(\d+)px\]/)?.[1]);
    expect(above + size * leading).toBeGreaterThan(29.5);
    expect(above + size * leading).toBeLessThanOrEqual(30);
  });
});

describe("with motion off the card stands at its full height from the first frame", () => {
  it("on a phone its least height is its most, so the profile coming never changes it", () => {
    const panel = viewer.match(/data-profile-card\s+className=\{cn\(\s*"([^"]+)"/)?.[1] ?? "";
    expect(panel).toContain("max-h-[92dvh]");
    expect(panel).toContain("motion-reduce:min-h-[92dvh]");
    expect(panel).toContain("md:motion-reduce:min-h-0");
  });
});

describe("the open walk reads each row of the face as what it is", () => {
  it("names the status by its mark (or its italic on the main web), and two rows never share a name", () => {
    expect(walk).toMatch(/const isStatus = \(el\) => el\.hasAttribute\("data-profile-status"\) \|\| el\.classList\.contains\("italic"\);/);
    expect(walk).toMatch(/add\(parts\[key\] \? `\$\{key\}#\$\{i\}` : key, el\);/);
    expect(walk).not.toMatch(/el\.classList\.contains\("italic"\) \? "status" : "handle"/);
  });
});
