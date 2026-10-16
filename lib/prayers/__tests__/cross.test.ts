import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { crossMatches, linesOf, rubricMakesTheCross, stanzasOf } from "@/lib/prayers/lines";
import type { Rule } from "@/lib/prayers/types";

/**
 * Where the sign of the Cross is drawn beside a line (1.7).
 *
 * The owner, 2026-10-16: where the faithful make the sign of the Cross, mark
 * it with the app's drawn cross beside that line, taking where it is made
 * from the prayer texts' own rubrics, and never inventing one. So a mark
 * (a prayer's `cross`) stands only on a rubric that says the Cross is made:
 * the prayer's own title or instruction ("The Sign of the Cross ... saying:",
 * "prayed with the sign of the Cross"), or, for a rule's first prayer, the
 * rule's opening words ("Make the Sign of the Cross. Then pray ..."). And
 * every mark opens exactly one line of the prayer's text, so it can never
 * point at nothing or at two places.
 */

const PRAYERS = path.join(process.cwd(), "data", "prayers");

function files(): { rel: string; rule: Rule }[] {
  const out: { rel: string; rule: Rule }[] = [];
  for (const sub of ["rules", "hours", "akathists"]) {
    const dir = path.join(PRAYERS, sub);
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      out.push({ rel: `${sub}/${name}`, rule: JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as Rule });
    }
  }
  return out;
}

describe("a prayer's lines", () => {
  it("are the text's own: a blank line parts stanzas, a break parts lines", () => {
    const text = "Holy God, Holy Mighty.\nHave mercy on us.\n\nGlory to the Father.";
    const stanzas = stanzasOf(text);
    expect(stanzas.map((s) => s.map((l) => l.text))).toEqual([
      ["Holy God, Holy Mighty.", "Have mercy on us."],
      ["Glory to the Father."],
    ]);
    expect(linesOf("A long paragraph, never split. It stays one line.")).toEqual([
      "A long paragraph, never split. It stays one line.",
    ]);
    // A file's Windows line ends and stray spaces change nothing.
    expect(linesOf("One.\r\n\r\n  Two.  ")).toEqual(["One.", "Two."]);
  });

  it("carry the Cross where a mark's words open them, and nowhere else", () => {
    const stanzas = stanzasOf("In the name of the Father. Amen.\nGlory to Thee.", ["In the name of the Father"]);
    expect(stanzas[0].map((l) => l.cross)).toEqual([true, false]);
    expect(stanzasOf("Glory to Thee.", [""])[0][0].cross).toBe(false);
  });

  it("know a rubric that makes the Cross, in the files' two languages", () => {
    expect(rubricMakesTheCross("Make the Sign of the Cross. Then pray each of the following")).toBe(true);
    expect(rubricMakesTheCross("The opening verses of Psalm 67, prayed with the sign of the Cross.")).toBe(true);
    expect(rubricMakesTheCross("Das Zeichen des Kreuzes")).toBe(true);
    expect(rubricMakesTheCross("Bekreuzigen Sie sich.")).toBe(true);
    // A bow, a prostration or the Cross of the Crucifixion is not the sign.
    expect(rubricMakesTheCross("Three times, with a small bow at each:")).toBe(false);
    expect(rubricMakesTheCross("Make a prostration after each petition.")).toBe(false);
    expect(rubricMakesTheCross("the hour at which the Lord gave up His spirit on the Cross")).toBe(false);
  });
});

describe("the marks in the prayer files", () => {
  const all = files();

  it("reads the files, and finds the Sign of the Cross marked in the morning rule", () => {
    // A positive control: a scan that matched nothing would pass every check below.
    expect(all.length).toBeGreaterThan(15);
    const morning = all.find((f) => f.rel === "rules/morning.json")!.rule;
    expect(morning.prayers.find((p) => p.id === "sign-of-cross")?.cross).toEqual(["In the name of the Father"]);
    expect(all.flatMap((f) => f.rule.prayers.filter((p) => p.cross?.length)).length).toBeGreaterThanOrEqual(8);
  });

  it("each open exactly one line of their prayer's own text", () => {
    const bad: string[] = [];
    for (const { rel, rule } of all) {
      for (const p of rule.prayers) {
        if (!p.cross) continue;
        if (!p.text) {
          bad.push(`${rel} ${p.id}: a mark on a prayer with no text of its own`);
          continue;
        }
        for (const m of crossMatches(p.text, p.cross)) {
          if (m.lines !== 1) bad.push(`${rel} ${p.id}: "${m.words}" opens ${m.lines} lines`);
        }
      }
    }
    expect(bad, bad.join("\n  ")).toEqual([]);
  });

  it("each stand on a rubric that makes the Cross, never on none", () => {
    const invented: string[] = [];
    for (const { rel, rule } of all) {
      rule.prayers.forEach((p, i) => {
        if (!p.cross?.length) return;
        const own = rubricMakesTheCross(p.title) || rubricMakesTheCross(p.instruction);
        const opening = i === 0 && rubricMakesTheCross(rule.intro);
        if (!own && !opening) invented.push(`${rel} ${p.id}`);
      });
    }
    expect(
      invented,
      "A sign of the Cross is marked where no rubric says it is made. Take the mark off, or " +
        "show the rubric in the prayer's title or instruction (the edition's own):\n  " +
        invented.join("\n  "),
    ).toEqual([]);
  });

  it("are where every rubric says the Cross is made", () => {
    // The other direction: a rubric that makes the Cross with no mark under it.
    const missing: string[] = [];
    for (const { rel, rule } of all) {
      rule.prayers.forEach((p, i) => {
        if (!p.text || p.cross?.length) return;
        const own = rubricMakesTheCross(p.title) || rubricMakesTheCross(p.instruction);
        const opening = i === 0 && rubricMakesTheCross(rule.intro);
        if (own || opening) missing.push(`${rel} ${p.id}`);
      });
    }
    expect(missing, missing.join("\n  ")).toEqual([]);
  });
});
