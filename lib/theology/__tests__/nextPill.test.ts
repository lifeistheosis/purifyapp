// Theology's Next is a finger's size (1.9).
//
// The pill that takes a reader on (the next part of a study, the next read,
// the next step of the path) was 42px tall, two under the app's floor of 44
// for anything pressed. The count of small targets could not see it: that
// test reads the scale's own heights (h-1 to h-10), and this one was written
// out in pixels. scripts/mock-check.mjs found it on a study's last part, on
// the export, where the control is measured.
//
// What a reader would notice if this broke: nothing to the eye, and a Next
// that is a little harder to press than every other control in the app.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const PILL = 'className="reader-lit tap-press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill bg-paper px-5 font-sans text-[14.5px] font-semibold text-night"';

describe("Theology's Next pill", () => {
  it("is 44px in the study's reader, for the next part and for what comes after the last", () => {
    expect(read("components/theology/StudyReader.tsx").split(PILL).length - 1).toBe(2);
  });

  it("is 44px at the end of a step of the path", () => {
    expect(read("components/theology/StepView.tsx").split(PILL).length - 1).toBe(1);
  });

  it("is written out under 44px nowhere in Theology", () => {
    const dir = path.join(ROOT, "components", "theology");
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
      const src = fs.readFileSync(path.join(dir, file), "utf8");
      // A pressed thing whose own height is given in pixels: none under 44, unless it carries the
      // 44px touch box that reaches past what it paints (.hit-44, app/globals.css).
      for (const m of src.matchAll(/reader-lit tap-press[^"]*\bh-\[(\d+)px\][^"]*/g)) {
        if (/\bhit-44\b/.test(m[0])) continue;
        expect(Number(m[1]), `${file}: ${m[0].slice(0, 60)}`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
