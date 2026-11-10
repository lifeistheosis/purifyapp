// A reader's own words say no language: they may be in any (1.9, build 90
// note 4, the arbiter's yes to everything in 1.9).
//
// Under Arabic or Urdu the page runs right to left, and a field inherits it:
// an English name, note or post typed there ran right to left, its full stop
// at the start of the line. So every place a reader types words (a textarea,
// or an input for text or a search) says dir="auto", and the browser sets the
// direction by the words' own first letter, as the Florilegium, Saved and
// Remember already did for the words they keep. Where those words are drawn
// again (the journal, the community's posts and replies, a profile's bio, the
// diptychs' names, the reading room's thread) the element that holds them says
// the same; the walk on the export cannot check those, since it walks with no
// reader's data, so they were marked by hand and are named in the note.
//
// The admin panel is the owner's own, in English, and is not read here.
// Fields in the other chats' families not yet marked are named, with how many,
// in typedNotYetDirected.otherFamilies.ts; a count may only fall.

import fs from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { OTHER_FAMILIES } from "./typedNotYetDirected.otherFamilies";

const ROOT = process.cwd();
const ADMIN = /^(app|components)\/admin\//;

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name !== "__tests__" && e.name !== "node_modules") out.push(...tsxFiles(rel));
    } else if (e.name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

type Field = { file: string; line: number; tag: string; dir: string | null };

/** Every field a reader types words into, outside the admin panel (the TypeScript parser's reading). */
function fields(): Field[] {
  const out: Field[] = [];
  for (const file of [...tsxFiles("app"), ...tsxFiles("components")]) {
    if (ADMIN.test(file)) continue;
    const src = fs.readFileSync(path.join(ROOT, file), "utf8");
    if (!/<(textarea|input)\b/.test(src)) continue;
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (n: ts.Node) => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const tag = n.tagName.getText(sf);
        if (tag === "textarea" || tag === "input") {
          const attrs = n.attributes.properties.filter(ts.isJsxAttribute);
          const get = (name: string) => attrs.find((a) => a.name.getText(sf) === name);
          const type = get("type");
          // No type is a text field; a type from an expression is not read as one.
          const literal = !type ? null : type.initializer && ts.isStringLiteral(type.initializer) ? type.initializer.text : undefined;
          if (tag === "textarea" || literal === null || literal === "text" || literal === "search") {
            const dir = get("dir");
            out.push({
              file,
              line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
              tag,
              dir: dir?.initializer && ts.isStringLiteral(dir.initializer) ? dir.initializer.text : dir ? dir.getText(sf) : null,
            });
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}

describe("a reader's typed words run as they are written", () => {
  const all = fields();

  it("reads the app's fields", () => {
    expect(all.length).toBeGreaterThan(100);
  });

  it('each says dir="auto", but for the files named, whose counts only fall', () => {
    const counts: Record<string, number> = {};
    for (const f of all.filter((x) => x.dir === null)) counts[f.file] = (counts[f.file] ?? 0) + 1;
    const rule =
      'A field a reader types words into says dir="auto", so English typed under Arabic runs left to right ' +
      "and Arabic under English right to left. A file marked lowers its count in typedNotYetDirected.otherFamilies.ts, or leaves the list.";
    expect(counts, rule).toEqual(OTHER_FAMILIES);
  });

  it("names no fixed direction on a field for words that may be in any language", () => {
    const fixed = all.filter((x) => x.dir !== null && x.dir !== "auto").map((x) => `${x.file}:${x.line} <${x.tag} dir=${x.dir}>`);
    expect(fixed).toEqual([]);
  });
});
