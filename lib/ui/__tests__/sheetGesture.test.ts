import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { NO_ROOM, roomUnder, sheetTakes, type ScrollBox } from "@/lib/ui/sheetGesture";

/**
 * Build 97 note 8, the owner on the Plus preview's Ambience page: "when you
 * hold down to scroll on the Bible in this context and your thumb reaches
 * outside the Bible ... it starts closing the whole entire window". The sheet
 * asked only about its own body, so a thumb drawn down a window read part way
 * (the preview's Bible, components/billing/plusTry/TryKit.tsx) dragged the
 * whole sheet away and closed it.
 *
 * What would go wrong if this broke: a reader scrolling the verses in a
 * window inside a sheet loses the sheet under the thumb; or a pull on the
 * sheet's own body stops dragging it. The walk with real touch is
 * scripts/sheet-scroll-walk.mjs.
 */

type Box = ScrollBox & { name: string; overflowY: string };

function box(name: string, overflowY: string, scrollTop: number, scrollHeight: number, clientHeight: number, parent: Box | null): Box {
  return { name, overflowY, scrollTop, scrollHeight, clientHeight, parentElement: parent };
}

const style = (el: Box) => el.overflowY;

/** The upgrade sheet's body, the preview's window inside it, a verse inside that. */
function plusPreview(windowTop: number) {
  const body = box("body", "auto", 0, 1400, 760, null);
  const page = box("page", "visible", 0, 1200, 1200, body);
  const win = box("window", "auto", windowTop, 1302, 287, page);
  const verse = box("verse", "visible", 0, 60, 60, win);
  return { body, page, win, verse };
}

describe("the windows under a finger, read as it lands", () => {
  it("a window read part way has room both ways", () => {
    const { body, verse } = plusPreview(423);
    expect(roomUnder(verse, body, style)).toEqual({ above: true, below: true });
  });

  it("a window at its top has room only below, and at its foot only above", () => {
    const top = plusPreview(0);
    expect(roomUnder(top.verse, top.body, style)).toEqual({ above: false, below: true });
    const foot = plusPreview(1302 - 287);
    expect(roomUnder(foot.verse, foot.body, style)).toEqual({ above: true, below: false });
  });

  it("a fraction of a pixel from an end is the end", () => {
    const near = plusPreview(0.4);
    expect(roomUnder(near.verse, near.body, style).above).toBe(false);
    const foot = plusPreview(1302 - 287 - 0.5);
    expect(roomUnder(foot.verse, foot.body, style).below).toBe(false);
  });

  it("the sheet's own body is not counted: its rules are the sheet's", () => {
    const body = box("body", "auto", 300, 1400, 760, null);
    const line = box("line", "visible", 0, 20, 20, body);
    expect(roomUnder(line, body, style)).toEqual(NO_ROOM);
  });

  it("what cannot be scrolled by the reader is not a window", () => {
    const body = box("body", "auto", 0, 1400, 760, null);
    const clipped = box("clipped", "hidden", 200, 900, 300, body);
    const fits = box("fits", "auto", 0, 300, 300, clipped);
    const verse = box("verse", "visible", 0, 20, 20, fits);
    expect(roomUnder(verse, body, style)).toEqual(NO_ROOM);
  });

  it("a window inside a window counts both", () => {
    const body = box("body", "auto", 0, 1400, 760, null);
    const outer = box("outer", "scroll", 0, 900, 300, body);
    const inner = box("inner", "auto", 500, 800, 300, outer);
    const verse = box("verse", "visible", 0, 20, 20, inner);
    expect(roomUnder(verse, body, style)).toEqual({ above: true, below: true });
  });
});

describe("who takes the gesture", () => {
  const read = { above: true, below: true };

  it("a thumb drawn down a window read part way scrolls the window, never the sheet (the fault)", () => {
    expect(sheetTakes({ dy: 7, room: read, bodyTop: 0, atHalf: false })).toBe(false);
    expect(sheetTakes({ dy: 400, room: read, bodyTop: 0, atHalf: false })).toBe(false);
  });

  it("a thumb drawn up a window with more below scrolls it, even at half", () => {
    expect(sheetTakes({ dy: -7, room: read, bodyTop: 0, atHalf: true })).toBe(false);
    expect(sheetTakes({ dy: -7, room: { above: true, below: false }, bodyTop: 0, atHalf: true })).toBe(true);
  });

  it("with no room that way, the sheet's own rules hold as before", () => {
    const top = { above: false, below: true };
    expect(sheetTakes({ dy: 7, room: top, bodyTop: 0, atHalf: false })).toBe(true);
    expect(sheetTakes({ dy: 7, room: top, bodyTop: 40, atHalf: false })).toBe(false);
    expect(sheetTakes({ dy: 7, room: NO_ROOM, bodyTop: 0, atHalf: true })).toBe(true);
    expect(sheetTakes({ dy: -7, room: NO_ROOM, bodyTop: 0, atHalf: true })).toBe(true);
    expect(sheetTakes({ dy: -7, room: NO_ROOM, bodyTop: 0, atHalf: false })).toBe(false);
  });
});

describe("the sheet asks once, on the window as the reader found it", () => {
  const hook = fs.readFileSync(path.join(process.cwd(), "lib/ui/useDraggableSheet.ts"), "utf8");
  const start = hook.slice(hook.indexOf("const onStart = (e: TouchEvent)"), hook.indexOf("const onMove = (e: TouchEvent)"));
  const move = hook.slice(hook.indexOf("const onMove = (e: TouchEvent)"), hook.indexOf("const onEnd = ()"));

  it("reads the room when the finger lands", () => {
    expect(start).toMatch(/room = .*roomUnder/);
  });

  it("decides with sheetTakes and, once left to scrolling, stops following", () => {
    expect(move).toMatch(/if \(!sheetTakes\(\{ dy, room, bodyTop: body\.scrollTop, atHalf: snap\.current === "half" \}\)\) \{\s*tracking = false;\s*return;/);
    expect(move).not.toMatch(/body\.scrollTop <= 0/);
  });
});
