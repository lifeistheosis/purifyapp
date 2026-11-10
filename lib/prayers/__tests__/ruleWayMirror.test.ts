import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Your rule's rows (.rule-way, build 89 note 14's shared row) turn in Arabic.
 * The prayer campaigns chat's item 3 (docs/1.9-build/notes/campaigns-fable.md,
 * section 9): the row's padding was set by left and right, 12px and 14px, so
 * in Arabic its picture stood 2px off a mirror.
 *
 * What would go wrong if this broke: the row's picture and arrow at the
 * wrong distances from its edges in a language read from the right.
 */

const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

describe("a row of Your rule", () => {
  it("is padded by start and end, not left and right", () => {
    const at = css.indexOf("\n.rule-way {");
    expect(at).toBeGreaterThan(-1);
    const body = css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
    expect(body).toContain("padding-block: 11px;");
    expect(body).toContain("padding-inline: 12px 14px;");
    expect(body).not.toMatch(/(?:^|\n)\s*padding:|padding-(?:left|right):/);
  });
});
