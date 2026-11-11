import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { GalleryShelves } from "@/components/settings/ReadingModeGallery";
import { getMessages } from "@/lib/i18n";
import { FREE_THEMES, READING_THEMES, THEME_FAMILIES, isFreeTheme, themesOfFamily, type ReadingTheme } from "@/lib/reader/readingModes";

/**
 * The reading modes' own page (1.9), as it is drawn. The owner's words of
 * 2026-11-10: "make a lot more designs ... and a nice scrollable theme system
 * in the settings when picking a theme". Settings' Reading mode row opens it
 * (lib/settings/__tests__/litPanels.test.ts holds the row).
 *
 * What a reader sees, and what this holds: the three every reader has, first;
 * then a shelf for each family of Purify Plus palettes, swept sideways, the
 * family's looks before the palette it shelters; last the two earned by
 * reading, as goals. Purify Plus is said once by a family's name, and only
 * where the gate has said no, so it is never promised to a reader who has it
 * and never repeated on eighteen tiles. The one applied is lit and checked,
 * and only it. Every name is asked of the catalog.
 *
 * What it does not hold: how a look reads on a phone. That is
 * scripts/mock-check.mjs on the export, and the colours' arithmetic is
 * lib/ui/__tests__/faintText.test.ts and litPalette.test.ts.
 */

type ProviderProps = Parameters<typeof MessagesProvider>[0];

function draw(node: ReactElement, locale = "en"): string {
  return renderToString(createElement(MessagesProvider, { locale, messages: getMessages(locale) } as ProviderProps, node));
}

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
/** The declarations of the first rule whose selector is exactly this. */
function decls(selector: string): Record<string, string> {
  for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].trim() !== selector) continue;
    const out: Record<string, string> = {};
    for (const d of m[2].split(";")) {
      const at = d.indexOf(":");
      if (at > 0) out[d.slice(0, at).trim()] = d.slice(at + 1).trim();
    }
    return out;
  }
  throw new Error(`no rule for ${selector}`);
}

const FREE_ONLY = (theme: ReadingTheme) => isFreeTheme(theme);
const EVERY = () => true;
const shelves = (props: { theme?: ReadingTheme; worn?: ReadingTheme; allows?: (theme: ReadingTheme) => boolean; locked?: boolean }, locale = "en") =>
  draw(createElement(GalleryShelves, { theme: props.theme ?? "default", worn: props.worn, font: "serif", allows: props.allows ?? EVERY, locked: props.locked ?? false, onPick: () => {} }), locale);

/** Each section of the page: its heading, whether it says Purify Plus, and its tiles in order. */
function sections(drawn: string) {
  return drawn
    .split('<section class="set-fam')
    .slice(1)
    .map((part) => ({
      family: /^[^>]*data-family="([a-z]+)"/.exec(part)?.[1] ?? null,
      heading: /<h2 class="set-h">([^<]*)</.exec(part)?.[1] ?? null,
      hint: /<p class="set-hint">([^<]*)</.exec(part)?.[1] ?? null,
      plus: /<div class="set-fam-head">[\s\S]*?<span class="set-mode-plus">Purify Plus<\/span>[\s\S]*?<\/div>/.test(part),
      shelf: /<div role="group" aria-label="([^"]*)" class="set-shelf">/.exec(part)?.[1] ?? null,
      tiles: [...part.matchAll(/<button type="button"([^>]*)class="set-mode( set-mode-goal)?">([\s\S]*?)<\/button>/g)].map(([, attrs, goal, inner]) => ({
        palette: /data-palette="([^"]+)"/.exec(inner)?.[1] ?? null,
        pressed: /aria-pressed="true"/.test(attrs),
        title: /title="([^"]*)"/.exec(attrs)?.[1] ?? null,
        goal: Boolean(goal),
        checked: inner.includes("set-mode-check"),
        name: /class="set-mode-name">([^<]*)</.exec(inner)?.[1] ?? null,
        plus: inner.includes("set-mode-plus"),
      })),
    }));
}

describe("the reading modes' own page", () => {
  it("shelves every palette once: the free three, each family, then the two earned by reading", () => {
    const got = sections(shelves({}));
    expect(got).toHaveLength(2 + THEME_FAMILIES.length);
    expect(got[0].tiles.map((t) => t.palette)).toEqual([...FREE_THEMES]);
    expect(got[0].heading).toBeNull();
    expect(got.slice(1, -1).map((s) => s.family)).toEqual(THEME_FAMILIES.map((f) => f.id));
    for (const [i, family] of THEME_FAMILIES.entries()) {
      const section = got[1 + i];
      expect(section.heading).toBe(family.label);
      expect(section.hint).toBe(family.line);
      expect(section.shelf).toBe(family.label);
      expect(section.tiles.map((t) => t.palette)).toEqual(themesOfFamily(family.id).map((t) => t.id));
    }
    expect(got.at(-1)?.tiles.map((t) => t.palette)).toEqual(["councils", "cappadocian"]);
    // Every palette the app has, each on exactly one shelf.
    const all = got.flatMap((s) => s.tiles.map((t) => t.palette));
    expect([...all].sort()).toEqual(READING_THEMES.map((t) => t.id as string).sort());
    expect(new Set(all).size).toBe(all.length);
  });

  it("puts a family's looks before the palette it shelters, Night sky first of all", () => {
    const got = sections(shelves({}));
    expect(got[1].tiles.map((t) => t.palette)).toEqual(["nightsky", "dawn", "incense", "candlelight"]);
    expect(got[4].tiles.map((t) => t.palette)).toEqual(["mosaic", "stone", "damask", "linen", "monastery"]);
  });

  it("says Purify Plus once by each family's name where the gate has said no, and nowhere for a reader who has it", () => {
    const locked = sections(shelves({ allows: FREE_ONLY, locked: true }));
    expect(locked.map((s) => s.plus)).toEqual([false, true, true, true, true, false]);
    // Never on a tile: eighteen marks would be a wall of them. The title a
    // screen reader hears keeps it, palette by palette.
    for (const section of locked) expect(section.tiles.filter((t) => t.plus)).toEqual([]);
    for (const tile of locked.slice(1, -1).flatMap((s) => s.tiles)) expect(tile.title, tile.palette ?? "").toMatch(/\. Purify Plus\.$/);
    for (const tile of locked[0].tiles) expect(tile.title, tile.palette ?? "").not.toContain("Purify Plus");

    const open = shelves({ allows: EVERY, locked: false });
    expect(open).not.toContain("Purify Plus");
    // And not while the gate is still asking: a subscriber's page must not flash it.
    expect(shelves({ allows: FREE_ONLY, locked: false })).not.toContain("Purify Plus");
  });

  it("lights and checks the one applied, and only it", () => {
    for (const theme of ["default", "athos", "linen", "candlelight"] as const) {
      const tiles = sections(shelves({ theme })).flatMap((s) => s.tiles);
      expect(tiles.filter((t) => t.pressed).map((t) => t.palette), theme).toEqual([theme]);
      expect(tiles.filter((t) => t.checked).map((t) => t.palette), theme).toEqual([theme]);
    }
    // A look held in storage by a reader the gate refuses is not shown as
    // applied: the app is in Dark, and the check stands on what the app is
    // wearing (build 93 note 3 was a check on a look the app was not in).
    const refused = sections(shelves({ theme: "athos", allows: FREE_ONLY, locked: true })).flatMap((s) => s.tiles);
    expect(refused.filter((t) => t.pressed).map((t) => t.palette)).toEqual(["default"]);
    expect(refused.filter((t) => t.checked).map((t) => t.palette)).toEqual(["default"]);
    // Where the page itself says what it is in (after sunset, Candlelight at
    // Vespers over the reader's own Dawn), the check stands there and only there.
    const night = sections(shelves({ theme: "dawn", worn: "candlelight" })).flatMap((s) => s.tiles);
    expect(night.filter((t) => t.pressed).map((t) => t.palette)).toEqual(["candlelight"]);
    expect(night.filter((t) => t.checked).map((t) => t.palette)).toEqual(["candlelight"]);
  });

  it("shows the two earned by reading as goals until they are earned", () => {
    const last = sections(shelves({})).at(-1);
    expect(last?.heading).toBe(getMessages("en")["settings.paletteEarnedRow"]);
    expect(last?.tiles.map((t) => t.goal)).toEqual([true, true]);
  });

  it("speaks the reader's language: every family and every palette from the catalog", () => {
    const el = getMessages("el");
    const got = sections(shelves({}, "el"));
    for (const [i, family] of THEME_FAMILIES.entries()) {
      expect(got[1 + i].heading).toBe(el[family.labelKey]);
      expect(got[1 + i].hint).toBe(el[family.lineKey]);
      expect(got[1 + i].heading).not.toBe(family.label);
    }
    const holy = got[2].tiles.find((t) => t.palette === "athos");
    expect(holy?.name).toBe(el["settings.paletteHolyMountain"]);
    expect(holy?.name).not.toBe("Holy Mountain");
  });
});

describe("the page and its way in", () => {
  it("is a server shell with its own bar, whose way back is Settings, and a client child", () => {
    const page = read("app/(app)/settings/reading-mode/page.tsx");
    expect(page).not.toMatch(/^"use client"/);
    expect(page).toContain("export const metadata");
    expect(page).toContain('<MobileTopBar titleKey="ui.readingMode" back backFallback="/settings" />');
    expect(page).toContain("<ReadingModeGallery />");
    // Nothing read on the server: under the static export there is no device to read.
    expect(page).not.toMatch(/cookies\(|headers\(|force-dynamic/);
    expect(read("components/settings/ReadingModeGallery.tsx").trimStart().startsWith('"use client";')).toBe(true);
  });

  it("is opened by the head of Settings' Reading mode row, which names the palette applied", () => {
    const settings = read("components/settings/SettingsClient.tsx");
    expect(settings).toContain('label={t("ui.readingMode")} description={modeName} href="/settings/reading-mode/"');
    const panel = read("components/settings/LitPanel.tsx");
    expect(panel).toContain('<Link href={href} className="set-lab set-link">');
    // A chevron from the app's own icons, turned for a reader of Arabic.
    expect(panel).toMatch(/<ChevronRight[^>]*className="set-chev rtl:-scale-x-100"/);
    // The Bible's own sheet has the same way in, under its chips.
    const chips = read("components/reader/ReadingModeChips.tsx");
    expect(chips).toContain('href="/settings/reading-mode/"');
    expect(chips).toContain('t("common.seeAll")');
    expect(chips).toMatch(/data-all-modes=""[\s\S]{0,80}min-h-11/);
  });

  it("is a shelf of pictures swept sideways, not a row of pills", () => {
    const shelf = decls(".set-shelf");
    expect(shelf.display).toBe("flex");
    expect(shelf["overflow-x"]).toBe("auto");
    expect(shelf["scroll-snap-type"]).toBe("x proximity");
    // A tile is its page, taller than a finger needs, and no outline is drawn round it.
    const tall = /calc\((\d+)px \* var\(--mp-k\)\)/.exec(decls(".set-shelf .set-mode-page").height ?? "");
    const k = Number(shelf["--mp-k"]);
    expect(Number(tall?.[1]) * k).toBeGreaterThanOrEqual(44);
    expect(decls(".set-shelf .set-mode-page")["border-radius"]).toBe("12px");
    // The row's head is a target of its own: 44px or more.
    expect(Number.parseInt(decls("a.set-lab.set-link")["min-height"], 10)).toBeGreaterThanOrEqual(44);
  });

  it("moves nothing of its own: no keyframes, and its tiles' motion is Settings', which reduced motion stills", () => {
    const from = read("app/globals.css").indexOf("The reading modes' own page (1.9)");
    expect(from).toBeGreaterThan(0);
    const section = read("app/globals.css").slice(from);
    expect(section).not.toMatch(/@keyframes|animation:/);
  });
});
