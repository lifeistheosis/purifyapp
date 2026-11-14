// The saints' century timeline with motion reduced (Updates 39, the arbiter's
// call of 2026-11-14). A filter sets the bars at once on the still path, the
// cut that path allows, and each bar grows from its foot, so its top edge and
// the count over it move in that frame: the gate's jump rule read it as a
// jump (43px, Apostles; the browser names the bar). It is allowed by name and
// reason on those two elements, never by loosening the rule: the gate's
// judge honours the name only with motion reduced, and only on the shifted
// element itself (scripts/gate/frames.mjs; its self-test plants both ways).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const timeline = fs.readFileSync(path.join(process.cwd(), "components/saints/CenturyTimeline.tsx"), "utf8");
const judge = fs.readFileSync(path.join(process.cwd(), "scripts/gate/frames.mjs"), "utf8");
const inPage = fs.readFileSync(path.join(process.cwd(), "scripts/gate/inpage.mjs"), "utf8");

describe("the century timeline's count and bar, named to the jump rule", () => {
  it("both carry the allowance with a reason a reader of the code can see", () => {
    const named = [...timeline.matchAll(/data-mock-allow="jump"\s+data-mock-why="([^"]+)"\s+className=\{cn\(\s*"([^"]+)"/g)];
    expect(named.map((m) => m[2].split(" ")[0])).toEqual(["font-sans", "w-full"]);
    for (const m of named) expect(m[1].length).toBeGreaterThan(30);
  });

  it("the judge honours it only with motion reduced, and still fails any other shift", () => {
    expect(judge).toMatch(/if \(motion === "reduce" && src\.allow\) \{[\s\S]{0,200}continue;\s*\}\s*if \(!worst \|\| far > worst\.far\) worst =/);
    expect(judge).not.toMatch(/src\.allow\)[^\n]*worst/);
  });

  it("the page's measure reads the name off the shifted element alone, not a box round it", () => {
    const fn = /function jumpAllowance\(el\) \{([\s\S]*?)\n  \}/.exec(inPage)?.[1] ?? "";
    expect(fn).toContain('el.getAttribute("data-mock-allow")');
    expect(fn).not.toMatch(/parentElement|closest\(/);
    expect(inPage).toMatch(/allow: jumpAllowance\(/);
  });
});
