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
  isCollectionTheme,
  isFreeTheme,
  isLook,
  themeAttributes,
  themesOfFamily,
} from "@/lib/reader/readingModes";
import { readBeforeNight } from "@/lib/reader/night";
import { decideThemeWrite } from "@/lib/reader/themeWrite";
import { QUOTE_LOOKS } from "@/lib/share/verseCard";
import { cleanReadingSlice, mergeReading } from "@/lib/sync/keptMerge";
import { DRAWINGS, KEPT_DRAWINGS } from "@/scripts/theme-pictures.mjs";

/**
 * The palettes the app no longer offers (lib/reader/readingModes.ts,
 * RETIRED_THEMES).
 *
 * Fire was one of the eighteen looks made for 1.9. The owner took it out the
 * day it was made, before the looks were released (2026-11-10: "also I don't
 * really like the fire theme", then "remove fire"). Galilee and Patmos, the
 * two looks of the sea, followed after the first test builds (2026-11-13:
 * "remove the sea theme from the app", and asked which of the two, "Both";
 * build 95 note 16). Three things follow for each, and this holds them:
 *
 * - the app offers it nowhere: not in the registry the picker and the gate
 *   read, not in the pre-paint script, not in the stylesheet, not in the
 *   catalogs' words for the looks, and no picture of it ships;
 * - a device that still stores it (a tester's, stored there or arriving by
 *   sync from an older build) wears the kept palette nearest it from the
 *   first paint: dark stays dark, light stays light, and Plus as it was;
 * - nothing made is deleted: what it was is kept where the apps do not
 *   reach, and the share picture's own Fire style, a different thing, stays.
 *
 * What a reader would notice if this broke: a tester who had chosen one of
 * them opening the app in plain Dark with their choice lost, a flash of the
 * wrong palette as it opened, or the look back on a shelf of the picker.
 */
const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const KEPT_FIRE = "docs/1.9-build/kept/fire-look";
const CSS = read("app/globals.css");
const BARE_CSS = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** The pre-paint script, run against a device that stored `stored`: what it leaves on <html>. */
function prepaint(stored: string | null): Record<string, string> {
  const attrs: Record<string, string> = {};
  const storage = { getItem: (k: string) => (k === READING_THEME_KEY ? stored : null) };
  const doc = { documentElement: { setAttribute: (k: string, v: string) => void (attrs[k] = v) } };
  new Function("localStorage", "document", THEME_PREPAINT)(storage, doc);
  return attrs;
}

/** What the controller puts on <html> for a palette, as the pre-paint script writes it. */
function worn(theme: Parameters<typeof themeAttributes>[0]): Record<string, string> {
  const { mode, look } = themeAttributes(theme);
  return { ...(mode ? { "data-reading-mode": mode } : {}), ...(look ? { "data-look": look } : {}) };
}

describe("a palette the app no longer offers", () => {
  it("is Fire, Galilee, Patmos or Desert, and none of them stands in for anything the app has", () => {
    expect(Object.keys(RETIRED_THEMES)).toEqual(["fire", "galilee", "patmos", "desert"]);
    const ids = new Set<string>(READING_THEMES.map((t) => t.id));
    for (const [old, now] of Object.entries(RETIRED_THEMES)) {
      expect(ids.has(old), old).toBe(false);
      // A stand-in is a palette the app has, so no stored value ever needs two steps.
      expect(ids.has(now), `${old} -> ${now}`).toBe(true);
    }
  });

  it("reads Fire as the nearest plain dark palette: Candlelight, which is Plus as Fire was", () => {
    expect(coerceReadingTheme("fire")).toBe("candlelight");
    const standIn = READING_THEMES.find((t) => t.id === RETIRED_THEMES.fire)!;
    // Plain: a palette of its own, not a look, so no picture comes with it.
    expect(isLook(standIn.id)).toBe(false);
    expect(themeAttributes(standIn.id)).toEqual({ mode: "candlelight", look: null });
    // Dark: its page is near black, as Fire's was (#040301).
    const block = CSS.slice(CSS.indexOf('html[data-reading-mode="candlelight"] {'));
    expect(/--color-night:\s*(#[0-9a-f]{6});/i.exec(block.slice(0, block.indexOf("}")))?.[1].toLowerCase()).toBe("#050505");
    // Plus, in the same family: a reader who could wear Fire can wear it, and one who could not gets no more than before.
    expect(isFreeTheme(standIn.id)).toBe(false);
    expect(FREE_THEMES).not.toContain(standIn.id);
    expect(standIn.family).toBe("night");
  });

  it("leaves every other stored value as it was: the app's own palettes whole, anything unknown Dark", () => {
    for (const t of READING_THEMES) expect(coerceReadingTheme(t.id), t.id).toBe(t.id);
    for (const odd of ["sepia", "Fire", "FIRE", " fire", "fire ", "flame", "Galilee", "PATMOS", " galilee", "patmos ", "sea", "", null, undefined, "constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(coerceReadingTheme(odd), String(odd)).toBe("default");
    }
  });

  it("opens in its stand-in from the first paint, exactly as the controller wears it a frame later", () => {
    expect(PREPAINT_RETIRED).toEqual(RETIRED_THEMES);
    for (const [old, now] of Object.entries(PREPAINT_RETIRED)) {
      // The stand-in is one the script applies; the old id is in no list it reads.
      expect([...PREPAINT_THEME_IDS, ...PREPAINT_LOOKS_DARK, ...PREPAINT_LOOKS_LIGHT], now).toContain(now);
      expect([...PREPAINT_THEME_IDS, ...PREPAINT_LOOKS_DARK, ...PREPAINT_LOOKS_LIGHT], old).not.toContain(old);
      // Exactly what the controller puts on the page a frame later: no flash of another palette on the way.
      expect(prepaint(old), old).toEqual(worn(coerceReadingTheme(old)));
    }
    expect(prepaint("fire")).toEqual({ "data-reading-mode": "candlelight" });
    // A name that only looks like a stored palette is nothing, as before.
    for (const odd of ["constructor", "toString", "__proto__", "Fire", "Galilee", "Patmos"]) expect(prepaint(odd), odd).toEqual({});
  });

  it("cannot be written again: the server refuses it as it refuses any unknown palette", () => {
    const plus = { enforced: false };
    for (const old of Object.keys(RETIRED_THEMES)) {
      expect(decideThemeWrite(old, null, plus), old).toEqual({ ok: false, status: 400, error: "unknown palette" });
    }
    for (const now of ["candlelight", "forest", "linen"]) expect(decideThemeWrite(now, null, plus), now).toMatchObject({ ok: true, theme: now });
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
    expect(BARE_CSS).not.toMatch(/data-look="fire"|data-palette="fire"|--room-fire|fire-room/);
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
      expect(fs.existsSync(path.join(ROOT, KEPT_FIRE, file)), file).toBe(true);
    }
    const css = read(`${KEPT_FIRE}/fire.css`);
    for (const part of ['html[data-look="fire"] {', "--color-night: #040301;", 'html[data-look="fire"] .page-open-rule {', '.set-mode-page[data-palette="fire"] {', "--room-fire:"]) {
      expect(css, part).toContain(part);
    }
    const picture = fs.readFileSync(path.join(ROOT, KEPT_FIRE, "fire-room.webp")).subarray(0, 12);
    expect(picture.subarray(0, 4).toString("latin1")).toBe("RIFF");
    expect(picture.subarray(8, 12).toString("latin1")).toBe("WEBP");
    const words = JSON.parse(read(`${KEPT_FIRE}/words.json`)) as { key: string; words: Record<string, string> };
    expect(words.key).toBe("settings.paletteFireHint");
    expect(Object.keys(words.words)).toHaveLength(21);
    expect(words.words.en).toBe("Flames at the foot of the page, embers rising in the dark");
    const note = read(`${KEPT_FIRE}/README.md`);
    for (const said of ["2026-11-10", "remove fire", "Candlelight", "picture.look.fire", "If it is ever wanted again"]) expect(note, said).toContain(said);
    expect(note).not.toContain("—");
  });

  it("the script paints its picture only when asked, and only into the kept folder", () => {
    const script = read("scripts/theme-pictures.mjs");
    expect(script).toContain('fire: path.join(ROOT, "docs", "1.9-build", "kept", "fire-look"),');
    expect(script).toContain("if (keptOnly) {");
    expect(script).toContain("const file = path.join(KEPT[id] ?? OUT, `${id}-${name}.webp`);");
    expect(script).toContain('if (process.argv.includes("--kept")) {');
  });
});

// ── The two looks of the sea (2026-11-13, build 95 note 16) ─────────────

/** Each look of the sea: its stand-in, what it was worn over, and its kept folder. */
const SEA = [
  { id: "galilee", name: "Galilee", over: "dark", standIn: "forest", standInName: "Forest", folder: "docs/1.9-build/kept/galilee-look" },
  { id: "patmos", name: "Patmos", over: "light", standIn: "linen", standInName: "Linen", folder: "docs/1.9-build/kept/patmos-look" },
] as const;
/** Desert, the fourth land look, came out the same day (his "all recs", about 14:29 UTC), and is held as the sea's two are. */
const DESERT = { id: "desert", name: "Desert", over: "light", standIn: "rose", standInName: "Roses", folder: "docs/1.9-build/kept/desert-look" } as const;
/** Every look taken out on 2026-11-13, with his words that took it out (its kept note quotes them). */
const GONE = [
  { ...SEA[0], said: ["remove the sea theme from the app", "Both"] },
  { ...SEA[1], said: ["remove the sea theme from the app", "Both"] },
  { ...DESERT, said: ["all recs"] },
] as const;

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
/** A colour in OKLab, where a distance is what the eye sees as a difference. */
function oklab(hex: string): Rgb {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const apart = (a: string, b: string) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]));
/** A palette's ground and ink, as the first block with exactly this selector writes them. */
function groundAndInk(sheet: string, selector: string): { ground: string; ink: string } {
  const at = sheet.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  const block = sheet.slice(at, sheet.indexOf("}", at));
  const token = (name: string) => new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`, "i").exec(block)?.[1].toLowerCase() ?? "";
  return { ground: token("night"), ink: token("paper") };
}

describe("the two looks of the sea and Desert are offered nowhere in the app", () => {
  it("are on no shelf of the picker: the Land and sea family keeps its other three", () => {
    expect(themesOfFamily("land").map((t) => t.id)).toEqual(["athos", "forest", "jordan"]);
    for (const t of READING_THEMES) {
      for (const sea of GONE) {
        expect(t.id as string, sea.id).not.toBe(sea.id);
        expect(t.label, sea.id).not.toBe(sea.name);
        expect(t.labelKey, sea.id).not.toBe(`settings.palette${sea.name}`);
        expect(t.blurbKey, sea.id).not.toBe(`settings.palette${sea.name}Hint`);
      }
    }
  });

  it("are in no list the pre-paint script reads", () => {
    for (const sea of GONE) {
      expect([...PREPAINT_THEME_IDS, ...PREPAINT_LOOKS_DARK, ...PREPAINT_LOOKS_LIGHT], sea.id).not.toContain(sea.id);
      // The script's own text names each only as a stored value to send on.
      expect(THEME_PREPAINT.split(`"${sea.id}"`).length - 1, sea.id).toBe(1);
      expect(THEME_PREPAINT, sea.id).toContain(`"${sea.id}":"${sea.standIn}"`);
    }
  });

  it("have no rule in the stylesheet and no picture in what the apps carry", () => {
    for (const sea of GONE) {
      expect(BARE_CSS, sea.id).not.toContain(`data-look="${sea.id}"`);
      expect(BARE_CSS, sea.id).not.toContain(`data-palette="${sea.id}"`);
      expect(BARE_CSS, sea.id).not.toContain(`--scene-${sea.id}`);
      expect(BARE_CSS, sea.id).not.toContain(`/themes/${sea.id}.svg`);
      expect(fs.existsSync(path.join(ROOT, `public/themes/${sea.id}.svg`)), sea.id).toBe(false);
    }
    expect(fs.readdirSync(path.join(ROOT, "public/themes")).filter((f) => /galilee|patmos|desert/i.test(f))).toEqual([]);
    // Their drawings are no longer among those the plain run writes to public/themes.
    expect(Object.keys(DRAWINGS).filter((f) => /galilee|patmos|desert/.test(f))).toEqual([]);
  });

  it("have no words of their own in any of the 21 catalogs", () => {
    const dir = path.join(ROOT, "lib/i18n/messages");
    const codes = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(codes).toHaveLength(21);
    for (const file of codes) {
      const catalog = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Record<string, string>;
      for (const sea of GONE) {
        expect(catalog[`settings.palette${sea.name}`], `${file}: ${sea.id}`).toBeUndefined();
        expect(catalog[`settings.palette${sea.name}Hint`], `${file}: ${sea.id}`).toBeUndefined();
      }
    }
  });
});

describe("a device that stores one of the looks taken out wears the kept look nearest it", () => {
  it("Galilee as Forest, Patmos as Linen and Desert as Roses, by every reader of a stored palette", () => {
    expect(RETIRED_THEMES.galilee).toBe("forest");
    expect(RETIRED_THEMES.patmos).toBe("linen");
    expect(RETIRED_THEMES.desert).toBe("rose");
    for (const sea of GONE) {
      expect(coerceReadingTheme(sea.id), sea.id).toBe(sea.standIn);
      // What night reading put down and gives back (lib/reader/night.ts) reads it the same way.
      expect(readBeforeNight(JSON.stringify({ theme: sea.id, focus: false }))?.theme, sea.id).toBe(sea.standIn);
    }
  });

  it("dark stays dark and light stays light: the stand-in is a look worn over the same palette", () => {
    for (const sea of GONE) {
      const standIn = READING_THEMES.find((t) => t.id === sea.standIn)!;
      expect(standIn.look, sea.id).toBe(sea.over);
      expect(themeAttributes(standIn.id), sea.id).toEqual({ mode: sea.over === "light" ? "parchment" : null, look: sea.standIn });
    }
    expect(prepaint("galilee")).toEqual({ "data-look": "forest" });
    expect(prepaint("patmos")).toEqual({ "data-reading-mode": "parchment", "data-look": "linen" });
    expect(prepaint("desert")).toEqual({ "data-reading-mode": "parchment", "data-look": "rose" });
  });

  it("Plus as it was: the same reader is entitled to the stand-in, and no reader gets more than before", () => {
    for (const sea of GONE) {
      expect(isFreeTheme(sea.standIn), sea.id).toBe(false);
      expect(isCollectionTheme(sea.standIn), sea.id).toBe(false);
      expect(isLook(sea.standIn), sea.id).toBe(true);
    }
  });

  it("is the nearest by ground and ink of the kept palettes worn over the same ground, the Holy Mountain aside while it is reworked", () => {
    for (const sea of GONE) {
      // The look's own ground and ink, from its rules as they stood (kept beside its picture).
      const own = groundAndInk(read(`${sea.folder}/${sea.id}.css`), `html[data-look="${sea.id}"]`);
      expect(own.ground && own.ink, sea.id).toBeTruthy();
      // Every Plus palette of the same ground that the app keeps: the looks over it, and over Dark the two plain palettes.
      // The Holy Mountain is being reworked or removed at his word (build 95 note 16), so it stands in for nothing.
      const kept = READING_THEMES.filter((t) => !isFreeTheme(t.id) && !isCollectionTheme(t.id) && t.id !== "athos").filter((t) =>
        t.look ? t.look === sea.over : sea.over === "dark",
      );
      const far = kept
        .map((t) => {
          const mine = groundAndInk(BARE_CSS, t.look ? `html[data-look="${t.id}"]` : `html[data-reading-mode="${t.id}"]`);
          return { id: t.id, by: apart(own.ground, mine.ground) + apart(own.ink, mine.ink) };
        })
        .sort((a, b) => a.by - b.by);
      expect(far.length, sea.id).toBeGreaterThan(5);
      expect(far[0].id, `${sea.id}: ${far.map((f) => `${f.id} ${f.by.toFixed(4)}`).join(", ")}`).toBe(sea.standIn);
    }
  });

  it("arriving by sync from an older build, it travels as it was stored and is worn as its stand-in", () => {
    for (const sea of GONE) {
      // A reading slice from a device on an older build: the stored value travels untouched (lib/sync/keptMerge.ts)...
      const remote = cleanReadingSlice({ at: 20, values: { [READING_THEME_KEY]: sea.id } });
      const merged = mergeReading(cleanReadingSlice({ at: 10, values: { [READING_THEME_KEY]: "default" } }), remote);
      expect(merged.values[READING_THEME_KEY], sea.id).toBe(sea.id);
      // ...and this build wears what stands in for it, from the first paint on.
      expect(coerceReadingTheme(merged.values[READING_THEME_KEY]), sea.id).toBe(sea.standIn);
      expect(prepaint(merged.values[READING_THEME_KEY] ?? null), sea.id).toEqual(worn(sea.standIn));
    }
  });
});

describe("nothing made is deleted: what each look taken out was is kept, out of the app's reach", () => {
  it("its rules, its picture, its words and a still are in its own folder, with a note that says what, when and why", () => {
    for (const sea of GONE) {
      for (const file of ["README.md", `${sea.id}.css`, `${sea.id}.svg`, "words.json", `${sea.id}-look-2026-11-13.png`]) {
        expect(fs.existsSync(path.join(ROOT, sea.folder, file)), `${sea.id}: ${file}`).toBe(true);
      }
      const css = read(`${sea.folder}/${sea.id}.css`);
      for (const part of [`html[data-look="${sea.id}"] {`, `html[data-look="${sea.id}"] .lit-surface {`, `:where(html[data-look="${sea.id}"]) ::placeholder {`, `.set-mode-page[data-palette="${sea.id}"] {`, `--scene-${sea.id}: url("/themes/${sea.id}.svg");`]) {
        expect(css, `${sea.id}: ${part}`).toContain(part);
      }
      const still = fs.readFileSync(path.join(ROOT, sea.folder, `${sea.id}-look-2026-11-13.png`)).subarray(0, 8);
      expect(still.toString("latin1"), sea.id).toBe("\x89PNG\r\n\x1a\n");
      const words = JSON.parse(read(`${sea.folder}/words.json`)) as { keys: Record<string, Record<string, string>> };
      expect(Object.keys(words.keys), sea.id).toEqual([`settings.palette${sea.name}`, `settings.palette${sea.name}Hint`]);
      for (const by of Object.values(words.keys)) expect(Object.keys(by), sea.id).toHaveLength(21);
      expect(words.keys[`settings.palette${sea.name}`].en, sea.id).toBe(sea.name);
      const note = read(`${sea.folder}/README.md`);
      for (const said of ["2026-11-13", ...sea.said, sea.standInName, "If it is ever wanted again"]) expect(note, `${sea.id}: ${said}`).toContain(said);
      expect(note, sea.id).not.toContain("—");
    }
    expect(read(`${SEA[0].folder}/galilee.css`)).toContain("--color-night: #06181d;");
    expect(read(`${SEA[1].folder}/patmos.css`)).toContain("--color-night: #f7f7f5;");
    expect(read(`${DESERT.folder}/desert.css`)).toContain("--color-night: #efe2d9;");
  });

  it("each picture is what its painter draws, to the letter, so --kept makes it again", () => {
    expect(Object.keys(KEPT_DRAWINGS).sort()).toEqual(["desert.svg", "galilee.svg", "patmos.svg"]);
    for (const sea of GONE) {
      const draw = (KEPT_DRAWINGS as Record<string, () => { svg: string }>)[`${sea.id}.svg`];
      expect(read(`${sea.folder}/${sea.id}.svg`), sea.id).toBe(`${draw().svg}\n`);
    }
    const script = read("scripts/theme-pictures.mjs");
    expect(script).toContain('galilee: path.join(ROOT, "docs", "1.9-build", "kept", "galilee-look"),');
    expect(script).toContain('patmos: path.join(ROOT, "docs", "1.9-build", "kept", "patmos-look"),');
    expect(script).toContain('desert: path.join(ROOT, "docs", "1.9-build", "kept", "desert-look"),');
    // Written only with --kept, and only into its own folder.
    expect(script).toContain('const dir = KEPT[file.replace(/\\.svg$/, "")];');
    expect(script).toContain("fs.writeFileSync(path.join(dir, file), text + \"\\n\");");
    expect(script.slice(script.indexOf('if (process.argv.includes("--kept")) {'))).toContain("writeKeptDrawings();");
  });
});

describe("nothing the apps are made of reaches into a kept folder", () => {
  it("a comment may name one, where a reader of the code is sent to it; nothing loads a file from it", () => {
    const sources = (dir: string): string[] =>
      fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : sources(rel);
        return /\.(tsx?|css|mjs|js|json)$/.test(e.name) ? [rel] : [];
      });
    const all = [...sources("app"), ...sources("components"), ...sources("lib"), ...sources("public")];
    for (const folder of ["kept/fire-look", "kept/galilee-look", "kept/patmos-look", "kept/desert-look"]) {
      const naming = all.filter((f) => read(f).includes(folder));
      expect(naming.sort(), folder).toEqual(["app/globals.css", "lib/reader/readingModes.ts"]);
      for (const f of naming) expect(read(f).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""), `${f}: ${folder}`).not.toContain(folder);
    }
  });
});
