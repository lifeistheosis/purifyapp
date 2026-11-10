// The language list opens on the screen, whole (1.9). In Settings the picker
// stands after the globe, part way along its row, and the list, opened from
// the picker's far edge and 20rem wide, ran off a phone's left edge: at 390px
// its names were out of sight. Opened downward it also ran on under the tab
// bar, where its last languages could never be scrolled into sight. What a
// reader would notice if this broke: a list with only the check mark
// showing, or Urdu and Polish out of reach.
//
// It opens at the picker's start, in either direction of reading, is never
// wider than the screen less a margin each side, and once drawn moves itself
// sideways to keep that margin; downward it stops above the tab bar, and
// opens upward under the top bar when there is more room there. The walk on
// the export measures the opened list at 390 and 320 pixels, in English and
// in Arabic, and with the picker low on the screen.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const menu = fs.readFileSync(path.join(process.cwd(), "components/i18n/LocaleMenu.tsx"), "utf8");

describe("the language list's place", () => {
  it("opens at its trigger's start, up or down, in either direction of reading", () => {
    expect(menu).toContain('"bottom-full start-0 mb-2"');
    expect(menu).toContain('"top-full start-0 mt-2"');
    // A side fixed for one direction of reading is the fault this mends.
    expect(menu).not.toMatch(/\b(left|right)-0\b/);
  });

  it("is never wider than the screen less a margin each side", () => {
    expect(menu).toContain("max-w-[calc(100vw-2rem)]");
    expect(menu).toContain("const EDGE_PX = 16;");
  });

  it("stops above the tab bar, or opens upward under the top bar where there is more room", () => {
    expect(menu).toContain('edge("[data-tab-bar]", "top")');
    expect(menu).toContain('edge("[data-mobile-topbar]", "bottom")');
    expect(menu).toContain("const MIN_LIST_PX = 200;");
    expect(menu).toMatch(/el\.style\.bottom = "100%";/);
    // The two bars still carry the marks the list measures.
    const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
    expect(read("components/nav/MobileTabBar.tsx")).toMatch(/\bdata-tab-bar\b/);
    expect(read("components/nav/MobileTopBar.tsx")).toMatch(/\bdata-mobile-topbar\b/);
  });

  it("moves itself sideways once drawn, and again when the screen turns", () => {
    expect(menu).toMatch(/useLayoutEffect\(\(\) => \{[\s\S]*?getBoundingClientRect\(\)[\s\S]*?el\.style\.translate = `\$\{Math\.round\(dx\)\}px 0`/);
    expect(menu).toMatch(/addEventListener\("resize", fit\)/);
    expect(menu).toContain("ref={listRef}");
  });
});
