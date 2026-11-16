// Build 98 note 2, the work's Listen tap (Updates 98l, from Updates 98k's trace): the tap held the
// main thread for 682ms, 83ms after it, in three restyles of the whole page, about 29,000 elements
// on the Four Discourses. Two were the dock's own: as it arrived it set two values on <html>,
// `html.has-reader-dock { --reader-dock-room }` in app/globals.css and `--reader-dock-card-h`
// written on <html>'s style by ReaderDock's layout effect. A custom property set on <html> is
// inherited by every element, so each one restyled them all (Updates 98h found the same in the mini
// player's `has-now-playing`).
//
// Now nothing the dock sets reaches <html> as a value: the room is set on the page's foot, the
// card's height is written on the card and the foot only when a long name makes it taller, and both
// are registered as not inherited, so each write restyles the elements that read it.
//
// Fails on the code before the mend: the `html.has-reader-dock` rule, no registration, and the
// root's style written.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const CSS = read("app/globals.css");
const DOCK = read("components/bible/ReaderDock.tsx");

/** Every rule's selector list and body, comments taken out. */
function rules(): { selectors: string[]; body: string }[] {
  const css = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: { selectors: string[]; body: string }[] = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push({ selectors: m[1].split(",").map((s) => s.trim()), body: m[2] });
  return out;
}

describe("the dock as it arrives", () => {
  it("sets no value on <html>: the dock's class keys rules on the elements that need them", () => {
    for (const { selectors, body } of rules()) {
      for (const sel of selectors) {
        // A selector whose subject is <html> itself, keyed on the dock's class.
        if (!/^html(?:[.:[][^\s>+~]*)?$/.test(sel) || !sel.includes(".has-reader-dock")) continue;
        // In reader focus the way out of focus and Copy still clear the pill by the mini player's
        // room, set on <html> (named, left: focus mode, not the Listen tap).
        const props = [...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);
        expect(props.filter((p) => p !== "--now-playing-h"), sel).toEqual([]);
        expect(sel, "only in reader focus").toContain(".reader-focus");
      }
    }
  });

  it("keeps the card's room on the page's foot, from values that are not inherited", () => {
    for (const name of ["--reader-dock-room", "--reader-dock-card-h"]) {
      const reg = CSS.match(new RegExp(`@property ${name} \\{([^}]*)\\}`))?.[1] ?? "";
      expect(reg, name).toContain('syntax: "<length>";');
      expect(reg, name).toContain("inherits: false;");
    }
    expect(CSS).toContain("@property --reader-dock-card-h {\n syntax: \"<length>\";\n inherits: false;\n initial-value: 112px;\n}");
    expect(CSS).toContain("html.has-reader-dock .safe-pb-reader,\nhtml.has-reader-dock.has-text-pill .safe-pb {\n --reader-dock-room: calc(var(--reader-dock-card-h, 112px) - 56px);\n}");
  });

  it("writes the card's height on the card and the foot, never on <html>, and only when a long name makes it taller", () => {
    expect(DOCK).not.toMatch(/root\.style\.(setProperty|removeProperty)\(\s*"--reader-dock/);
    expect(DOCK).not.toMatch(/documentElement\.style\.(setProperty|removeProperty)/);
    expect(DOCK).toContain('const FOOT_ROOM = ".safe-pb-reader, html.has-text-pill .safe-pb";');
    expect(DOCK).toContain("const want = px === CARD_PX ? [] : [surface, ...document.querySelectorAll<HTMLElement>(FOOT_ROOM)];");
  });
});
