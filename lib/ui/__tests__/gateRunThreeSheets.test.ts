import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The pre-build gate's third run (Admin, 2026-11-11: the sheets, as a reader
 * with no Plus sees them), the two finds that fell to Updates 2 (the
 * arbiter, 16:09 UTC). The walk on the export measures the screens; this
 * holds each mend in the code, so the next edit to one of these files cannot
 * put its finding back before a walk is run. Each case fails on the code the
 * gate walked.
 *
 * What a reader would notice if this broke: in the About sheet of a council's
 * book, the council's name a finger can barely hit (142.5 by 21.7px, at
 * /councils/ancyra-314/the-twenty-five-canons/); in Pray with chant, the
 * switch "ask before prayers" with its knob outside its track in Arabic and
 * Urdu (placed by physical sides: 56 to 78px where its mirror is 20 to 42);
 * and, found in the same sheet on the walk of those two, a chant's name cut
 * to an ellipsis on a phone 320 wide ("The Prayer Rope Anthem").
 */

const ROOT = process.cwd();
/** The code without its comments, so a note is not read as the page. */
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("the About sheet of a council's book", () => {
  it("gives the council's name 44px to the finger, its words truncating inside it, its look kept", () => {
    const header = code("components/councils/CouncilBookHeader.tsx");
    // The link is the target (hit-44, never clipped); the words truncate inside it, underlined as before.
    expect(header).toMatch(/href=\{council\.href\}\s*data-byline=""\s*lang="en" dir="ltr"\s*className="group hit-44 min-w-0"\s*>/);
    expect(header).toContain(
      '<span className="block truncate underline decoration-paper/30 underline-offset-4 group-hover:decoration-paper">{author}</span>',
    );
    // The same as a Father's book does it.
    expect(code("components/reading/BookHeader.tsx")).toContain('className="hit-44 min-w-0 underline-offset-4 hover:underline"');
  });
});

describe("Pray with chant's switch", () => {
  it("places its knob from the start of its track and moves it toward the end, in Arabic and Urdu too", () => {
    const sheet = code("components/player/PrayWithChant.tsx");
    expect(sheet).toContain('"absolute start-0 top-0.5 h-5 w-5 rounded-full motion-safe:transition-transform"');
    expect(sheet).toContain(
      'ask ? "translate-x-[18px] bg-night rtl:-translate-x-[18px]" : "translate-x-0.5 bg-paper/80 rtl:-translate-x-0.5"',
    );
    // No knob placed by a physical side alone.
    expect(sheet).not.toMatch(/"absolute top-0\.5 h-5 w-5/);
  });

  it("says each chant's name whole in its list, wrapping on a phone 320 wide rather than cut", () => {
    const sheet = code("components/player/PrayWithChant.tsx");
    expect(sheet).toContain('<span className="block font-sans text-ui font-semibold leading-snug text-paper text-balance break-words">{title}</span>');
    expect(sheet).not.toMatch(/truncate[^"]*">\{title\}/);
  });
});
