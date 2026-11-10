import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PREPAINT_LOOKS_DARK, PREPAINT_LOOKS_LIGHT, PREPAINT_RETIRED, PREPAINT_THEME_IDS, THEME_PREPAINT } from "@/lib/reader/prepaint";
import {
  FREE_THEMES,
  READING_THEMES,
  READING_THEME_KEY,
  RETIRED_THEMES,
  coerceReadingTheme,
  isFreeTheme,
  isLook,
  themeAttributes,
  themesOfFamily,
} from "@/lib/reader/readingModes";
import { decideThemeWrite } from "@/lib/reader/themeWrite";
import { QUOTE_LOOKS } from "@/lib/share/verseCard";

/**
 * A palette the app no longer offers (lib/reader/readingModes.ts,
 * RETIRED_THEMES).
 *
 * Fire was one of the eighteen looks made for 1.9. The owner took it out the
 * day it was made, before the looks were released (2026-11-10: "also I don't
 * really like the fire theme", then "remove fire"). Three things follow, and
 * this holds each:
 *
 * - the app offers it nowhere: not in the registry the picker and the gate
 *   read, not in the stylesheet, not in the catalogs' words for the looks,
 *   and no picture of it ships;
 * - a device that still stores it (a tester's, since no reader ever had it)
 *   wears the nearest plain dark palette, Candlelight, from the first paint;
 * - nothing made is deleted: what Fire was is kept where the apps do not
 *   reach, and the share picture's own Fire style, a different thing, stays.
 *
 * What a reader would notice if this broke: a tester who had chosen Fire
 * opening the app in plain Dark with their choice lost, or Fire back on a
 * shelf of the picker.
 */
const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const KEPT = "docs/1.9-build/kept/fire-look";

/** The pre-paint script, run against a device that stored `stored`: what it leaves on <html>. */
function prepaint(stored: string | null): Record<string, string> {
  const attrs: Record<string, string> = {};
  const storage = { getItem: (k: string) => (k === READING_THEME_KEY ? stored : null) };
  const doc = { documentElement: { setAttribute: (k: string, v: string) => void (attrs[k] = v) } };
  new Function("localStorage", "document", THEME_PREPAINT)(storage, doc);
  return attrs;
}

describe("a palette the app no longer offers", () => {
  it("is Fire alone, and it stands in for nothing the app has", () => {
    expect(Object.keys(RETIRED_THEMES)).toEqual(["fire"]);
    const ids = new Set<string>(READING_THEMES.map((t) => t.id));
    for (const old of Object.keys(RETIRED_THEMES)) expect(ids.has(old), old).toBe(false);
  });

  it("reads as the nearest plain dark palette: Candlelight, which is Plus as Fire was", () => {
    expect(coerceReadingTheme("fire")).toBe("candlelight");
    const standIn = READING_THEMES.find((t) => t.id === RETIRED_THEMES.fire)!;
    // Plain: a palette of its own, not a look, so no picture comes with it.
    expect(isLook(standIn.id)).toBe(false);
    expect(themeAttributes(standIn.id)).toEqual({ mode: "candlelight", look: null });
    // Dark: its page is near black, as Fire's was (#040301).
    const css = read("app/globals.css");
    const block = css.slice(css.indexOf('html[data-reading-mode="candlelight"] {'));
    expect(/--color-night:\s*(#[0-9a-f]{6});/i.exec(block.slice(0, block.indexOf("}")))?.[1].toLowerCase()).toBe("#050505");
    // Plus, in the same family: a reader who could wear Fire can wear it, and one who could not gets no more than before.
    expect(isFreeTheme(standIn.id)).toBe(false);
    expect(FREE_THEMES).not.toContain(standIn.id);
    expect(standIn.family).toBe("night");
  });

  it("leaves every other stored value as it was: the app's own palettes whole, anything unknown Dark", () => {
    for (const t of READING_THEMES) expect(coerceReadingTheme(t.id), t.id).toBe(t.id);
    for (const odd of ["sepia", "Fire", "FIRE", " fire", "fire ", "flame", "", null, undefined, "constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(coerceReadingTheme(odd), String(odd)).toBe("default");
    }
  });

  it("opens in its stand-in from the first paint, with no frame of Dark and no look left on the page", () => {
    expect(PREPAINT_RETIRED).toEqual(RETIRED_THEMES);
    for (const [old, now] of Object.entries(PREPAINT_RETIRED)) {
      expect(PREPAINT_THEME_IDS, now).toContain(now);
      expect([...PREPAINT_THEME_IDS, ...PREPAINT_LOOKS_DARK, ...PREPAINT_LOOKS_LIGHT], old).not.toContain(old);
      const { mode, look } = themeAttributes(coerceReadingTheme(old));
      expect(look).toBeNull();
      // Exactly what the controller puts on the page a frame later.
      expect(prepaint(old)).toEqual({ "data-reading-mode": mode });
    }
    expect(prepaint("fire")).toEqual({ "data-reading-mode": "candlelight" });
    // A name that only looks like a stored palette is nothing, as before.
    for (const odd of ["constructor", "toString", "__proto__", "Fire"]) expect(prepaint(odd), odd).toEqual({});
  });

  it("cannot be written again: the server refuses it as it refuses any unknown palette", () => {
    const plus = { enforced: false };
    expect(decideThemeWrite("fire", null, plus)).toEqual({ ok: false, status: 400, error: "unknown palette" });
    expect(decideThemeWrite("candlelight", null, plus)).toMatchObject({ ok: true, theme: "candlelight" });
  });
});

describe("Fire is offered nowhere in the app", () => {
  it("is on no shelf of the picker, and in no list the pre-paint script reads", () => {
    expect(themesOfFamily("night").map((t) => t.id)).toEqual(["nightsky", "dawn", "incense", "candlelight"]);
    for (const t of READING_THEMES) {
      expect(t.id).not.toBe("fire");
      expect(t.label).not.toBe("Fire");
      expect(t.blurbKey).not.toBe("settings.paletteFireHint");
    }
  });

  it("has no rule in the stylesheet and no picture in what the apps carry", () => {
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/data-look="fire"|data-palette="fire"|--room-fire|fire-room/);
    expect(fs.existsSync(path.join(ROOT, "public/themes/fire-room.webp"))).toBe(false);
    expect(fs.readdirSync(path.join(ROOT, "public/themes")).filter((f) => /fire/i.test(f))).toEqual([]);
  });

  it("has no line of its own in any of the 21 catalogs", () => {
    const dir = path.join(ROOT, "lib/i18n/messages");
    const codes = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(codes).toHaveLength(21);
    for (const file of codes) {
      const catalog = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Record<string, string>;
      expect(catalog["settings.paletteFireHint"], file).toBeUndefined();
    }
  });

  it("the share picture's Fire style is a different thing, and stays", () => {
    expect(QUOTE_LOOKS.map((l) => l.id)).toContain("fire");
    expect(QUOTE_LOOKS.find((l) => l.id === "fire")?.nameKey).toBe("picture.look.fire");
    const en = JSON.parse(read("lib/i18n/messages/en.json")) as Record<string, string>;
    expect(en["picture.look.fire"]).toBe("Fire");
  });
});

describe("nothing made is deleted: what Fire was is kept, out of the app's reach", () => {
  it("its rules, its picture, its words and a still are in the kept folder, with a note that says what, when and why", () => {
    for (const file of ["README.md", "fire.css", "fire-room.webp", "words.json", "fire-look-2026-11-10.png"]) {
      expect(fs.existsSync(path.join(ROOT, KEPT, file)), file).toBe(true);
    }
    const css = read(`${KEPT}/fire.css`);
    for (const part of ['html[data-look="fire"] {', "--color-night: #040301;", 'html[data-look="fire"] .page-open-rule {', '.set-mode-page[data-palette="fire"] {', "--room-fire:"]) {
      expect(css, part).toContain(part);
    }
    const picture = fs.readFileSync(path.join(ROOT, KEPT, "fire-room.webp")).subarray(0, 12);
    expect(picture.subarray(0, 4).toString("latin1")).toBe("RIFF");
    expect(picture.subarray(8, 12).toString("latin1")).toBe("WEBP");
    const words = JSON.parse(read(`${KEPT}/words.json`)) as { key: string; words: Record<string, string> };
    expect(words.key).toBe("settings.paletteFireHint");
    expect(Object.keys(words.words)).toHaveLength(21);
    expect(words.words.en).toBe("Flames at the foot of the page, embers rising in the dark");
    const note = read(`${KEPT}/README.md`);
    for (const said of ["2026-11-10", "remove fire", "Candlelight", "picture.look.fire", "If it is ever wanted again"]) expect(note, said).toContain(said);
    expect(note).not.toContain("—");
  });

  it("nothing the apps are made of reaches into the kept folder", () => {
    const sources = (dir: string): string[] =>
      fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : sources(rel);
        return /\.(tsx?|css|mjs|js|json)$/.test(e.name) ? [rel] : [];
      });
    // A comment may name the folder, where a reader of the code is sent to it. Nothing loads a file from it.
    const naming = [...sources("app"), ...sources("components"), ...sources("lib"), ...sources("public")].filter((f) => read(f).includes("kept/fire-look"));
    expect(naming.sort()).toEqual(["app/globals.css", "lib/reader/readingModes.ts"]);
    for (const f of naming) expect(read(f).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""), f).not.toContain("kept/fire-look");
  });

  it("the script paints its picture only when asked, and only into the kept folder", () => {
    const script = read("scripts/theme-pictures.mjs");
    expect(script).toContain('const KEPT = { fire: path.join(ROOT, "docs", "1.9-build", "kept", "fire-look") };');
    expect(script).toContain("if (keptOnly) {");
    expect(script).toContain("const file = path.join(KEPT[id] ?? OUT, `${id}-${name}.webp`);");
    expect(script).toContain('if (process.argv.includes("--kept")) {');
  });
});
