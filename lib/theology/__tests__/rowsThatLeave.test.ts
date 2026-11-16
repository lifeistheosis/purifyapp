// Updates 90 (2026-11-15), item 3: the reduced presses. A .theology-row
// lights white as it is pressed (app/globals.css), and with motion reduced
// the page a row opens cuts in about 60ms, so the light stood for 2 frames
// and was gone: a flash (Gate 3c, "Marcionism"; Updates 86 kept the heresies'
// rows still). Every other row that opens a page lit the same way: the creed,
// the library, the way, the shelves, the recent studies, the related rails,
// a topic's verses and studies, the path's steps, an apologetics reading's
// verses, and the legal documents. Each now wears theology-row-leaves, which
// keeps it still as it is pressed with motion reduced; the keyboard's ring
// stays, and with motion on nothing changes (lib/theology/__tests__/
// heresiesPress.test.ts holds the rule itself).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(ROOT, rel)).isDirectory() ? (name === "__tests__" ? [] : walk(rel)) : rel.endsWith(".tsx") ? [rel] : [];
  });

/** Each element whose class names theology-row: its tag, where it is, and its class. */
function rows(): { tag: string; at: string; cls: string }[] {
  const found: { tag: string; at: string; cls: string }[] = [];
  for (const file of [...walk("app"), ...walk("components")]) {
    const src = readFileSync(join(ROOT, file), "utf8");
    const re = /\btheology-row\b(?!-)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const before = src.slice(0, m.index);
      const open = before.lastIndexOf("<");
      const tag = /^<([A-Za-z.]+)/.exec(src.slice(open))?.[1] ?? "?";
      // A constant handed to its rows (the heresies' ROW) is read where it is declared.
      const line = src.slice(before.lastIndexOf("\n") + 1, src.indexOf("\n", m.index));
      const declared = /^\s*const [A-Z_]+ = /.test(line);
      found.push({ tag: declared ? "const" : tag, at: `${file}:${before.split("\n").length}`, cls: line });
    }
  }
  return found;
}

describe("a row that opens a page keeps still as it is pressed with motion reduced", () => {
  it("every theology-row on a link is a row that leaves", () => {
    const links = rows().filter((r) => r.tag === "Link");
    expect(links.length).toBeGreaterThanOrEqual(14);
    expect(links.filter((r) => !r.cls.includes("theology-row-leaves")).map((r) => r.at)).toEqual([]);
  });

  it("the rows that stay are buttons that change their own page, which stay lit their whole press", () => {
    const stay = rows().filter((r) => r.tag !== "Link" && !r.cls.includes("theology-row-leaves"));
    expect([...new Set(stay.map((r) => `${r.tag} ${r.at.split(":")[0]}`))].sort()).toEqual([
      "button components/fasting/FastingTrackerClient.tsx",
      "button components/journal/JournalClient.tsx",
      "button components/legal/LegalContents.tsx",
      // The writing page's one sheet (1.9, Fable round 3): its rows change the
      // sheet's own content or lay something on the page under it.
      "const components/journal/LibraryQuote.tsx",
      "const components/journal/WriteSheet.tsx",
    ]);
  });
});
