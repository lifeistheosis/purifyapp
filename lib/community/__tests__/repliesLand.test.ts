// Community's replies land with the page going with them (1.9, Gate 2's fifth
// fault, 2026-11-14).
//
// "5 replies" on /community/, a new reader: the thread opened on grey rows
// and the page followed it (lib/ui/showOpened.ts); the replies came from the
// website and landed in a move of their own (lib/ui/inPageMove.ts), the card
// growing and the posts below gliding. The page cannot be scrolled a frame at
// a time under a move's picture, so it waited for the move to be over, and
// for that third of a second what opened ended at 1328px, under the bar at
// 761px, with the page still: the walk, judging once the page was still,
// judged it there.
//
// Mended: while the page follows the thread the reader opened, the replies'
// land moves the page too, in the same change (catchUpOpened, from a layout
// effect, before the change is pictured), and what stands over the card on
// the screen is named to glide up with it, so nothing above fades out at one
// place and in at another. Not followed (the reader has moved on), it lands
// as it did.
//
// What a reader would notice if this broke: replies that land under the tab
// bar while the page stands still under them.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { partsBefore } from "@/lib/ui/inPageMove";

const CLIENT = readFileSync(join(process.cwd(), "components", "community", "CommunityClient.tsx"), "utf8");

describe("the replies land with the page going with them", () => {
  it("followed, the land names what stands over the card, and moves the page in its own change", () => {
    expect(CLIENT).toMatch(/landing\.current = part !== null && isFollowingOpened\(part\);\s*movePage\(land, landing\.current \? \{ grows: \[card\], glides: \[\.\.\.partsBefore\(card\), \.\.\.partsAfter\(card\)\] \} : \{ grows: \[card\] \}\);/);
    // The page goes in the commit that lands them, inside the move (made at once instead, it follows a frame at a time).
    expect(CLIENT).toMatch(/useLayoutEffect\(\(\) => \{\s*if \(!landing\.current \|\| repliesState === "loading"\) return;\s*landing\.current = false;\s*const part = document\.getElementById\(`\$\{partsId\}-replies`\);[\s\S]{0,200}?if \(part && isMovingInPage\(\)\) catchUpOpened\(part\);/);
  });

  it("the part the page follows is the one the replies' control names", () => {
    expect(CLIENT).toMatch(/aria-expanded=\{open\}\s+aria-controls=\{`\$\{partsId\}-replies`\}/);
    expect(CLIENT).toContain("<div id={`${partsId}-replies`}");
  });
});

describe("what stands on the screen over a part that moves with the page", () => {
  type El = {
    tagName: string;
    top: number;
    height: number;
    position?: string;
    display?: string;
    name?: string;
    parentElement: El | null;
    previousElementSibling: El | null;
    getBoundingClientRect: () => { top: number; bottom: number; width: number; height: number };
  };
  const body = { tagName: "BODY" } as El;
  function el(top: number, height: number, parent: El, prev: El | null, more: Partial<El> = {}): El {
    const made: El = {
      tagName: "DIV",
      top,
      height,
      parentElement: parent,
      previousElementSibling: prev,
      getBoundingClientRect: () => ({ top: made.top, bottom: made.top + made.height, width: 360, height: made.height }),
      ...more,
    };
    return made;
  }

  afterEach(() => vi.unstubAllGlobals());

  it("each part over it on the screen, up to the page; never what is off the screen, fixed or stuck, an ancestor, or already named", () => {
    vi.stubGlobal("window", { innerHeight: 844 });
    vi.stubGlobal("document", { body });
    vi.stubGlobal("getComputedStyle", (e: El) => ({ display: e.display ?? "block", position: e.position ?? "static", viewTransitionName: e.name ?? "none" }));
    const main = el(0, 4000, body, null, { tagName: "MAIN" });
    const head = el(-300, 200, main, null); // the page's head, above the screen
    const feed = el(-100, 3000, main, head);
    const gone = el(-100, 80, feed, null); // a post above the screen
    const over = el(-20, 300, feed, gone); // a post half on the screen
    const bar = el(0, 56, feed, over, { position: "sticky" });
    const named = el(300, 40, feed, bar, { name: "in-page-glides-1" });
    const card = el(340, 500, feed, named);
    expect(partsBefore(card as unknown as Element)).toEqual([over]);
  });
});
