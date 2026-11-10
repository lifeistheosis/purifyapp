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
  it("points down when it opens in place, and up while open (his yes to 104, the Nameday row)", () => {
    const row = fs.readFileSync(path.join(process.cwd(), "components/prayers/mine/WayRow.tsx"), "utf8");
    expect(row).toMatch(/expanded === undefined \? \(\s*<ChevronRight size=\{15\} className="set-chev rtl:-scale-x-100" \/>/);
    expect(row).toContain("<ChevronDown");
    expect(row).toContain('motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-house${expanded ? " rotate-180" : ""}');
    // The Nameday row is one that opens in place.
    expect(fs.readFileSync(path.join(process.cwd(), "components/prayers/NameForm.tsx"), "utf8")).toMatch(/expanded=\{open\}/);
  });

  it("is padded by start and end, not left and right", () => {
    const at = css.indexOf("\n.rule-way {");
    expect(at).toBeGreaterThan(-1);
    const body = css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
    expect(body).toContain("padding-block: 11px;");
    expect(body).toContain("padding-inline: 12px 14px;");
    expect(body).not.toMatch(/(?:^|\n)\s*padding:|padding-(?:left|right):/);
  });
});
