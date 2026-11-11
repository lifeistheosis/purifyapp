// A tap meant for the page is the page's (1.9, build 93 note 8; the owner, in
// the journal, which the 1.9 tour's first stop lights: "when I click title or
// anything, so just a quick explanation of how it works ... Honestly, just
// buggy"). The tour drew blockers round and over the lit thing on every stop,
// so a tap on the journal's Title met the tour's words and nothing else. What
// a reader would notice if this broke: a tap on a field under the tour that
// does nothing, or a field that takes the tap and then loses it, with the
// keyboard, as the tour goes.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { tourFor } from "@/lib/whatsNew/tour";
import { tapBlockers, tapEndsTour } from "@/lib/whatsNew/tourDom";

const layer = fs.readFileSync(path.join(process.cwd(), "components/whats-new/tour/TourLayer.tsx"), "utf8");

describe("a tap while the tour shows a stop", () => {
  it("ends the tour when it was meant for the page, the lit thing too, and not when it is the tour's or a try", () => {
    // The page round the lit thing, and the lit thing on a stop that only shows it.
    expect(tapEndsTour({ inTour: false, tryIt: false, inLit: false })).toBe(true);
    expect(tapEndsTour({ inTour: false, tryIt: false, inLit: true })).toBe(true);
    // Round the lit thing on a stop that asks for a try: the reader has gone back to the page.
    expect(tapEndsTour({ inTour: false, tryIt: true, inLit: false })).toBe(true);
    // The try itself.
    expect(tapEndsTour({ inTour: false, tryIt: true, inLit: true })).toBe(false);
    // Next, Back, Skip.
    expect(tapEndsTour({ inTour: true, tryIt: false, inLit: false })).toBe(false);
  });

  it("finds nothing of the tour in its way: no blockers on a stop, only under the close's night", () => {
    expect(layer).toContain('const blockers = state.phase === "end" ? tapBlockers(false) : [];');
    expect(layer).not.toMatch(/tapBlockers\(tryIt\)/);
    // What the close keeps is the whole screen, as before.
    expect(tapBlockers(false).map((b) => b.name)).toEqual(["above", "below", "before", "after", "over"]);
  });

  it("is heard as the finger comes down, before the page acts on it, and left to go on to the page", () => {
    const effect = /useEffect\(\(\) => \{\s*if \(!onAStop\) return;([\s\S]*?)\}, \[onAStop, leave\]\);/.exec(layer)?.[1] ?? "";
    expect(effect, "the tap's listener").not.toBe("");
    expect(effect).toContain('document.addEventListener("pointerdown", onDown, true);');
    expect(effect).toMatch(/if \(tapEndsTour\(\{ inTour, tryIt: Boolean\(s\.found && step\?\.tryIt\), inLit: Boolean\(lit\?\.contains\(target\)\) \}\)\) leave\(\);/);
    // Never stopped or held back: the page has it as any tap.
    expect(effect).not.toMatch(/preventDefault|stopPropagation|stopImmediatePropagation/);
  });

  it("leaves a field the reader tapped with its focus as the tour goes", () => {
    expect(layer).toMatch(/const onThePage = now instanceof HTMLElement && now !== document\.body && !root\?\.contains\(now\);\s*if \(back\?\.isConnected && !onThePage\) back\.focus\(\{ preventScroll: true \}\);/);
  });

  it("holds on every stop of the 1.9 tour, none of which asks for a try", () => {
    const steps = tourFor("1.9")?.steps ?? [];
    expect(steps.map((s) => s.id)).toEqual(["journal", "verse", "bibles", "plans", "creed", "history"]);
    for (const s of steps) {
      expect(s.tryIt, s.id).toBeFalsy();
      expect(tapEndsTour({ inTour: false, tryIt: Boolean(s.tryIt), inLit: true }), s.id).toBe(true);
    }
  });
});
