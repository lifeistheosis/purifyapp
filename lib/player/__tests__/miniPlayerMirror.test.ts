import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The mini player turns round in Arabic (found 2026-11-11 while checking Now
 * Playing for the arbiter's 15:37 ask): its card was padded by left and right
 * (`pl-2 pr-1.5`) and its open button set its words to the left
 * (`text-left`), so in Arabic the card's two paddings changed sides and the
 * name stayed set to the left while everything round it turned. Both are
 * start and end now, as the rest of the player is, and its play marks are
 * drawn centred instead of nudged a pixel right.
 *
 * This reads the bar's source for any class placed by a physical side. The
 * pill drawn in is centred (`left-1/2` with `-translate-x-1/2`), which is the
 * same in both directions, and is the one placement allowed by name.
 *
 * What it cannot see: the bar on a screen. The export walk measures it in
 * Arabic (the card's padding at its start and end, the name's alignment).
 *
 * What would go wrong if this broke: in Arabic the playing track's name sits
 * against the wrong side of its card, and the card's edges are uneven the
 * wrong way round.
 */

const ROOT = process.cwd();
const FILE = "components/prayers/NowPlayingBar.tsx";

/** The code without its comments, so a note that names a class is no class. */
const code = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** A whole class placed by a physical side, as a token: `rounded-lg` is no `rounded-l`. */
const PHYSICAL =
  /(?<![\w-])(-?(?:text-(?:left|right)|[mp][lr]-[^\s"'`]+|(?:left|right)-[^\s"'`]+|rounded-[lr](?:-[^\s"'`]+)?|border-[lr](?:-[^\s"'`]+)?|origin-(?:left|right)|scroll-[mp][lr]-[^\s"'`]+))(?=[\s"'`]|$)/g;

/** Each physical class, with the line it stands on. */
function physical(src: string): { cls: string; line: string }[] {
  const out: { cls: string; line: string }[] = [];
  for (const line of code(src).split("\n")) {
    for (const m of line.matchAll(PHYSICAL)) out.push({ cls: m[1], line: line.trim().slice(0, 120) });
  }
  return out;
}

describe("the mini player in Arabic", () => {
  const src = fs.readFileSync(path.join(ROOT, FILE), "utf8").replace(/\r\n/g, "\n");

  it("places nothing by left or right, but the pill centred the same in both directions", () => {
    const found = physical(src).filter((f) => !(f.cls === "left-1/2" && f.line.includes("-translate-x-1/2")));
    expect(found).toEqual([]);
  });

  it("pads its card at its start and end, and sets the track's name from its start", () => {
    expect(src).toMatch(/className="mini-player-card [^"]*\bps-2 pe-1\.5\b/);
    expect(src).toMatch(/onClick=\{\(\) => openNowPlaying\(\)\}[\s\S]{0,120}className="tap-press flex min-w-0 flex-1 items-center gap-3 text-start"/);
  });

  it("draws its play marks centred, with no nudge that Arabic would read as a side", () => {
    // A play mark points right in every language, as media controls do, so it
    // is not turned round; its old pixel's nudge right stayed right in Arabic
    // and checkMock measured the mark 2px off its mirror (build 89 drew the
    // reader's dock the same way: components/ui/icons/Play.tsx, `centered`).
    expect(code(src)).not.toMatch(/<Play\b[^>]*translate-x/);
    expect(code(src).match(/<Play size=\{(?:22|16)\} centered \/>/g)).toHaveLength(2);
  });

  it("reads a class placed by a side, and passes one placed by start or end: the reading is not broken", () => {
    const sample = [
      'className="text-left pl-2 pr-1.5 -ml-2 right-3 rounded-l-xl border-r md:pl-4"',
      'className="text-start ps-2 pe-1.5 -ms-2 end-3 rounded-s-xl rounded-lg border-e"',
      "// pl-2 in a note is no class",
    ].join("\n");
    expect(physical(sample).map((f) => f.cls)).toEqual(["text-left", "pl-2", "pr-1.5", "-ml-2", "right-3", "rounded-l-xl", "border-r", "pl-4"]);
  });
});
