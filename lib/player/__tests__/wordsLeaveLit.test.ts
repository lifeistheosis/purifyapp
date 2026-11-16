// Now Playing's words leave as they stand (Updates 98o, build 98 note 8).
//
// The clock that lights the words (lib/player/clock.ts, useSungLines) ran only
// while the player was open, so the close's tap stopped it: the line being read
// went to -1, every line to rest, a long text's words a span moved from the
// line being read to the top, and in the frame the slide began the words stood
// up to 185px higher (on the export of 54a5ee59, the Four Discourses at 390,
// scripts/gate/listen-walk.mjs --only work --words: "span 'that' jumped 185px",
// five words moving up at once, the words box's scroll from 441 to 277 and the
// light gone, two frames before the panel moved). It had been read as the
// frame judge pairing two different words.
//
// Now the clock runs on until the slide has ended, out of sight, and stops at
// once with Purify's motion off (there is no slide).
//
// What a reader would notice if this broke: the words jumping and their light
// going out as Now Playing is closed from the Words view.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHEET = fs.readFileSync(path.join(ROOT, "components/player/NowPlayingSheet.tsx"), "utf8");

describe("Now Playing's words leave as they stand", () => {
  it("does not stop the clock that lights the words at the close's tap", () => {
    expect(SHEET).not.toMatch(/useSungLines\(audio\.captions, audio\.duration, open && hasWords\)/);
    expect(SHEET).toMatch(/useSungLines\(audio\.captions, audio\.duration, clockOpen && hasWords\)/);
  });

  it("runs it at once as the player opens, and on until its slide down has ended", () => {
    // On in the very render the player opens in, so nothing waits a frame.
    expect(SHEET).toContain("const [clockOpen, setClockOpen] = useState(open);");
    expect(SHEET).toContain("if (open && !clockOpen) setClockOpen(true);");
    // Off only after the slide (380ms and a frame's margin); at once with Purify's motion off.
    expect(SHEET).toContain("const SLIDE_MS = 380;");
    expect(SHEET).toMatch(/if \(open \|\| !clockOpen\) return;\s*const id = window\.setTimeout\(\(\) => setClockOpen\(false\), still\(\) \? 0 : SLIDE_MS \+ 60\);\s*return \(\) => window\.clearTimeout\(id\);/);
    // And the slide is that long.
    expect(SHEET).toContain("transition-transform duration-[380ms] ease-[var(--ease-house)]");
  });
});
