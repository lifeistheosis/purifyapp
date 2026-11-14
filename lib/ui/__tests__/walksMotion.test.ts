// Every walk runs as a reader sees it, with motion on (the arbiter, 2026-11-13;
// cause 9 of the gate, Updates 18 Open 5).
//
// Eight feature walks (asked-again, faith-answers, learn, legal-sheet,
// plus-intro, plus-order, questions-top, reminders) asked the browser for
// reduced motion as each phone opened, and never said which motion they walked:
// on a phone the app keeps its motion whatever the OS says, so they walked a
// mixture (the parts that read the OS's own question went still, the rest
// moved), and nothing held the app's own verdict either (scripts/gate/
// motion.mjs, "Where they turned it off"). None of them tests the still path:
// the request was for steady stills. Now each opens its phone through openPhone
// with its motion named, "on" unless --reduced asks for the still path, pinned
// before the first page and asserted on every screen it reaches, and a screen
// walked otherwise fails the walk.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const WALKS = ["asked-again", "faith-answers", "learn", "legal-sheet", "plus-intro", "plus-order", "questions-top", "reminders"];

describe("the eight feature walks", () => {
  for (const name of WALKS) {
    it(`${name} walks with the app's motion on, pinned and asserted, and --reduced for the still path`, () => {
      const walk = read(`scripts/${name}-walk.mjs`);
      expect(walk).not.toMatch(/emulateMedia\(\{\s*reducedMotion/);
      expect(walk).toContain('const MOTION = process.argv.includes("--reduced") ? "reduce" : "on";');
      expect(walk).toMatch(/openPhone\(\{ motion: MOTION,/);
      expect(walk).toMatch(/process\.exit\(reportMotion\(MOTION\) \|\| (failed|failures\.length) \? 1 : 0\);/);
    });
  }
});

describe("a phone opened with its motion named", () => {
  const phone = read("scripts/mock-check.mjs");
  const motion = read("scripts/lib/motion.mjs");

  it("has it pinned before its first page and the browser asked accordingly", () => {
    expect(phone).toMatch(/\.\.\.\(m \? m\.motionOptions\(motion\) : \{\}\)/);
    expect(phone.indexOf("await m.pinMotion(ctx, motion)")).toBeLessThan(phone.indexOf("const page = await ctx.newPage();"));
  });

  it("has it asserted on every screen it reaches, and settled before its context closes", () => {
    expect(phone).toContain("if (m) m.watchMotion(page, motion);");
    expect(motion).toMatch(/page\.on\("framenavigated"/);
    expect(motion).toMatch(/ctx\.close = async/);
    expect(motion).toMatch(/assertMotion\(page, mode\)/);
  });

  it("opens as it always did when a walk names none", () => {
    expect(phone).toContain('const m = motion ? await import("./lib/motion.mjs") : null;');
  });
});
