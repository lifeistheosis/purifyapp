// Community offline: the feed's box did not move when the posts could not be
// reached (Updates 88 named it, Updates 91 proved it: a DIV from y 343 to 347,
// a layout shift of 0.0021). The feed's first state, the outline, is padded
// (`pt-3`); the card that took its place offline, or when the community is
// quiet, had a top margin (`mt-3`), and React keeps the same element for both.
// So the element moved down by its new margin, and the margin, meeting the
// box's own `mt-2` with nothing between them, collapsed through it into the
// larger: the box itself was drawn 12.75px under the sign-in instead of 8.5px
// (at a 17px root), and everything in it moved 4px. Padding the box instead
// was tried and measured: the box stood, and the card moved 12px inside it.
// So a state that takes the outline's place starts where the outline starts,
// with no top margin of its own. Fails on the code before the mend.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const src = fs.readFileSync(path.join(process.cwd(), "components/community/CommunityClient.tsx"), "utf8");
const at = src.indexOf("{result === undefined ? (\n                // The conversations feed is fetched on the device");
const states = src.slice(at, src.indexOf("\n            </div>", at));
/** The class of the first element a branch of the feed's states draws (after its comments). */
const firstOf = (branch: RegExp) => {
  const from = states.search(branch);
  if (from < 0) return null;
  return states.slice(from).match(/\n\s*<(?:div|p)\b[^>]*?className="([^"]*)"/)?.[1] ?? null;
};
const margins = (cls: string | null) => (cls ?? "").split(/\s+/).filter((c) => /^-?(m|my|mt)-/.test(c));

describe("the feed's states take the outline's place without moving", () => {
  it("finds the feed's states and the outline that comes first, padded", () => {
    expect(at).toBeGreaterThan(0);
    expect(firstOf(/result === undefined \? \(/)).toMatch(/\bpt-3\b/);
  });
  it("the card when the feed cannot be reached has no top margin of its own", () => {
    const card = firstOf(/result\.state === "error" \? \(/);
    expect(card).toMatch(/rounded-2xl/);
    expect(margins(card)).toEqual([]);
  });
  it("nor has the card when the community is quiet", () => {
    const card = firstOf(/result\.posts\.length === 0 \? \(/);
    expect(card).toMatch(/rounded-2xl/);
    expect(margins(card)).toEqual([]);
  });
});
