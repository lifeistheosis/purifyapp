// The foot of every page makes room for the mini player as well as the tab
// bar. Until build 80 it made room for the tab bar alone, so the now-playing
// card, which stands above the bar, covered each page's last lines (the
// owner, 2026-10-29: "it hides the bottom... where it says show words").

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

describe("the page's foot", () => {
  it("makes room for the mini player as well as the tab bar", () => {
    for (const cls of ["safe-pb", "safe-pb-reader"]) {
      const rule = css.match(new RegExp(`html\\.is-native \\.${cls} \\{[^}]*\\}`))?.[0];
      expect(rule, cls).toBeDefined();
      expect(rule, cls).toContain("var(--tab-bar-h)");
      expect(rule, cls).toContain("var(--now-playing-h)");
    }
  });

  it("gives the card no room when no card is showing", () => {
    // The default is 0, set before any rule that raises it.
    expect(css).toMatch(/--now-playing-h:\s*0px;/);
  });
});
