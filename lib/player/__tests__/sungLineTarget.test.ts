// Now Playing on a phone (components/player/NowPlayingSheet.tsx), from the
// gate's third run on /chants/, Play (the arbiter's word of 2026-11-11,
// 15:37 UTC):
//  - a verse of one line was a button 33.6px tall (24px at 1.4), under 44 to
//    a finger. The gap between lines moves inside each line, so every line is
//    44 or more to a finger while the words stand exactly as far apart as
//    round 8 B drew them, 20px, with a strip between that no line's target
//    reaches, so a slip does not take the neighbour;
//  - in Arabic its top row stood by physical sides: Close and the save mark
//    were 8 to 11px off their mirror. They stand by start and end now.
// What a reader would notice if this broke: a line they tap to hear again
// that the finger misses, or, in Arabic, Close and the save mark out of line
// with the row they stand in.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
/** A rule's body by its exact selector. */
const rule = (selector: string) => {
  const at = css.indexOf(`\n${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
};
const px = (body: string, prop: string) => Number(new RegExp(`\\b${prop}: ([\\d.]+)px;`).exec(body)?.[1] ?? Number.NaN);

describe("Now Playing's lines and its top row", () => {
  it("gives every line 44 or more to a finger, the 20px between lines kept and a strip between them no target reaches", () => {
    const line = rule('[data-sung-look="player"] li[data-sung]');
    const inside = rule('[data-sung-look="player"] li[data-sung] > :is(button, div)');
    const main = rule('[data-sung-look="player"] [data-sung-main]');
    const between = px(line, "margin-bottom");
    const pad = px(inside, "padding-block");
    const oneLine = px(main, "font-size") * Number(/line-height: ([\d.]+);/.exec(main)?.[1]);
    expect(oneLine).toBeCloseTo(33.6, 1);
    expect(oneLine + 2 * pad).toBeGreaterThanOrEqual(44);
    expect(between + 2 * pad).toBe(20);
    expect(between).toBeGreaterThan(0);
  });

  it("stands its top row by start and end, so the row mirrors in Arabic", () => {
    const sheet = read("components/player/NowPlayingSheet.tsx");
    expect(sheet).not.toMatch(/(^|[\s"'`])-?[mp][lr]-[\d[]/m);
    expect(sheet).toContain('className="tap-press -ms-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-paper hover:bg-paper/[0.06]"');
    expect(sheet.match(/<SaveOffline src=\{audio\.src\} className="-me-2\.5" \/>/g)).toHaveLength(2);
  });
});
