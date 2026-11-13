import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { SIZE_CLASSES } from "@/components/reader/ReaderPrefs";
import { FirstFocus } from "@/components/settings/FirstFocus";
import { Switch, Track } from "@/components/settings/LitPanel";
import { ReaderSizeControl, ReaderSizeRow } from "@/components/settings/ReaderSize";
import { ModePages } from "@/components/settings/ReadingModePages";
import { getMessages } from "@/lib/i18n";
import { ANSWER_PICTURES } from "@/lib/onboarding/pictures";
import { INTENTS } from "@/lib/onboarding/space";
import { READING_THEMES, isFreeTheme, type ReadingTheme } from "@/lib/reader/readingModes";

import { JOHN_1_OPENING } from "../preview";

/**
 * Settings as it is drawn from 1.8: the owner's pick A of round 3, "Lit
 * panels" (Homebase/boards/purify-master/variants/r3-01-settings, locked
 * 2026-10-30), after his note 9 of build 80: "it feels vibe coded, like
 * clicking buttons on a screen". Each group a raised panel, each choice a
 * carved track, on and off a switch; the size on a verse of John with a
 * slider, the reading modes as small pages in their own colours, First focus
 * as onboarding's picture cards. Which rows there are, and where they lead,
 * is lib/nav/__tests__/oneSettings.test.ts; the slider's rules
 * sizeSlider.test.ts.
 */

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const en = getMessages("en");

function draw(node: ReactElement, locale = "en"): string {
  return renderToString(
    createElement(MessagesProvider, { locale, messages: getMessages(locale) } as ProviderProps, node),
  );
}

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** Every rule as [selector, body], in order, at-rules' insides included. */
const RULES: [string, string][] = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]]);
/** The declarations of every rule this selector is one of, merged in order. */
function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [sel, body] of RULES) {
    if (sel !== selector && !sel.split(",").some((s) => s.trim() === selector)) continue;
    for (const d of body.split(";")) {
      const at = d.indexOf(":");
      if (at > 0) out[d.slice(0, at).trim()] = d.slice(at + 1).trim();
    }
  }
  return out;
}
/** The theme's own block (the Dark palette). */
const THEME = (() => {
  const at = CSS.indexOf("@theme {");
  const body = CSS.slice(at, CSS.indexOf("\n}", at));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
})();

/** A name or line as React writes it into HTML. */
const html = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

const FREE_ONLY = (theme: ReadingTheme) => isFreeTheme(theme);
const EVERY = () => true;

describe("the reading modes", () => {
  /** Each page's button: its palette, pressed or not, its title, and what is under it. */
  const pages = (drawn: string) =>
    [...drawn.matchAll(/<button type="button" aria-pressed="(true|false)" title="([^"]*)" class="set-mode">([\s\S]*?)<\/button>/g)].map(
      ([, pressed, title, inner]) => ({
        pressed: pressed === "true",
        title,
        palette: /data-palette="([^"]+)"/.exec(inner)?.[1] ?? null,
        checked: inner.includes("set-mode-check"),
        name: /class="set-mode-name">([^<]*)</.exec(inner)?.[1] ?? null,
        plus: inner.includes("set-mode-plus"),
        inner,
      }),
    );

  it("draws each as a small page of the Bible in its own palette, in the order the app lists them", () => {
    const drawn = draw(createElement(ModePages, { theme: "default", font: "serif", allows: EVERY, locked: false, onPick: () => {} }));
    const got = pages(drawn);
    expect(got.map((p) => p.palette)).toEqual(["default", "parchment", "black", "candlelight", "monastery"]);
    expect(got.map((p) => p.name)).toEqual(["Dark", "Light", "True black", "Candlelight", "Monastery"]);
    for (const p of got) {
      // John 1 as the Bible opens it: its name, its chapter, its first verses.
      expect(p.inner).toContain(">John<");
      expect(p.inner).toContain(">Chapter 1<");
      expect(p.inner).toContain(html(JOHN_1_OPENING[0].text));
      expect(p.inner).toContain('lang="en" dir="ltr"');
    }
    expect(JOHN_1_OPENING[0].text).toBe("In the beginning was the Word, and the Word was with God, and the Word was God.");
    expect(JOHN_1_OPENING.map((v) => v.n)).toEqual([1, 2, 3, 4]);
  });

  it("lights and checks the one applied, and only it", () => {
    const got = pages(draw(createElement(ModePages, { theme: "parchment", font: "serif", allows: EVERY, locked: false, onPick: () => {} })));
    expect(got.filter((p) => p.pressed).map((p) => p.palette)).toEqual(["parchment"]);
    expect(got.filter((p) => p.checked).map((p) => p.palette)).toEqual(["parchment"]);
  });

  it("says Purify Plus under a paid page only once the gate has said no, and keeps each palette's line as its title", () => {
    const open = pages(draw(createElement(ModePages, { theme: "default", font: "serif", allows: EVERY, locked: false, onPick: () => {} })));
    expect(open.some((p) => p.plus)).toBe(false);
    const shut = pages(draw(createElement(ModePages, { theme: "default", font: "serif", allows: FREE_ONLY, locked: true, onPick: () => {} })));
    expect(shut.filter((p) => p.plus).map((p) => p.palette)).toEqual(["candlelight", "monastery"]);
    // The export walk reads each palette's line from here, in the reader's language.
    expect(shut.map((p) => p.title)).toEqual([
      en["settings.paletteDarkHint"],
      en["settings.paletteLightHint"],
      en["settings.paletteTrueBlackHint"],
      `${en["settings.paletteCandlelightHint"]}. Purify Plus.`,
      `${en["settings.paletteMonasteryHint"]}. Purify Plus.`,
    ]);
    // While the gate is still asking, a paid palette that is the reader's own
    // is not lit: the app is in Dark until the answer comes, and the check
    // stands on what the app is wearing (build 93 note 3).
    const asking = pages(draw(createElement(ModePages, { theme: "monastery", font: "serif", allows: FREE_ONLY, locked: false, onPick: () => {} })));
    expect(asking.filter((p) => p.pressed).map((p) => p.palette)).toEqual(["default"]);
    expect(asking.filter((p) => p.checked).map((p) => p.palette)).toEqual(["default"]);
    expect(asking.some((p) => p.plus)).toBe(false);
    // Where the page itself says what it is in (after sunset, Candlelight at
    // Vespers over the reader's own Light), the check stands there.
    const night = pages(draw(createElement(ModePages, { theme: "parchment", worn: "candlelight", font: "serif", allows: EVERY, locked: false, onPick: () => {} })));
    expect(night.filter((p) => p.pressed).map((p) => p.palette)).toEqual(["candlelight"]);
    expect(night.filter((p) => p.checked).map((p) => p.palette)).toEqual(["candlelight"]);
  });

  it("shows the two earned palettes on a row of their own under the five, as goals with how far the reader is until earned (1.9, rec 79)", () => {
    const drawn = draw(createElement(ModePages, { theme: "default", font: "serif", allows: EVERY, locked: false, onPick: () => {} }));
    // The five as ever (pages() reads the buttons that apply a palette), then the two.
    expect(pages(drawn).map((p) => p.palette)).toEqual(["default", "parchment", "black", "candlelight", "monastery"]);
    expect(drawn).toContain('data-count="5"');
    expect([...drawn.matchAll(/class="set-mode-page" data-palette="([^"]+)"/g)].map((m) => m[1])).toEqual(["default", "parchment", "black", "candlelight", "monastery", "councils", "cappadocian"]);
    expect(drawn).toMatch(/class="set-modes set-modes-earned" data-count="2"/);
    // Nothing is earned in the first draw (the device's reading is read after it): both are goals.
    expect(drawn.match(/data-palette-goal="(councils|cappadocian)"/g)).toHaveLength(2);
    expect(drawn).toContain('<span class="set-mode-progress">0 of 19</span>');
    expect(drawn).toContain('<span class="set-mode-progress">0 of 3</span>');
    // One already applied is a palette, not a goal, so it can be put down again.
    const applied = draw(createElement(ModePages, { theme: "councils", font: "serif", allows: EVERY, locked: false, onPick: () => {} }));
    expect(applied.match(/data-palette-goal="(councils|cappadocian)"/g)).toEqual(['data-palette-goal="cappadocian"']);
    expect(pages(applied).map((p) => p.palette)).toEqual(["default", "parchment", "black", "candlelight", "monastery", "councils"]);
  });

  it("keeps the looks on their own page, and stands the one applied here as a sixth (1.9)", () => {
    // The row is still the five: eighteen more would not be a row.
    const five = pages(draw(createElement(ModePages, { theme: "default", font: "serif", allows: EVERY, locked: false, onPick: () => {} })));
    expect(five).toHaveLength(5);
    const worn = draw(createElement(ModePages, { theme: "athos", font: "serif", allows: EVERY, locked: false, onPick: () => {} }));
    const got = pages(worn);
    expect(got.map((p) => p.palette)).toEqual(["default", "parchment", "black", "candlelight", "monastery", "athos"]);
    expect(got.filter((p) => p.pressed).map((p) => p.palette)).toEqual(["athos"]);
    expect(got[5].name).toBe("Holy Mountain");
    expect(worn).toContain('data-count="6"');
    // And its small page has rules of its own, with its picture behind its words.
    expect(decls('.set-mode-page[data-palette="athos"]')["--mp-back"]).toContain("var(--scene-athos)");
    expect(decls(".set-mode-page").background).toBe("var(--mp-back, var(--mp-ground))");
  });

  it("sets the verses in the reader's own face", () => {
    const drawn = draw(createElement(ModePages, { theme: "default", font: "sans", allows: EVERY, locked: false, onPick: () => {} }));
    expect(drawn).toMatch(/class="set-mode-verses font-sans"/);
  });

  it("holds every name under its small page to 4.5:1 on every palette (1.9)", () => {
    // 1.8 drew the names at 60 percent of the palette's ink. Measured on the
    // export against their pixels (2026-11-10), a name was then under 4.5:1
    // for a reader on Light and on ten more palettes: 3.67:1 at the lowest,
    // on Jordan, and 4.46:1 on Candlelight's lit panel. 68 is the least share
    // that holds by the pixels (4.57:1), and 70 leaves room (4.88:1).
    //
    // This is the arithmetic on the page's own ground, which is where the
    // names stand on the light palettes, the ones that decide it. The pixels
    // read up to 0.17 under it (the panel's grain, the letters' edges), so
    // the floor here is 4.7, not 4.5: a share or a token nudged under that
    // fails here before a reader on Light meets it.
    const share = Number(/var\(--color-paper\) (\d+)%, transparent\)/.exec(decls(".set-mode-name").color ?? "")?.[1]) / 100;
    expect(share, decls(".set-mode-name").color).toBeGreaterThan(0);
    const hex = (raw: string) => [1, 3, 5].map((i) => parseInt(raw.slice(i, i + 2), 16));
    const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const short = READING_THEMES.map((theme) => {
      const own = theme.id === "default" ? THEME : decls(theme.look ? `html[data-look="${theme.id}"]` : `html[data-reading-mode="${theme.id}"]`);
      const ground = hex(own["--color-night"] ?? "");
      const ink = hex(own["--color-paper"] ?? "");
      const name = ink.map((v, i) => v * share + ground[i] * (1 - share));
      return { id: theme.id, r: (Math.max(lum(name), lum(ground)) + 0.05) / (Math.min(lum(name), lum(ground)) + 0.05) };
    })
      .filter(({ r }) => !(r >= 4.7))
      .map(({ id, r }) => `${id}: ${r.toFixed(2)}:1 at ${Math.round(share * 100)} percent of the ink`);
    expect(READING_THEMES.length).toBeGreaterThanOrEqual(21);
    expect(short, short.join("\n")).toEqual([]);
    // The one applied is the ink whole, and a shelf or a preview that sets its own share sets no less.
    expect(decls('.set-mode[aria-pressed="true"] .set-mode-name').color).toBe("var(--color-paper)");
    for (const other of [".set-shelf .set-mode-name", ".set-modes.plus-try-modes .set-mode-name"]) {
      const own = Number(/var\(--color-paper\) (\d+)%/.exec(decls(other).color ?? "")?.[1]) / 100;
      expect(own, other).toBeGreaterThanOrEqual(share);
    }
  });

  it("wears each palette's own ground, ink and accent, as its block in the stylesheet sets them", () => {
    // A look's tokens are under its own attribute (1.9); the rest under their mode.
    const looks = new Set(READING_THEMES.filter((t) => t.look).map((t) => t.id));
    const tokens = (id: ReadingTheme) => (id === "default" ? THEME : decls(looks.has(id) ? `html[data-look="${id}"]` : `html[data-reading-mode="${id}"]`));
    const page = (id: ReadingTheme) => ({ ...decls(".set-mode-page"), ...(id === "default" ? {} : decls(`.set-mode-page[data-palette="${id}"]`)) });
    for (const { id } of READING_THEMES) {
      const want = tokens(id);
      const got = page(id);
      expect(want["--color-night"], `${id} ground in its palette`).toMatch(/^#[0-9a-f]{6}$/);
      expect(got["--mp-ground"], `${id} ground`).toBe(want["--color-night"]);
      expect(got["--mp-ink"], `${id} ink`).toBe(want["--color-paper"]);
      expect(got["--mp-accent"], `${id} accent`).toBe(want["--color-gold"]);
    }
  });
});

describe("reader size", () => {
  const slider = (drawn: string) => {
    const tag = /<div role="slider"[^>]*>/.exec(drawn)?.[0] ?? "";
    return {
      now: /aria-valuenow="(\d+)"/.exec(tag)?.[1],
      text: /aria-valuetext="([^"]*)"/.exec(tag)?.[1],
      max: /aria-valuemax="(\d+)"/.exec(tag)?.[1],
      lit: /<span data-on=""[^>]*>([^<]*)</.exec(drawn)?.[1],
    };
  };

  it("shows a reader who never chose one the size the Bible opens them at: Large", () => {
    // Rendered as a server renders it: nothing on the device, nothing chosen.
    // The Bible starts such a reader at Large (BIBLE_START_SIZE); this row lit
    // Medium until 1.8, a size that reader had never seen.
    const drawn = draw(createElement(ReaderSizeRow));
    expect(slider(drawn)).toEqual({ now: "2", text: en["settings.sizeLarge"], max: "3", lit: en["settings.sizeLarge"] });
    expect(drawn).toContain(`class="font-serif ${SIZE_CLASSES.lg}"`);
    expect(drawn).toContain(`>${en["ui.readerSize"]}<`);
  });

  it("sets the verse of John at the size chosen, in the reader's face and spacing", () => {
    const drawn = draw(createElement(ReaderSizeControl, { size: "sm", font: "display", leading: 2.15, onChange: () => {} }));
    expect(slider(drawn)).toEqual({ now: "0", text: en["settings.sizeSmall"], max: "3", lit: en["settings.sizeSmall"] });
    expect(drawn).toContain(`class="font-display-serif ${SIZE_CLASSES.sm}" style="line-height:2.15"`);
    expect(drawn).toContain(html(JOHN_1_OPENING[0].text));
    expect(drawn).toContain(">John 1<");
    // Four stops, each named, the way to the chosen one lit.
    const names = [...drawn.matchAll(/<span(?: data-on="")? style="--stop:[^"]*">([^<]*)</g)].map((m) => m[1]);
    expect(names).toEqual([en["settings.sizeSmall"], en["settings.sizeMedium"], en["settings.sizeLarge"], en["settings.sizeExtraLarge"]]);
  });

  it("names its stops in the reader's language", () => {
    const el = getMessages("el");
    const drawn = draw(createElement(ReaderSizeControl, { size: "xl", font: "serif", onChange: () => {} }), "el");
    expect(slider(drawn).text).toBe(el["settings.sizeExtraLarge"]);
    expect(drawn).toContain(`>${el["bible.books.john"]} 1<`);
  });

  it("is the Settings row, and the Bible's own sheet keeps its chips", () => {
    expect(code("components/settings/SettingsClient.tsx")).toMatch(/<ReaderSizeRow \/>/);
    expect(code("components/settings/ReaderSize.tsx")).toMatch(/useReaderPrefs\(BIBLE_START_SIZE\)/);
    // The reader's Aa sheet is unchanged (the open question on r3-01).
    expect(code("components/settings/SettingsClient.tsx")).not.toMatch(/ReadingModeChips/);
    expect(code("components/bible/ReaderSettingsMenu.tsx")).toMatch(/<ReadingModeChips touch=\{touch\} \/>/);
  });
});

describe("first focus", () => {
  const cards = (drawn: string) =>
    [...drawn.matchAll(/<button type="button" aria-pressed="(true|false)"[^>]*data-intent="([^"]+)"[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g)].map(
      ([, pressed, intent, cls, inner]) => ({
        pressed: pressed === "true",
        intent,
        cls,
        src: /<img[^>]*src="([^"]+)"/.exec(inner)?.[1] ?? null,
        checked: inner.includes("set-focus-check"),
      }),
    );

  it("is onboarding's own picture cards, every answer in its order, the reader's one lit and checked", () => {
    const drawn = draw(createElement(FirstFocus, { intent: "saints", level: "learning", again: false, label: "First focus", onPick: () => {} }));
    const got = cards(drawn);
    expect(got.map((c) => c.intent)).toEqual([...INTENTS]);
    expect(got.map((c) => c.src)).toEqual(INTENTS.map((i) => ANSWER_PICTURES[i].src));
    expect(got.every((c) => c.cls.split(" ").includes("ob-pick"))).toBe(true);
    expect(got.filter((c) => c.pressed).map((c) => c.intent)).toEqual(["saints"]);
    expect(got.filter((c) => c.checked).map((c) => c.intent)).toEqual(["saints"]);
    for (const intent of INTENTS) expect(drawn, intent).toContain(`>${html(en[`onboard.intent.${intent}`])}<`);
  });

  it("says under the cards the Day 1 the answer gives", () => {
    const drawn = draw(createElement(FirstFocus, { intent: "saints", level: "learning", again: false, label: "First focus", onPick: () => {} }));
    expect(drawn).toContain(`>${en["onboard.day1.eyebrow"]}<`);
    expect(drawn).toContain(`>${en["onboard.day1.saintsLives.title"]}<`);
    // The step follows the level as Today's card does: Daily quiet is the Jesus
    // Prayer at every level; the Liturgy is a first Liturgy for the new.
    const quiet = draw(createElement(FirstFocus, { intent: "liturgy", level: "inquirer", again: false, label: "First focus", onPick: () => {} }));
    expect(quiet).toContain(`>${en["onboard.day1.firstLiturgy.title"]}<`);
  });

  it("calls it the next step for a reader who was back when they answered, as Today's card does", () => {
    const drawn = draw(createElement(FirstFocus, { intent: "prayer", level: "practicing", again: true, label: "First focus", onPick: () => {} }));
    expect(drawn).toContain(`>${en["onboard.returning.nextEyebrow"]}<`);
    expect(drawn).not.toContain(`>${en["onboard.day1.eyebrow"]}<`);
    expect(drawn).toContain(`>${en["onboard.day1.morningPrayers.title"]}<`);
  });

  it("lights nothing and promises no step to a reader who never answered", () => {
    const drawn = draw(createElement(FirstFocus, { intent: null, level: null, again: false, label: "First focus", onPick: () => {} }));
    expect(cards(drawn).some((c) => c.pressed)).toBe(false);
    expect(drawn).not.toContain("set-day");
  });

  // The Themes chat's sweep (1.9, notes/themes-fable.md section 25): on Light
  // the wash over each picture is paper and the name the ink, and a dark
  // picture showed through where the wash was still thin, 2.14:1 by the
  // pixels. Light's own wash (and so every light look's) holds the first line
  // of a name three lines long to 4.5:1 even over a black picture.
  it("stands every line of a name on paper on Light and every light look, over the darkest picture", () => {
    const drawn = draw(createElement(FirstFocus, { intent: null, level: null, again: false, label: "First focus", onPick: () => {} }));
    expect([...drawn.matchAll(/<span aria-hidden="true" class="set-focus-wash [^"]*to-night\/90"/g)]).toHaveLength(INTENTS.length);
    // The name as the arithmetic below takes it: 12px type at 1.2, 8px up from the card's foot.
    const names = [...drawn.matchAll(/<span class="(absolute inset-x-2\.5 bottom-2 [^"]*)">/g)].map((m) => m[1].split(" "));
    expect(names).toHaveLength(INTENTS.length);
    for (const cls of names) expect(cls).toEqual(expect.arrayContaining(["bottom-2", "text-caption", "leading-[1.2]"]));
    expect(THEME["--text-caption"]).toBe("12px");
    const height = parseFloat(decls(".set-focus-card").height);
    const top = (height - 8 - 3 * 12 * 1.2) / height;

    const wash = decls('html[data-reading-mode="parchment"] .set-focus-wash')["background-image"] ?? "";
    const stops = [...wash.matchAll(/(transparent|color-mix\(in srgb, var\(--color-night\) (\d+)%, transparent\)) (\d+)%/g)].map((m) => ({
      alpha: m[1] === "transparent" ? 0 : Number(m[2]) / 100,
      at: Number(m[3]) / 100,
    }));
    expect(stops.length, wash).toBeGreaterThanOrEqual(2);
    const after = stops.findIndex((s) => s.at >= top);
    expect(after, "the wash ends above the name").toBeGreaterThan(0);
    const [a, b] = [stops[after - 1], stops[after]];
    const alpha = a.alpha + ((b.alpha - a.alpha) * (top - a.at)) / (b.at - a.at);

    const hex = (raw: string) => [1, 3, 5].map((i) => parseInt(raw.slice(i, i + 2), 16));
    const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const lights = [
      { id: "Light", own: decls('html[data-reading-mode="parchment"]') },
      ...READING_THEMES.filter((theme) => theme.look === "light").map((theme) => ({ id: theme.id, own: decls(`html[data-look="${theme.id}"]`) })),
    ];
    expect(lights.length).toBeGreaterThan(1);
    const short = lights
      .map(({ id, own }) => {
        const night = hex(own["--color-night"] ?? "");
        const ink = hex(own["--color-paper"] ?? "");
        // The wash over black, the darkest a picture can be.
        const ground = night.map((v) => v * alpha);
        const r = (Math.max(lum(ink), lum(ground)) + 0.05) / (Math.min(lum(ink), lum(ground)) + 0.05);
        return { id, r };
      })
      .filter(({ r }) => !(r >= 4.5))
      .map(({ id, r }) => `${id}: ${r.toFixed(2)}:1 at ${(alpha * 100).toFixed(0)} percent of the page`);
    expect(short, short.join("\n")).toEqual([]);
  });

  it("writes the one answer as the intent, the others staying behind it", () => {
    const space = code("components/settings/SettingsClient.tsx");
    const at = space.indexOf("function SpaceSection(");
    const section = space.slice(at, space.indexOf("\nfunction ", at + 10));
    expect(section).toMatch(/<FirstFocus[\s\S]*?onPick=\{\(i\) => \{\s*writeIntent\(i\);\s*writeFocus\(\[focusFor\(i\)\]\);\s*refreshDayOne\(\);\s*void saveSpaceToAccount\(\);/);
    expect(section).not.toMatch(/writeIntents\(/);
  });
});

describe("the material", () => {
  it("every choice is a carved track of radios, the chosen one checked", () => {
    const drawn = draw(
      createElement(Track<"a" | "b" | "c">, {
        value: "b",
        options: [
          { value: "a", label: "One" },
          { value: "b", label: "Two" },
          { value: "c", label: "Three" },
        ],
        onChange: () => {},
        label: "Count",
      }),
    );
    expect(drawn).toMatch(/^<div role="radiogroup" aria-label="Count" class="set-track" style="--set-cols:3">/);
    expect([...drawn.matchAll(/role="radio" aria-checked="(true|false)"/g)].map((m) => m[1])).toEqual(["false", "true", "false"]);
    // Never answered: none raised.
    const none = draw(createElement(Track<"a">, { value: null, options: [{ value: "a", label: "One" }], onChange: () => {}, label: "Count" }));
    expect(none).toContain('aria-checked="false"');
    expect(none).not.toContain('aria-checked="true"');
  });

  it("on and off is a switch", () => {
    expect(draw(createElement(Switch, { on: true, onChange: () => {}, label: "Interlinear" }))).toMatch(
      /^<button type="button" role="switch" aria-checked="true" aria-label="Interlinear" class="set-switch hit-44"><span aria-hidden="true" class="set-switch-knob"><\/span><\/button>$/,
    );
  });

  it("raises and lights the chosen choice, and slides a switch on", () => {
    expect(decls('.set-track > button[aria-checked="true"]::before')).toMatchObject({ opacity: "1", scale: "1" });
    expect(decls(".set-track > button::before")).toMatchObject({ opacity: "0" });
    expect(decls('.set-switch[aria-checked="true"] .set-switch-knob').translate).toBe("20px 0");
    expect(decls('[dir="rtl"] .set-switch[aria-checked="true"] .set-switch-knob').translate).toBe("-20px 0");
    expect(decls('.set-mode[aria-pressed="true"] .set-mode-page').translate).toBe("0 -3px");
  });

  it("is built on the page's tokens, so every palette carries it", () => {
    for (const sel of [".set-panel", ".set-plate", ".set-track", ".set-switch", ".set-well"]) {
      const body = Object.values(decls(sel)).join(";");
      expect(body, sel).toMatch(/var\(--color-(night|paper)/);
      expect(body, sel).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    }
  });

  it("lights nothing on Parchment, where white cannot glow, and gives True black a hairline in place of a shadow", () => {
    for (const sel of [".set-check", ".set-slider-thumb", ".set-slider-fill", ".set-track > button::before", ".set-mode-page"]) {
      const shadow = decls(`html[data-reading-mode="parchment"] ${sel}`)["box-shadow"];
      expect(shadow, sel).toBeDefined();
      expect(shadow, sel).not.toMatch(/rgb\(255 255 255/);
    }
    expect(decls('html[data-reading-mode="parchment"] .set-plate > *').filter).toBe("none");
    expect(decls('html[data-reading-mode="parchment"] .set-panel').background).toMatch(/#f9f3e5/);
    expect(decls('html[data-reading-mode="black"] .set-panel')["box-shadow"]).toBe("inset 0 0 0 1px rgb(255 255 255 / 0.1)");
  });

  it("opens still: every transition waits for the screen to be up, and each has its escape", () => {
    const moving = RULES.filter(([sel, body]) => sel.includes(".set-") && /transition:(?!\s*none\b)/.test(body)).map(([sel]) => sel);
    expect(moving.length).toBeGreaterThan(8);
    const reduce = RULES.filter(([sel]) => sel.includes('[data-motion="reduce"]')).map(([sel]) => sel).join(",");
    for (const sel of moving) {
      // The one exception: a picture that arrives fades in whenever it arrives.
      if (sel === ".set-root .set-focus-card img") {
        expect(reduce).toContain(':where([data-motion="reduce"]) .set-root .set-focus-card img');
        continue;
      }
      expect(sel, sel).toMatch(/^\.set-root\[data-live\] /);
      expect(reduce, sel).toContain(`:where([data-motion="reduce"]) ${sel}`);
    }
    // The cards' own light (.ob-pick) waits too.
    expect(decls(".set-root:not([data-live]) .set-focus-card").transition).toBe("none");
    expect(decls(".set-root:not([data-live]) .set-focus-card::after").transition).toBe("none");
    // And the screen sets the mark a frame after it is drawn.
    expect(code("components/settings/SettingsClient.tsx")).toMatch(/requestAnimationFrame\(\(\) => \{\s*frame = requestAnimationFrame\(\(\) => setLive\(true\)\);/);
    expect(code("components/settings/SettingsClient.tsx")).toMatch(/<div className="set-root" data-live=\{live \? "" : undefined\}>/);
  });
});
