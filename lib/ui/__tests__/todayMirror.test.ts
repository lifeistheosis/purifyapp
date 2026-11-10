// Today turns in Arabic (1.9, the arbiter's guardrail list of 2026-11-10, from
// the Themes chat's checkMock run on Today): 48 pieces of the page stayed where
// English put them when the page turned to Arabic. 34 were the night sky's
// stars, placed with `left`; 9 were the streak card's count, its line and the
// week's letters, set `text-left`; 5 were placed by hand on purpose.
//
// What it holds: no words on Today or on the streak's cards set left or right,
// only to the start or the end; the night sky's stars placed from the line's
// start, so the sky turns with the page (the intro's and the welcome flow's
// skies carry the same stars); and what stays put on purpose says so to the
// checker (scripts/mock-check.mjs, data-mock-allow with data-mock-why), with
// its reason: the portrait standing on the side the speaker looks from, and
// the play mark's pixel.
//
// What a reader would notice if this broke: in Arabic, the streak's words held
// to the left of a page that reads from the right.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const tsx = (dir: string) =>
  readdirSync(join(process.cwd(), dir))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `${dir}/${f}`);

describe("Today in Arabic", () => {
  it("sets no words left or right on Today or the streak's cards, only to the start or the end", () => {
    const files = [...tsx("components/today"), ...tsx("components/streak")];
    expect(files.length).toBeGreaterThan(10);
    const physical: string[] = [];
    for (const file of files) {
      for (const m of read(file).matchAll(/(?:^|[\s"'`:])(text-(?:left|right))(?=[\s"'`]|$)/gm)) physical.push(`${file}: ${m[1]}`);
    }
    expect(physical, physical.join("\n")).toEqual([]);
  });

  it("places the night sky's stars from the line's start, in the intro and in the welcome flow", () => {
    for (const file of ["components/native/LaunchFrame.tsx", "components/onboarding/WhereFrom.tsx"]) {
      const src = read(file);
      expect(src, file).toContain("HORIZON_STARS.map");
      expect(src, file).toContain("insetInlineStart: s.left");
      expect(src, file).not.toMatch(/\bleft: s\.left\b/);
    }
  });

  it("names what stays put on purpose, with its reason", () => {
    const band = read("components/today/SpeakerBand.tsx");
    expect(band).toContain('data-mock-allow="mirror"');
    expect(band).toMatch(/data-mock-why="the portrait stands on the side the speaker looks from[^"]*standsOn\)"/);
    const actions = read("components/today/VerseCardActions.tsx");
    const play = actions.slice(actions.indexOf("<Play"), actions.indexOf("/>", actions.indexOf("<Play")));
    expect(play).toContain('className="translate-x-px"');
    expect(play).toContain('data-mock-allow="mirror"');
    expect(play).toMatch(/data-mock-why="a play mark points right in every language/);
  });
});
