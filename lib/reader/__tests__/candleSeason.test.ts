import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { currentSeason, orthodoxPascha, type CalStyle } from "@/lib/calendar/orthodox";
import { SEASON_TONES } from "@/lib/calendar/tone";
import { CANDLE_LIGHTS, CANDLE_SEASON_KEY, SEASON_LIGHT, candleLight, type CandleSeason } from "@/lib/reader/candleSeason";
import { isGoldTone, oklchOf } from "@/lib/ui/goldTone";

/**
 * Candlelight keeps the season (1.9): in the Church's three long fasts the
 * candle's soft light takes the fast's colour, and at every other time it is
 * its own white (lib/reader/candleSeason.ts; PLAN 15, "palettes of the
 * season").
 *
 * What this holds:
 *
 *  - Which day is which is the calendar's to say. Every season the calendar
 *    names is decided here, by name, so a season added to the calendar
 *    cannot ship undecided, and the list is the calendar's own, name for name.
 *  - The colours are the calendar's own tones, not a second opinion.
 *  - The sums. A season's light lies behind the words, on Candlelight's
 *    ground. Every kind of word on the page, the stepped-back commentary
 *    numbers among them (they decided the step back, and they decide this),
 *    is 4.5:1 or more at the light's centre, where it is fullest. Read from
 *    the stylesheet, so a nudge to a share or to the palette is caught.
 *  - No gold, and the stylesheet's light is the module's.
 *
 * What a reader would notice if it broke: a violet light in July, a fast with
 * no colour, or red verse numbers too faint to read where the light is.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const CSS = read("app/globals.css");
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

type Rgb = [number, number, number];
const hex = (raw: string): Rgb => {
  const m = /#([0-9a-f]{6})\b/i.exec(raw);
  if (!m) throw new Error(`not a colour: ${raw}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as Rgb;
};
const triplet = (raw: string): Rgb => raw.split(" ").map(Number) as Rgb;
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const mix = (fg: Rgb, bg: Rgb, a: number): Rgb => fg.map((v, i) => v * a + bg[i] * (1 - a)) as Rgb;
const ratio = (a: Rgb, b: Rgb) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** A custom property in the first rule whose selector is exactly this. */
function token(selector: string, name: string): string {
  for (const m of BARE.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    const d = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(m[2]);
    if (d) return d[1].trim();
  }
  throw new Error(`no ${name} in ${selector}`);
}

const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));
const plus = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
const idOn = (date: Date, style: CalStyle = "new") => candleLight(date, style)?.id ?? null;
const SEASONS = Object.keys(CANDLE_LIGHTS) as CandleSeason[];

describe("which day is which", () => {
  it("decides every season the calendar names, and its list is the calendar's own", () => {
    const said = new Set<string>();
    for (const style of ["new", "old"] as const) {
      for (let t = day(2026, 1, 1); t < day(2031, 1, 1); t = plus(t, 1)) {
        const season = currentSeason(t, style);
        if (season) said.add(season.label);
      }
    }
    expect(said.size).toBeGreaterThanOrEqual(8);
    for (const label of said) expect(Object.keys(SEASON_LIGHT), `the calendar names "${label}" and the candle has not decided it`).toContain(label);
    // And the list is the calendar's own list of seasons with a tone, name for name
    // (one of them, "Paschal season", is a branch the calendar keeps and seldom reaches).
    expect(Object.keys(SEASON_LIGHT).sort()).toEqual(Object.keys(SEASON_TONES).sort());
  });

  it("is violet from Clean Monday to Holy Saturday, with the candle's own white on Palm Sunday and from Pascha", () => {
    for (const year of [2027, 2028, 2029]) {
      const pascha = orthodoxPascha(year);
      expect(idOn(plus(pascha, -49)), `${year}: the day before Clean Monday`).toBeNull();
      expect(idOn(plus(pascha, -48)), `${year}: Clean Monday`).toBe("lent");
      expect(idOn(plus(pascha, -20)), `${year}: mid-Lent`).toBe("lent");
      expect(idOn(plus(pascha, -8)), `${year}: Lazarus Saturday`).toBe("lent");
      expect(idOn(plus(pascha, -7)), `${year}: Palm Sunday`).toBeNull();
      expect(idOn(plus(pascha, -6)), `${year}: Holy Monday`).toBe("lent");
      expect(idOn(plus(pascha, -1)), `${year}: Holy Saturday`).toBe("lent");
      expect(idOn(pascha), `${year}: Pascha`).toBeNull();
      expect(idOn(plus(pascha, 3)), `${year}: Bright Week`).toBeNull();
    }
  });

  it("is a deep blue through the Nativity Fast and the Mother of God's blue through the Dormition Fast, in the reader's own reckoning", () => {
    expect(idOn(day(2026, 11, 14))).toBeNull();
    expect(idOn(day(2026, 11, 15))).toBe("nativity");
    expect(idOn(day(2026, 12, 24))).toBe("nativity");
    expect(idOn(day(2026, 12, 25))).toBeNull();
    expect(idOn(day(2027, 7, 31))).toBeNull();
    expect(idOn(day(2027, 8, 1))).toBe("dormition");
    expect(idOn(day(2027, 8, 14))).toBe("dormition");
    expect(idOn(day(2027, 8, 15))).toBeNull();
    // The Old Calendar keeps the same fasts thirteen days later.
    expect(idOn(day(2026, 11, 15), "old")).toBeNull();
    expect(idOn(day(2026, 11, 28), "old")).toBe("nativity");
    expect(idOn(day(2027, 1, 6), "old")).toBe("nativity");
    expect(idOn(day(2027, 8, 14), "old")).toBe("dormition");
    expect(idOn(day(2027, 8, 27), "old")).toBe("dormition");
  });

  it("is the candle's own white in ordinary time and in the calendar's green seasons", () => {
    expect(idOn(day(2027, 7, 10))).toBeNull();
    expect(idOn(day(2027, 10, 5))).toBeNull();
    expect(SEASON_LIGHT["Apostles' Fast"]).toBeNull();
    expect(SEASON_LIGHT["Palm Sunday"]).toBeNull();
    // Three colours, no more: a new one is a decision, with its sums.
    expect(SEASONS).toEqual(["lent", "nativity", "dormition"]);
  });
});

describe("the lights", () => {
  it("are the calendar's own tones", () => {
    expect(CANDLE_LIGHTS.lent.rgb).toBe(SEASON_TONES["Holy Week"].rgb);
    expect(CANDLE_LIGHTS.nativity.rgb).toBe(SEASON_TONES["Nativity Fast"].rgb);
    expect(CANDLE_LIGHTS.dormition.rgb).toBe(SEASON_TONES["Dormition Fast"].rgb);
  });

  it("are written into the stylesheet as the module has them, one room each, and the veil keeps only its dark edges", () => {
    for (const id of SEASONS) {
      const { rgb, share } = CANDLE_LIGHTS[id];
      expect(token(`html[data-candle-season="${id}"]`, "--room")).toBe(`radial-gradient(ellipse 90% 34% at 50% 40%, rgb(${rgb} / ${share}), rgb(${rgb} / 0) 72%)`);
    }
    // The same place and shape as the white light it stands in for.
    expect(BARE).toMatch(/\.candle-veil \{[^}]*radial-gradient\(ellipse 90% 34% at 50% 40%, rgb\(255 255 255 \/ 0\.05\), rgb\(255 255 255 \/ 0\) 72%\)/);
    expect(BARE).toMatch(/html\[data-candle-season\] \.candle-veil \{\s*background: radial-gradient\(130% 105% at 50% 42%, rgb\(0 0 0 \/ 0\) 56%, rgb\(0 0 0 \/ 0\.55\) 100%\);\s*\}/);
  });

  it("lie behind the words by the rules a look's room uses", () => {
    expect(BARE).toContain("html:is([data-look], [data-candle-season]) body {");
    expect(BARE).toMatch(/html:is\(\[data-look\], \[data-candle-season\]\) body::before \{[^}]*z-index: -1;[^}]*background: var\(--room, none\);/);
    expect(BARE).toMatch(/html:is\(\[data-look\], \[data-candle-season\]\) :is\(main, body > \.safe-pt\) \.bg-night:not\([^)]*\),\s*html:is\(\[data-look\], \[data-candle-season\]\) body > \.bg-night\.min-h-screen \{\s*background-color: transparent;/);
  });

  it("carry every word on the page at 4.5:1 or more where the light is fullest", () => {
    const night = hex(token('html[data-reading-mode="candlelight"]', "--color-night"));
    const paper = hex(token('html[data-reading-mode="candlelight"]', "--color-paper"));
    const red = hex(token("@theme", "--color-comment"));
    // The shares the page is drawn at, each from where it is written.
    const stepBack = Number(/\.candle-reading \[data-verse\]:not\(\[data-lit\]\):not\(:has\(\[data-verse-strip\]\)\) \{\s*opacity: (0\.\d+);/.exec(BARE)?.[1]);
    const numbers = Number(/\.candle-reading \[data-verse\] sup\.text-paper\\\/55 \{\s*color: color-mix\(in oklab, var\(--color-paper\) (\d+)%/.exec(BARE)?.[1]) / 100;
    const faint = Number(/:where\(html\[data-reading-mode="candlelight"\]\) :is\([^)]*\.text-paper\\\/55[^)]*\) \{\s*color: color-mix\(in oklab, var\(--color-paper\) (\d+)%/.exec(BARE)?.[1]) / 100;
    const words = Number(/"text-paper\/(\d+)",\s*FONT_CLASSES\[font\]/.exec(read("components/bible/ChapterReader.tsx"))?.[1]) / 100;
    expect([stepBack, numbers, faint, words]).toEqual([0.86, 0.72, 0.6, 0.9]);

    const short: string[] = [];
    for (const id of SEASONS) {
      const light = CANDLE_LIGHTS[id];
      const ground = mix(triplet(light.rgb), night, light.share);
      const kinds: [string, Rgb][] = [
        ["the verse being read", mix(paper, ground, words)],
        ["a verse stepped back", mix(paper, ground, words * stepBack)],
        ["a stepped-back verse's number", mix(paper, ground, numbers * stepBack)],
        ["a stepped-back commentary number", mix(red, ground, stepBack)],
        ["a commentary number being read", red],
        ["a faint line", mix(paper, ground, faint)],
      ];
      for (const [what, ink] of kinds) {
        const r = ratio(ink, ground);
        if (r < 4.5) short.push(`${id}: ${what} ${r.toFixed(2)}:1`);
      }
      // And the light is a light: its ground is no brighter than the white one's.
      expect(lum(ground), `${id} is brighter than the candle's own white`).toBeLessThanOrEqual(lum(mix([255, 255, 255], night, 0.05)));
    }
    expect(short, short.join("\n")).toEqual([]);
  });

  it("are not gold, nor is the ground any of them makes", () => {
    // The measure itself, so this cannot pass by asking it nothing: the house's old gold is gold.
    expect(isGoldTone(oklchOf([212, 175, 55]))).toBe(true);
    const night = hex(token('html[data-reading-mode="candlelight"]', "--color-night"));
    for (const id of SEASONS) {
      const tone = triplet(CANDLE_LIGHTS[id].rgb);
      const ground = mix(tone, night, CANDLE_LIGHTS[id].share).map(Math.round) as Rgb;
      expect(isGoldTone(oklchOf(tone)), `${id}'s tone`).toBe(false);
      expect(isGoldTone(oklchOf(ground)), `${id}'s ground`).toBe(false);
    }
  });
});

describe("the veil and the switch", () => {
  const code = (rel: string) =>
    read(rel)
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  it("both readers draw the one veil", () => {
    for (const reader of ["components/bible/ChapterReader.tsx", "components/bible/DownloadedChapter.tsx"]) {
      const src = code(reader);
      expect(src, reader).toContain("{candle ? <CandleVeil /> : null}");
      expect(src, reader).not.toContain('className="candle-veil"');
    }
  });

  it("the veil says the season on the root only once the device's day is known, and takes it away when it leaves", () => {
    const veil = code("components/reader/CandleVeil.tsx");
    expect(veil.trimStart().startsWith('"use client";')).toBe(true);
    expect(veil).toContain("const today = useToday();");
    // The season is said by a hook, so the prayer page can keep it too (build 90 note 8): the veil
    // always says it, the prayer page only while Candlelight is the palette worn.
    expect(veil).toContain("export function useCandleSeason(active = true): void {");
    expect(veil).toContain("const season = active && today && on ? (candleLight(today, style)?.id ?? null) : null;");
    expect(veil).toMatch(/export function CandleVeil\(\) \{\s*useCandleSeason\(\);/);
    // Nothing is said while there is no season, and a page that leaves takes away only its own
    // word: a reader goes from a chapter straight to a prayer, and both say the season.
    expect(veil).toMatch(/if \(!season\) return;\s*const root = document\.documentElement;\s*const mine = \{\};\s*saying = mine;\s*root\.setAttribute\("data-candle-season", season\);/);
    expect(veil).toMatch(/return \(\) => \{\s*if \(saying !== mine\) return;\s*saying = null;\s*root\.removeAttribute\("data-candle-season"\);\s*\};/);
    expect(veil.match(/removeAttribute\("data-candle-season"\)/g)).toHaveLength(1);
    expect(veil).toContain('return <div aria-hidden className="candle-veil" />;');
  });

  it("the switch is on until a reader turns it off, and keeps only that", () => {
    expect(CANDLE_SEASON_KEY).toBe("purify.reader.candleSeason");
    const source = code("lib/reader/candleSeason.ts");
    expect(source).toContain('return window.localStorage.getItem(CANDLE_SEASON_KEY) !== "0";');
    const toggle = code("components/reader/CandleSeasonSwitch.tsx");
    expect(toggle).toMatch(/if \(next\) window\.localStorage\.removeItem\(CANDLE_SEASON_KEY\);\s*else window\.localStorage\.setItem\(CANDLE_SEASON_KEY, "0"\);/);
    // The veil hears of it by the event every reader preference sends.
    expect(toggle).toContain("window.dispatchEvent(new CustomEvent(PREFS_EVENT));");
    expect(code("components/reader/CandleVeil.tsx")).toContain("window.addEventListener(PREFS_EVENT, changed);");
    // A reader without Plus has no Candlelight: the switch shows off and opens the sheet, as Vespers' does.
    expect(toggle).toMatch(/if \(shut\) \{\s*upgrade\.open\("palettes"\);\s*return;\s*\}/);
    expect(toggle).toContain("return { on: stored && !shut, set, locked: shut };");
  });

  it("the candle's room follows the palette that is worn, not the one stored", () => {
    // Candlelight at Vespers wears Candlelight over the reader's own palette,
    // and a reader the gate has refused wears Dark with Candlelight still
    // stored. The readers asked the stored one, so the first had no room (and
    // no season) and the second had the candle's dimming on Dark.
    for (const reader of ["components/bible/ChapterReader.tsx", "components/bible/DownloadedChapter.tsx"]) {
      const src = code(reader);
      expect(src, reader).toContain("const candle = useCandlelightWorn();");
      expect(src, reader).not.toMatch(/theme === "candlelight"/);
      expect(src, reader).toContain("useReadingLine(candle);");
    }
    const hook = code("components/theme/useWornPalette.ts");
    expect(hook).toContain('document.documentElement.getAttribute("data-reading-mode") === "candlelight"');
    expect(hook).toContain('observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reading-mode"] });');
    // Nothing is said on the server, so the export bakes no candle in.
    expect(hook).toContain("return useSyncExternalStore(subscribe, candlelight, () => false);");
  });

  it("stands under Candlelight at Vespers in both places", () => {
    const menu = code("components/bible/ReaderSettingsMenu.tsx");
    expect(menu).toMatch(/<VespersToggle touch=\{touch\} \/>\s*<CandleSeasonToggle touch=\{touch\} \/>/);
    const settings = code("components/settings/SettingsClient.tsx");
    expect(settings).toMatch(/<VespersRow \/>\s*<CandleSeasonRow \/>/);
  });
});
