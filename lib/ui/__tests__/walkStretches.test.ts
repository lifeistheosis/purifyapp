import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { keepVerdicts, saidOf, saidVerdict, sumOf, walkingOn } from "@/scripts/lib/stretches.mjs";

/**
 * One walk's throw never loses the others' verdicts (the arbiter,
 * 2026-11-11, giving the transition walk to this chat: "one walk's throw
 * must never lose the others' verdicts; on the gate's selling export the
 * Plus walks run as a Plus reader the way Admin's walks do, and the
 * Florilegium's locked door is walked as a reader without Plus").
 *
 * scripts/route-motion.mjs watches every page switch move, on the export, and
 * is one of the pre-build gate's walks. It was one long walk in one try, its
 * report handed back at the end. On an export that locked the Florilegium
 * its tap on a starter's tile waited thirty seconds for a tile that page does
 * not draw and threw. Of the 34 verdicts the walk then owed, the seventeen it
 * had reached went with the throw and the seventeen after it were never
 * walked: the run said nothing of page switches that had moved as they
 * should.
 *
 * So the walk is taken a stretch at a time (scripts/lib/stretches.mjs). This
 * holds the keeping of verdicts, and holds the walk to it: no verdict is
 * written by a name of the walk's own, no page is walked outside a stretch,
 * and the locked door is walked on a phone that says it is the Android
 * shell, only where the export sells.
 *
 * The walk itself needs the export and a browser: `node
 * scripts/route-motion.mjs` after `npm run build:android`.
 *
 * What would go wrong if this broke: the gate's walk of page switches stops
 * at the first page it cannot open and reports nothing, on the very export
 * the owner is about to be handed.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

/** What Playwright throws when a tap finds nothing to tap. */
const TIMEOUT = `locator.click: Timeout 30000ms exceeded.
Call log:
\u001b[2m  - waiting for locator('a[data-starter="magnificat"]').first()\u001b[22m
`;

describe("a walk taken a stretch at a time", () => {
  it("keeps every verdict reached before a throw, and walks on after it", async () => {
    const { report, note, stretch } = keepVerdicts();
    await stretch(["forward: a tap into a page"], async ([name]) => note(name, [], "/prayers to /prayers/hours"));
    const whole = await stretch(["a starter: into its page", "a starter: back"], async () => {
      throw new Error(TIMEOUT);
    });
    await stretch(["a question: into its page"], async ([name]) => note(name, []));

    expect(whole).toBe(false);
    // Every verdict the walk owes is said, by its own name, in its own place.
    expect(report.map((r) => r.name)).toEqual(["forward: a tap into a page", "a starter: into its page", "a starter: back", "a question: into its page"]);
    expect(report[0]).toEqual({ name: "forward: a tap into a page", faults: [], said: "/prayers to /prayers/hours" });
    // The throw, in a line: what it said, and what it was waiting for.
    expect(report[1].faults).toEqual([`the walk stopped: locator.click: Timeout 30000ms exceeded. (waiting for locator('a[data-starter="magnificat"]').first())`]);
    // Said once: the rest of the stretch point to it.
    expect(report[2].faults).toEqual(["not walked: the walk stopped before it, at the verdict above"]);
    // And the stretch after it was walked, and passed.
    expect(report[3].faults).toEqual([]);
    expect(sumOf(report)).toEqual({ passed: 2, failed: 2, skipped: 0, asked: 4 });
  });

  it("keeps the verdict a stretch reached before it threw", async () => {
    const { report, note, stretch } = keepVerdicts();
    await stretch(["into a saint", "back to the list"], async ([going]) => {
      note(going, [], "/saints to /saints/basil-the-great");
      throw new Error("page.evaluate: Target page, context or browser has been closed");
    });
    expect(report).toEqual([
      { name: "into a saint", faults: [], said: "/saints to /saints/basil-the-great" },
      { name: "back to the list", faults: ["the walk stopped: page.evaluate: Target page, context or browser has been closed"], said: "" },
    ]);
  });

  it("says a verdict the walk went by without a throw: a run never says fewer than it owes", async () => {
    const { report, note, stretch } = keepVerdicts();
    // No saint was on screen to tap: one fault said, and the way back never walked.
    const whole = await stretch(["into a saint", "back to the list"], async ([going]) => note(going, ["no saint on screen to tap"]));
    expect(whole).toBe(true);
    expect(report.map((r) => [r.name, r.faults])).toEqual([
      ["into a saint", ["no saint on screen to tap"]],
      ["back to the list", ["not walked: the walk went by without reaching it"]],
    ]);
  });

  it("still says a throw that came after the last verdict", async () => {
    const { report, note, stretch } = keepVerdicts();
    await stretch(["a tab for a tab"], async ([name]) => {
      note(name, []);
      throw new Error("page.screenshot: Timeout 30000ms exceeded.");
    });
    expect(report.map((r) => [r.name, r.faults])).toEqual([
      ["a tab for a tab", []],
      ["a tab for a tab, and after it", ["the walk stopped: page.screenshot: Timeout 30000ms exceeded."]],
    ]);
  });

  it("reads a stretch by its own verdicts: two stretches may owe one of the same name", async () => {
    const { report, note, stretch } = keepVerdicts();
    // A council's Father is opened by his card before each of two ways back.
    await stretch(["opened by the card", "back by the chevron"], async ([going, coming]) => {
      note(going, []);
      note(coming, []);
    });
    await stretch(["opened by the card", "back by the phone's Back"], async () => {
      throw new Error("no card");
    });
    expect(report.map((r) => [r.name, r.faults.length])).toEqual([
      ["opened by the card", 0],
      ["back by the chevron", 0],
      ["opened by the card", 1],
      ["back by the phone's Back", 1],
    ]);
  });

  it("tells each verdict as it is reached, so a run cut off has said what it had", async () => {
    const heard: string[] = [];
    const { note, skip, stretch } = keepVerdicts((entry) => heard.push(entry.name));
    await stretch(["one"], async ([name]) => {
      note(name, []);
      expect(heard).toEqual(["one"]);
    });
    await stretch(["two"], async () => {
      throw new Error("stopped");
    });
    skip("three", "this export sells nothing");
    expect(heard).toEqual(["one", "two", "three"]);
  });

  it("counts a walk the export cannot be asked for apart: never a pass, never a fail", () => {
    const { report, note, skip } = keepVerdicts();
    note("a walk", [], "a to b");
    note("another", ["pictured 2 transitions, not one"], "b to c");
    skip("the locked door", "this export sells nothing");
    expect(sumOf(report)).toEqual({ passed: 1, failed: 1, skipped: 1, asked: 2 });
    expect(saidVerdict(report[0])).toEqual(["ok    a walk  (a to b)"]);
    expect(saidVerdict(report[1])).toEqual(["FAIL  another  (b to c)", "        pictured 2 transitions, not one"]);
    expect(saidVerdict(report[2])).toEqual(["----  the locked door", "        not walked: this export sells nothing"]);
  });

  it("says a throw in one line, whatever threw", () => {
    expect(saidOf(new Error(TIMEOUT))).toBe(`locator.click: Timeout 30000ms exceeded. (waiting for locator('a[data-starter="magnificat"]').first())`);
    expect(saidOf(new Error("the Florilegium is locked for this reader"))).toBe("the Florilegium is locked for this reader");
    expect(saidOf("a string was thrown")).toBe("a string was thrown");
    expect(saidOf(undefined)).toBe("a throw that said nothing");
  });
});

describe("the stretches walked on one phone", () => {
  type FakePage = { id: string; close: () => Promise<void> };

  it("gives the stretch after one that stopped a new page of it, and closes the page that fell", async () => {
    const { report, note, stretch } = keepVerdicts();
    const closed: string[] = [];
    const pageOf = (id: string): FakePage => ({ id, close: async () => void closed.push(id) });
    let opened = 0;
    const on = walkingOn(stretch, pageOf("first"), async () => pageOf(`new ${++opened}`));
    const walkedOn: string[] = [];

    await on(["one"], async ([name], page) => {
      walkedOn.push(page.id);
      note(name, []);
    });
    await on(["two"], async (_names, page) => {
      walkedOn.push(page.id);
      throw new Error("a sheet was left open over the page");
    });
    await on(["three"], async ([name], page) => {
      walkedOn.push(page.id);
      note(name, []);
    });
    await on(["four"], async ([name], page) => {
      walkedOn.push(page.id);
      note(name, []);
    });

    // The page is kept from walk to walk, as a reader's is, until one stops.
    expect(walkedOn).toEqual(["first", "first", "new 1", "new 1"]);
    expect(closed).toEqual(["first"]);
    expect(report.map((r) => r.faults.length)).toEqual([0, 1, 0, 0]);
  });

  it("writes a phone that will not open against the stretch that needed it, and asks again for the next", async () => {
    const { report, note, stretch } = keepVerdicts();
    let asked = 0;
    const on = walkingOn<FakePage>(stretch, null, async () => {
      asked += 1;
      if (asked === 1) throw new Error("browserType.launch: no browser");
      return { id: "opened", close: async () => {} };
    });
    await on(["the door", "back from the door"], async ([name]) => note(name, []));
    await on(["a gathering under the door"], async ([name], page) => note(name, [], page.id));
    expect(report.map((r) => [r.name, r.faults, r.said])).toEqual([
      ["the door", ["the walk stopped: browserType.launch: no browser"], ""],
      ["back from the door", ["not walked: the walk stopped before it, at the verdict above"], ""],
      ["a gathering under the door", [], "opened"],
    ]);
  });
});

describe("the transition walk", () => {
  const walk = read("scripts/route-motion.mjs");
  const from = walk.indexOf("export async function checkRouteMotion(");
  const to = walk.indexOf("/** One verdict, said. */");
  const body = walk.slice(from, to);

  it("is read whole", () => {
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    expect(body.length).toBeGreaterThan(30000);
  });

  it("writes no verdict by a name of its own: each comes from the stretch that owes it", () => {
    // A name written at the verdict is a verdict a throw before it loses without a trace.
    expect(body).not.toMatch(/\bnote\(\s*["'`]/);
    expect(body).toContain("const { report, note, skip, stretch } = keepVerdicts(tell);");
    // And none is kept anywhere else.
    expect(body).not.toMatch(/report\.push\(/);
  });

  it("walks no page outside a stretch", () => {
    // At the function's own depth, or the depth of the walking phone's try, a walk is in no stretch.
    const outside = body.split("\n").filter((line) => /^ {2,4}(?:(?:const|let) \w+ = |\w+ = )?await (?:walk|slowWalk)\(/.test(line));
    expect(outside).toEqual([]);
    // The stretches are there to be outside of: the walking phone's, a phone of its own for a slow page and for
    // motion reduced, and the locked door's.
    expect(body.match(/await walkOn\(/g)).toHaveLength(22);
    expect(body.match(/await stretch\(/g)).toHaveLength(3);
    expect(body.match(/await lockedOn\(/g)).toHaveLength(2);
  });

  it("begins a stretch from its own page when the one before did not leave the reader there", () => {
    expect(body).toContain('await through(page, "/prayers/", "/prayers/hours/");');
    // Prayers' four after the first two: its rule's link, each half of the rule's tile, a picture tile, the tab.
    expect(body.match(/await at\(page, "\/prayers\/"\);/g)).toHaveLength(4);
    expect(body.match(/await at\(page, "\/florilegium\/", 1200\);/g)).toHaveLength(2);
    // And leaves nothing held on the phone for the next: a picture kept from coming is let through again.
    expect(body).toMatch(/\} finally \{\s*if \(signal === "with no signal"\) await page\.unroute\("https:\/\/purifyapp\.net\/covers\/saints\/\*\*", none\)\.catch\(\(\) => \{\}\);/);
  });

  it("walks the Florilegium as a Plus reader, and says so in a line where the reader is not one", () => {
    // Four stretches open the Florilegium for what only Plus draws: a starter, a gathering, the same with its script late, one kept from a starter.
    expect(body.match(/await nothingLocked\((?:page|fresh)\);/g)).toHaveLength(4);
    expect(walk).toMatch(/async function nothingLocked\(page\) \{\s*if \(!\(await page\.locator\("\[data-plus-gate\]"\)\.count\(\)\)\) return;\s*throw new Error\(/);
  });

  it("walks the locked door on a phone that says it is the Android shell, and only where the export sells", () => {
    expect(body).toContain('const sells = sellsOnAndroid(path.resolve("out"));');
    expect(body).toMatch(/locked = await openPhone\(.*\);\n\s*await asAndroidShell\(locked\.ctx\);/);
    // Where nothing is sold the door's verdicts are said as not asked, never as passed.
    expect(body).toMatch(/if \(!sells\) \{\s*for \(const name of door\) skip\(name, /);
    // It goes by You's row, which wears the padlock, and a row that does not is a walk that proves nothing.
    expect(body).toContain(`const row = '[data-you-rows] a[href^="/florilegium"]';`);
    expect(body).toContain('if (!tapped.wearsLock) into.push("You\'s row wears no padlock, so this reader is not without Plus and the walk proves nothing");');
    expect(read("components/mobile/YouMobile.tsx")).toContain('<span data-you-row-plus=""');
    expect(read("components/florilegium/PlusGate.tsx")).toContain('data-plus-gate=""');
    expect(read("components/florilegium/FlorilegiumGate.tsx")).toContain('<div data-florilegium-read-only="">');
  });

  it("says each verdict as it comes, and refuses an export that does not sell when the gate asks for one that does", () => {
    const main = walk.slice(walk.indexOf("if (process.argv[1]"));
    expect(main).toContain("checkSells(out);");
    expect(main).toContain("tell: printVerdict");
    expect(main).toContain("{ lines: false }");
    // The count is of what was asked: a walk the export cannot be asked for is named apart.
    expect(walk).toContain("return failed === 0;");
  });
});
