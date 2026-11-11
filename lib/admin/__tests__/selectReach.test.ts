import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The admin panel's one Select (components/admin/Select.tsx) is 44 tall to a
 * finger: its button, the search field in its list and every row of the list
 * (the arbiter's list for 1.9: "the admin Select at 44"). Every other control
 * the panel draws went to 44 on 2026-11-10 (lib/ui/__tests__/touchTargets.test.ts
 * counts them by their sizes); the Select's size comes from its padding, which
 * that count does not read, so it is held here. A mouse keeps the compact row
 * the panel was drawn at (pointer-fine).
 *
 * What would go wrong if this broke: on the owner's phone the reason picker
 * under a removal, the filters and the forms' choices at 30 to 34px, the size
 * a thumb misses.
 */

const src = readFileSync(path.join(__dirname, "..", "..", "..", "components", "admin", "Select.tsx"), "utf8");

describe("the admin Select, to a finger", () => {
  it("its button is 44 tall to a finger and compact to a mouse", () => {
    expect(src).toContain('const reach = "min-h-11 pointer-fine:min-h-0";');
    expect(src).toMatch(/role="combobox"[\s\S]*?\$\{shape\} \$\{pad\} \$\{reach\}/);
  });

  it("the search field in its list, and every row of the list, are 44 tall to a finger", () => {
    expect(src).toMatch(/className="min-h-11 w-full rounded-\[8px\] border[^"]*pointer-fine:min-h-0"/);
    expect(src).toMatch(/"adm-select-row flex min-h-11 [^"]*pointer-fine:min-h-0 "/);
  });
});
