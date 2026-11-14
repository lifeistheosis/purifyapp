// The ambience sheet's sounds held still while the volumes glide open and
// closed above them (Updates 28's walk, 2026-11-13: "The sea: takes Rain's
// place" moved its tile 7px and "Bell and stillness: stops" 9px, against the
// gate's limit of 4; scripts/gate/ambience-sheet.mjs).
//
// The sheet is drawn here as the export draws it at 390 by 844: a scroller
// that grows from the screen's foot to its limit (85dvh, 638px under the
// title bar) and then scrolls, the volumes above the sounds gliding on the
// house curve frame by frame, and the scroll kept in whole pixels and inside
// its range as a browser keeps it. Each frame the hold answers as the
// ResizeObserver does, and the sounds' place on the screen is read.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { holdAtEnd, type EndScroller } from "../holdAtEnd";

const LIMIT = 638; // the scroller's height at the sheet's limit
const ABOVE = 4; // pt-1 over the first part
const BELOW = 285 + 20; // the six tiles and pb-5: the part held, and what stands under it

/** The sheet's scroller, with the browser's rules for its scroll: whole pixels, inside its range. */
function sheet(rounding: (n: number) => number) {
  let parts = 0; // the height of what stands above the sounds
  let top = 0;
  const content = () => ABOVE + parts + BELOW;
  const range = () => Math.max(0, content() - Math.min(content(), LIMIT));
  const box: EndScroller = {
    get scrollHeight() {
      return content();
    },
    get clientHeight() {
      return Math.min(content(), LIMIT);
    },
    get scrollTop() {
      return top;
    },
    set scrollTop(v: number) {
      top = Math.min(range(), Math.max(0, rounding(v)));
    },
  };
  return {
    box,
    /** The parts above change size; the browser keeps the scroll inside its new range. */
    grow(to: number) {
      parts = to;
      top = Math.min(top, range());
    },
    /** Where the sounds stand, measured from the screen's foot (the panel stands on it). */
    sounds: () => -box.clientHeight + ABOVE + parts - top,
  };
}

/** A glide from one height to another on the house's ease-out, one height per frame (300ms at 60 a second). */
function glide(from: number, to: number, frames = 18): number[] {
  return Array.from({ length: frames }, (_, i) => from + (to - from) * (1 - (1 - (i + 1) / frames) ** 3));
}

/** Every move the sheet makes in the walk's order, as heights of what stands above the sounds. */
const WALK: [string, number[]][] = [
  ["Rain plays", glide(0, 266)],
  ["Bell joins Rain", glide(266, 383)],
  // The sea took Rain's place: the volumes folded while it loaded and opened again.
  ["The sea takes Rain's place", [...glide(383, 264, 7), ...glide(264, 383)]],
  ["Bell stops", glide(383, 266)],
  ["The sea stops", glide(266, 0)],
];

function walk(answer: (s: ReturnType<typeof sheet>) => () => void, rounding: (n: number) => number) {
  const s = sheet(rounding);
  const resized = answer(s);
  const moved: Record<string, number> = {};
  for (const [what, frames] of WALK) {
    const at = s.sounds();
    let most = 0;
    for (const h of frames) {
      s.grow(h);
      resized();
      most = Math.max(most, Math.abs(s.sounds() - at));
    }
    moved[what] = most;
  }
  return moved;
}

describe("the sounds held at the sheet's foot (lib/ui/holdAtEnd.ts)", () => {
  for (const [name, rounding] of [
    ["rounded", Math.round],
    ["cut down", Math.floor],
  ] as const) {
    it(`keeps them within a pixel on every frame of every glide, the scroll ${name} to whole pixels`, () => {
      const moved = walk((s) => holdAtEnd(s.box).resized, rounding);
      for (const [what, px] of Object.entries(moved)) expect(px, what).toBeLessThanOrEqual(1);
    });
  }

  it("lets the reader's own scroll stand: what they scrolled to keeps its distance from the foot", () => {
    const s = sheet(Math.round);
    const hold = holdAtEnd(s.box);
    s.grow(383);
    hold.resized();
    expect(s.box.scrollTop).toBe(ABOVE + 383 + BELOW - LIMIT); // at the foot
    s.box.scrollTop = 20; // the reader scrolls up, to the volume
    hold.scrolled();
    const at = s.sounds();
    // A sound's own volume opens above: the sheet, at its limit, scrolls by it.
    for (const h of glide(383, 440)) {
      s.grow(h);
      hold.resized();
      expect(Math.abs(s.sounds() - at)).toBeLessThanOrEqual(1);
    }
  });

  it("takes its own scroll for its own, not for the reader's", () => {
    const s = sheet(Math.round);
    const hold = holdAtEnd(s.box);
    s.grow(383);
    hold.resized();
    hold.scrolled(); // the scroll event of the hold's own move
    for (const h of glide(383, 400)) {
      s.grow(h);
      hold.resized();
    }
    expect(s.box.scrollHeight - s.box.clientHeight - s.box.scrollTop).toBeLessThanOrEqual(1);
  });

  it("is a measure that sees the fault: the first hold, which moved the scroll by each step, drifted past the gate's 4px", () => {
    // The hold until 2026-11-14 (components/player/AmbienceSheet.tsx), kept here as the witness.
    const first = (s: ReturnType<typeof sheet>) => {
      const offset = () => ABOVE + (s.sounds() + s.box.clientHeight - ABOVE + s.box.scrollTop);
      let at = offset();
      return () => {
        const now = offset();
        if (Math.abs(now - at) >= 1) s.box.scrollTop += now - at;
        at = offset();
      };
    };
    const moved = walk(first, Math.floor);
    expect(Math.max(...Object.values(moved))).toBeGreaterThan(4);
  });

  it("is the hold the ambience sheet uses", () => {
    const code = fs.readFileSync(path.join(__dirname, "..", "..", "..", "components/player/AmbienceSheet.tsx"), "utf8");
    expect(code).toContain('from "@/lib/ui/holdAtEnd"');
    expect(code).toMatch(/new ResizeObserver\(hold\.resized\)/);
    expect(code).toMatch(/addEventListener\("scroll", hold\.scrolled/);
  });
});
