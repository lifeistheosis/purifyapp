// What opens says what it opens (1.9, build 93 note 15; the rule and his
// words are in ../showOpened.ts).
//
// The page moves with anything that opens, from one mount at the root
// (components/nav/OpenedBridge.tsx). That mount can only follow a part it
// can find: the control that opens it has to name it (`aria-controls`), as a
// screen reader needs it to as well. So every control in app/ and
// components/ that says it opens something (`aria-expanded`) is read here,
// and one that names nothing fails, unless what it opens is a sheet
// (`aria-haspopup="dialog"`: it stands over the page and has nothing to
// bring into sight), or it is listed below by file with the reason.
//
// What a reader would notice if this broke: a new section of a list that
// opens under the tab bar, with the page left where it was. His note, three
// builds running.
//
// A <details> needs nothing: the mount hears its <summary>.
//
// The admin panel (components/admin/) is the owner's own desk on a
// computer, with no tab bar over it, and is the Admin chat's to hold; its
// <details> are followed like any other, and its controls are not read here.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const ROOTS = ["app", "components"];
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) walk(file, out);
    else if (/\.tsx$/.test(name)) out.push(file);
  }
  return out;
}

/**
 * Controls that open something and name nothing, by file: how many, and why
 * the page has nothing to move for them. A number here may only fall.
 */
const IN_PLACE: Record<string, { controls: number; why: string }> = {
  "components/nav/AppNav.tsx": { controls: 1, why: "the website's menu, inside its header, which is fixed to the screen" },
  "components/nav/Navbar.tsx": { controls: 1, why: "the website's menu, inside its header, which is fixed to the screen" },
  "components/nav/DiscoverDropdown.tsx": { controls: 1, why: "a menu hung from the website's header, which is fixed to the screen" },
  "components/i18n/LocaleSwitcher.tsx": {
    controls: 1,
    why: "the language list keeps itself whole on the screen: it stops above the tab bar, and opens upward when there is no room below (components/i18n/LocaleMenu.tsx)",
  },
  "components/i18n/LanguagePicker.tsx": {
    controls: 1,
    why: "the language list keeps itself whole on the screen: it stops above the tab bar, and opens upward when there is no room below (components/i18n/LocaleMenu.tsx)",
  },
  "components/player/SaveOffline.tsx": { controls: 1, why: "the saved line opens inside the player, which is fixed to the screen" },
};

/** The opening tag that holds the attribute at `at`: from its `<` to the `>` that ends it. */
function tagAround(src: string, at: number): string | null {
  for (let from = src.lastIndexOf("<", at); from >= 0; from = src.lastIndexOf("<", from - 1)) {
    if (!/[A-Za-z]/.test(src[from + 1] ?? "")) continue;
    let depth = 0;
    let quote: string | null = null;
    for (let i = from + 1; i < src.length; i += 1) {
      const c = src[i];
      if (quote) {
        if (c === quote && src[i - 1] !== "\\") quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      else if (c === ">" && depth === 0 && src[i - 1] !== "=") {
        if (i > at) return src.slice(from, i + 1);
        break;
      }
    }
  }
  return null;
}

type Control = { file: string; line: number; tag: string };

function controls(): Control[] {
  const out: Control[] = [];
  for (const root of ROOTS) {
    for (const abs of walk(path.join(ROOT, root))) {
      const file = path.relative(ROOT, abs).split(path.sep).join("/");
      if (file.startsWith("components/admin/")) continue;
      // Comments say the attribute's name too: they are not controls.
      const src = readFileSync(abs, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/.*$/gm, (m, lead: string) => lead + " ".repeat(m.length - lead.length));
      for (let at = src.indexOf("aria-expanded="); at >= 0; at = src.indexOf("aria-expanded=", at + 1)) {
        const tag = tagAround(src, at);
        if (!tag) throw new Error(`${file}: an aria-expanded this test could not read, at ${at}`);
        out.push({ file, line: src.slice(0, at).split("\n").length, tag });
      }
    }
  }
  return out;
}

/** Whether a control says what it opens, or opens a sheet. */
const names = (tag: string) => /\baria-controls=/.test(tag) || /\baria-haspopup="dialog"/.test(tag);

describe("what opens says what it opens", () => {
  const all = controls();

  it("there are controls to read, and the reader finds their tags", () => {
    expect(all.length).toBeGreaterThan(30);
    for (const c of all) expect(c.tag.startsWith("<"), `${c.file}:${c.line}`).toBe(true);
  });

  it("every control that opens something names it, opens a sheet, or is listed here with its reason", () => {
    const unnamed: Record<string, number[]> = {};
    for (const c of all) if (!names(c.tag)) (unnamed[c.file] ??= []).push(c.line);
    const over = Object.entries(unnamed)
      .filter(([file, lines]) => lines.length > (IN_PLACE[file]?.controls ?? 0))
      .map(([file, lines]) => `${file}: line ${lines.join(", ")} opens something and does not say what (aria-controls)`);
    expect(over).toEqual([]);
  });

  it("the list of those left in place only ever shortens", () => {
    const unnamed: Record<string, number> = {};
    for (const c of all) if (!names(c.tag)) unnamed[c.file] = (unnamed[c.file] ?? 0) + 1;
    for (const [file, { controls: allowed, why }] of Object.entries(IN_PLACE)) {
      expect(why.length, file).toBeGreaterThan(20);
      expect(unnamed[file] ?? 0, `${file}: fewer are unnamed now, so lower its number here`).toBe(allowed);
    }
  });
});

describe("the wiring", () => {
  it("one mount at the root hears the taps and watches the two attributes", () => {
    const frame = read("components/layout/RootFrame.tsx");
    expect(frame).toContain("<OpenedBridge />");
    expect(frame.split("<OpenedBridge />").length).toBe(2);
    const bridge = read("components/nav/OpenedBridge.tsx");
    // Capturing: the control is measured before its own handler moves anything.
    expect(bridge).toContain('document.addEventListener("click", noteOpeningTap, true)');
    expect(bridge).toContain('attributeFilter: ["aria-expanded", "open"]');
    expect(bridge).toContain("followIfOpened(change.target)");
    // The reader's own scroll lets go of the tap before it.
    expect(bridge).toContain('window.addEventListener("touchmove", noteReaderMoved, { passive: true })');
    expect(bridge).toContain('window.addEventListener("wheel", noteReaderMoved, { passive: true })');
  });

  it("the prayer book is one book: its chapters say so, and no code of its own moves the page for a chapter", () => {
    const book = read("components/prayers/PrayerBookContents.tsx");
    expect(book).toContain("data-shown-whole");
    expect(book).not.toContain("glidePageBy");
    // The chapter still names its page, which is how the mount finds it.
    expect(book).toMatch(/aria-expanded=\{isOpen\}\s+aria-controls=\{pageId\}/);
  });
});
