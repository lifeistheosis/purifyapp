// A transition list that names `transform` animates nothing that a
// translate-*, scale-* or rotate-* class sets.
//
// Tailwind 4 writes those utilities as their own CSS properties (`translate`,
// `scale`, `rotate`), not as `transform`. So `transition-[opacity,transform]`
// beside `-translate-y-3` fades the opacity and lets the element jump. That is
// what the owner saw on 2026-10-29 in build 80 ("the cover section moves down
// like a couple pixels... it ruins the immersion", and "the pop-ups screen
// that shows up after isn't really optimized"): the player's cover, the chant
// page's slim bar, the Discover menu, and the press of every Button.
//
// The rule here is deliberately simple: a list that names `transform` names
// `translate` and `scale` too. Naming a property that nothing sets costs
// nothing; leaving one out is a jump.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SURFACES = ["app", "components"];

function walk(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    const abs = path.join(ROOT, cur);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.posix.join(cur, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__" || entry.name === "node_modules") continue;
        stack.push(rel);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(rel);
      }
    }
  }
  return out;
}

describe("transition lists", () => {
  it("name translate and scale wherever they name transform", () => {
    const offenders: string[] = [];
    for (const dir of SURFACES) {
      for (const rel of walk(dir)) {
        const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
        for (const m of src.matchAll(/transition-\[([^\]]+)\]/g)) {
          const parts = m[1].split(",");
          if (!parts.includes("transform")) continue;
          if (!parts.includes("translate") || !parts.includes("scale")) offenders.push(`${rel}: ${m[0]}`);
        }
      }
    }
    expect(
      offenders,
      "These lists name transform but not translate and scale, so a translate-* or scale-* class on the same element jumps instead of moving:\n  " +
        offenders.join("\n  "),
    ).toEqual([]);
  });
});
