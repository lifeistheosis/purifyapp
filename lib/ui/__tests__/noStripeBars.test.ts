import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No side stripe drawn as a block (the owner's word, 2026-11-10, and again on
 * 2026-11-24, on the admin's "Someone just started reading" card: "That white
 * design on the left, that vertical line, is actually a vibe coded design").
 * noSideStripes.test.ts reads borders; the card's bar was a 3px span with a
 * background, full height, which no border rule sees. This reads a class
 * list that is thin (at most 4px wide) and runs the height of its box.
 * A true divider is allowed only by name and reason, as there.
 */

const ROOTS = ["app", "components", "lib"];
const THIN = /(?:^|\s)w-(?:px|0\.5|1|\[(?:[1-4](?:\.\d+)?)px\])(?:\s|$)/;
const TALL = /(?:^|\s)(?:self-stretch|h-full|inset-y-0|top-0 bottom-0)(?:\s|$)/;
/** A bar that is only thin and shrink-0: a flex row stretches it to its full height. */
const STRETCHED = /^\s*w-(?:px|0\.5|1|\[(?:[1-4](?:\.\d+)?)px\]) shrink-0\s*$/;
const ALLOWED: Record<string, string> = {
  // The history timeline's spine: the dots of the events hang on it. A
  // timeline's own line, not a stripe beside a card or a quote.
  "components/history/TimelineCore.tsx": "the timeline's spine",
};

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".") || name === "__tests__") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

describe("no side stripe drawn as a thin full-height block", () => {
  it("finds none in app/, components/ or lib/", () => {
    const hits: string[] = [];
    for (const f of ROOTS.flatMap((r) => files(r))) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const m of line.matchAll(/className="([^"]+)"/g)) {
            const cls = ` ${m[1]} `;
            const where = `${f}:${i + 1}`;
            if (((THIN.test(cls) && TALL.test(cls)) || STRETCHED.test(m[1])) && !ALLOWED[f]) hits.push(`${where}  ${m[1]}`);
          }
        });
    }
    expect(hits).toEqual([]);
  });
});
