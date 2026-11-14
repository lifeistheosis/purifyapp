// No em dash in words a reader sees (CLAUDE.md; docs/editorial-standards.md),
// in the places where one was found (Updates 34's baton, "Found on the way").
//
// The seller's order page set a refund's resolution note after an em dash; it
// now stands after the same middle dot that already parts the refund's status
// from its amount on that line. The language editor's Russian and Ukrainian
// closing lines said "perhaps yours is next" with the dash those languages set
// for an unstated "is"; they say it without one ("perhaps the next will be
// yours"), the meaning unchanged. Comments are not read: only what the page
// draws (its strings, its templates and its JSX text).

import fs from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const FILES = ["app/(app)/shop/seller/orders/[id]/page.tsx", "app/(app)/language-editor/page.tsx"];

/** Every piece of words the file can draw: string literals, template parts and JSX text. */
function drawnWords(rel: string): string[] {
  const text = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
  const src = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) out.push(node.text);
    else if (ts.isJsxText(node)) out.push(node.getText());
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

describe("words a reader sees carry no em dash", () => {
  for (const rel of FILES) {
    it(rel, () => {
      expect(drawnWords(rel).filter((w) => w.includes("—"))).toEqual([]);
    });
  }

  it("the seller's refund line parts its note as it parts its amount", () => {
    const page = fs.readFileSync(path.join(process.cwd(), FILES[0]), "utf8");
    expect(page).toContain("r.resolution_note ? ` · ${r.resolution_note}` : \"\"");
  });
});
