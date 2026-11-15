import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { scrimStrip } from "@/lib/ui/useDraggableSheet";

/**
 * The scrim behind a sheet, as the keyboard comes (build 98 note 4; Updates 52,
 * item 4, docs/handoffs/updates-52.md).
 *
 * Behind a full-width sheet the scrim covers only the strip above the sheet's
 * top edge. It was sized from the window's height less the panel's. When the
 * window shrinks for the keyboard, the window's resize is heard before React
 * has sized the box a `fill` or `keyboard` sheet stands in: the panel is still
 * 733px tall in a window now 544px tall, so that reading went below zero and
 * the strip was set to 0px, then back to 45px when React caught up. Since
 * build 98 the Android window follows the keyboard frame by frame, so that
 * order comes on every frame of the slide.
 *
 * What a reader would notice if this broke: the page above a sheet blinking
 * bright, unblurred, for a frame as the keyboard rises or goes.
 */
const hook = fs.readFileSync(path.join(process.cwd(), "lib/ui/useDraggableSheet.ts"), "utf8");

describe("the scrim's strip behind a full-width sheet", () => {
  it("reaches from the screen's top to just under the panel's top edge", () => {
    // A sheet resting with its top at 110.6 in an 844px window: the strip ends 32px under it.
    expect(scrimStrip(110.6, 0, 844)).toBe(143);
    // Slid 200px down while closing: the strip follows the edge.
    expect(scrimStrip(110.6, 200, 844)).toBe(343);
    // Never past the screen, never below nothing.
    expect(scrimStrip(110.6, 2000, 844)).toBe(844);
    expect(scrimStrip(-500, 0, 844)).toBe(0);
  });

  it("stays over the page in the frame the window has shrunk and React has not yet sized the panel's box", () => {
    // Updates 52's numbers at 390 by 844, a keyboard of 300: the window is 544 tall, the panel still
    // 733 tall in its box of 844, so its top stands at 111. The window's height less the panel's read
    // 544 - 733, below zero: a strip of 0px.
    const window = 544;
    const panel = { top: 844 - 733, height: 733 };
    expect(Math.max(0, Math.round(window - panel.height + 32))).toBe(0);
    expect(scrimStrip(panel.top, 0, window)).toBe(143);
    // Once React has sized the box (544 tall, the panel capped at 531.2), the strip is the 45px he saw.
    expect(scrimStrip(12.8, 0, window)).toBe(45);
  });

  it("is measured from the panel itself, where the sheet measures it", () => {
    expect(hook).toContain("topAt.current = rect.top - offset.current;");
    expect(hook).toContain("const next = scrimStrip(topAt.current ?? window.innerHeight - height.current, y, window.innerHeight);");
    // The window's height less the panel's is only the fallback before the first measure.
    expect(hook.match(/window\.innerHeight - height\.current/g)).toHaveLength(1);
  });
});
