// A control stepping away takes no touch (Gate 6c, 2026-11-17).
//
// The tap walk as a new reader failed a council document's "The council's
// page" (/councils/first-nicaea/the-synodal-letter/, 2 of 2 on that screen,
// docs/handoffs/updates-98s.md): the touch changed nothing. With the touch's
// events logged inside the walk (Updates 98u), pointerdown, touchstart,
// pointerup and touchend all met the link, and the click after them met the
// reader's pill: the walk's scroll to the page's foot had sent the controls
// away (lib/ui/scrollAway.ts), and the pill, at rest just where the last line
// stands, was fading down over it (opacity 0.68 to 0.49, 4 to 6px of its
// 12px) and still drawn, since visibility goes only at the end of the 560ms
// leave (app/globals.css). Its own controls set pointer-events: auto, so the
// rule lets each of them go, with the pill, the top bar's plates and the tab
// bar that leave with it. Nothing changes in how anything looks.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("the reader's controls while they step away", () => {
  it("take no touch, they and every control in them, for the whole of the leave", () => {
    expect(css).toMatch(
      /body\[data-reader-away\] \[data-mobile-topbar\]\[data-plates\] \[data-plates-row\],\s*body\[data-reader-away\] \[data-mobile-topbar\]\[data-plates\] \[data-plates-row\] \*,\s*body\[data-reader-away\] \[data-reader-pill\],\s*body\[data-reader-away\] \[data-reader-pill\] \*,\s*body\[data-reader-screen\]\[data-reader-away\] \[data-tab-bar\],\s*body\[data-reader-screen\]\[data-reader-away\] \[data-tab-bar\] \* \{\s*pointer-events: none;\s*\}/,
    );
  });

  it("is a rule outside every layer, so it holds over the pills' own pointer-events-auto", () => {
    const at = css.indexOf("body[data-reader-away] [data-reader-pill] *");
    expect(at).toBeGreaterThan(0);
    const before = css.slice(0, at);
    const opened = (before.match(/@layer [a-z]+ \{/g) ?? []).length;
    expect(opened).toBe(0);
  });

  it("still lets them go hidden only at the end of the leave, as they fade", () => {
    expect(css).toMatch(
      /body\[data-reader-away\] \[data-reader-pill\],\s*body\[data-reader-screen\]\[data-reader-away\] \[data-tab-bar\] \{\s*opacity: 0;\s*visibility: hidden;\s*transition:\s*opacity var\(--reader-away-duration\) var\(--reader-away-ease\),\s*transform var\(--reader-away-duration\) var\(--reader-away-ease\),\s*visibility 0s linear var\(--reader-away-duration\);/,
    );
  });
});
