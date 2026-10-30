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
    // While the gate is still asking, a paid palette that is applied is not lit.
    const asking = pages(draw(createElement(ModePages, { theme: "monastery", font: "serif", allows: FREE_ONLY, locked: false, onPick: () => {} })));
    expect(asking.some((p) => p.pressed)).toBe(false);
    expect(asking.some((p) => p.plus)).toBe(false);
  });

  it("shows a collection's palette only while it is the one applied, as a sixth page", () => {
    const drawn = draw(createElement(ModePages, { theme: "councils", font: "serif", allows: EVERY, locked: false, onPick: () => {} }));
    expect(pages(drawn).map((p) => p.palette)).toEqual(["default", "parchment", "black", "candlelight", "monastery", "councils"]);
    expect(drawn).toContain('data-count="6"');
    expect(draw(createElement(ModePages, { theme: "default", font: "serif", allows: EVERY, locked: false, onPick: () => {} }))).toContain('data-count="5"');
  });

  it("sets the verses in the reader's own face", () => {
    const drawn = draw(createElement(ModePages, { theme: "default", font: "sans", allows: EVERY, locked: false, onPick: () => {} }));
    expect(drawn).toMatch(/class="set-mode-verses font-sans"/);
  });

  it("wears each palette's own ground, ink and accent, as its block in the stylesheet sets them", () => {
    const tokens = (id: ReadingTheme) => (id === "default" ? THEME : decls(`html[data-reading-mode="${id}"]`));
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
