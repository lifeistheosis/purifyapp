import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { heroTitle } from "@/lib/saints/page";
import { SAINTS } from "@/lib/saints/saints";

/**
 * A saint's card says its first words whole (1.9, 2026-11-11, the arbiter's
 * word on the gate's rule for a name cut short).
 *
 * The gold line over the name was cut at one line. It is the first thing a
 * card says, and for a card of several saints it is their names: "Daniel,
 * Ananias, Azarias and Mi...". The rule failed 29 cards at a phone's width
 * and 68 on a tablet at 1024 (measured on the export with every card drawn).
 * The line shows whole now, on as many lines as it needs: two on those
 * cards, and three on three of them at 1024, which is why it is not held to
 * two.
 *
 * And the grey line under the name, which was every title the saint has,
 * joined by dots and cut at one line on 212 of 269 cards: it is his first
 * title now, whole, the line his own page shows under his name.
 *
 * What it costs is measured in docs/1.9-build/notes/themes-fable.md, section
 * 56: 20px a line, the median card unchanged at a phone's widths, and every
 * row of the grid still one height.
 *
 * What would go wrong if this broke: a card that opens with half a name and
 * three dots.
 */

const ROOT = process.cwd();
const src = fs
  .readFileSync(path.join(ROOT, "components/saints/SaintCard.tsx"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** The opening tag that holds `{saint.<field>}` or the gold line's quoted byname. */
function tagBefore(marker: string): string {
  const at = src.indexOf(marker);
  expect(at, marker).toBeGreaterThan(0);
  const open = src.lastIndexOf("<", at - 1);
  return src.slice(open, src.indexOf(">", open) + 1);
}

describe("a saint's card", () => {
  it("shows the gold line over the name whole: no line limit, no ellipsis", () => {
    const gold = tagBefore("&ldquo;{saint.byname}&rdquo;");
    expect(gold.startsWith("<p ")).toBe(true);
    expect(gold).not.toMatch(/line-clamp-|truncate|text-ellipsis|overflow-hidden|whitespace-nowrap/);
    // Two lines are two of a length, never one word left alone.
    expect(gold).toContain("text-balance");
    // English, left to right, whatever the reader's language (build 90 note 4).
    expect(gold).toContain('lang="en" dir="ltr"');
  });

  it("shows the name whole", () => {
    const name = tagBefore("{saint.name}");
    expect(name.startsWith("<h3 ")).toBe(true);
    expect(name).not.toMatch(/line-clamp-|truncate|text-ellipsis|overflow-hidden|whitespace-nowrap/);
  });

  it("shows under the name the saint's first title, whole, as his own page does", () => {
    // It was every title joined by dots, cut at one line: cut on 212 of 269 cards at a phone's width.
    const grey = tagBefore("{heroTitle(saint.epithet)}");
    expect(grey.startsWith("<p ")).toBe(true);
    expect(grey).not.toMatch(/line-clamp-|truncate|text-ellipsis|overflow-hidden|whitespace-nowrap/);
    expect(src).not.toMatch(/\{saint\.epithet\}/);
    // The same line as the saint's page, from the one place that makes it.
    expect(fs.readFileSync(path.join(ROOT, "components/saints/SaintHero.tsx"), "utf8")).toContain("const title = heroTitle(saint.epithet);");
    expect(heroTitle("Archbishop of Constantinople · Golden-Mouth")).toBe("Archbishop of Constantinople");
    expect(heroTitle("Of Gaza · The Great")).toBe("Of Gaza");
    expect(heroTitle("Martyr")).toBe("Martyr");
    // Every saint has one, and for a card of several it is their names, all of them.
    for (const s of SAINTS) expect(heroTitle(s.epithet).length, s.slug).toBeGreaterThan(0);
    const youths = SAINTS.find((s) => s.epithet.startsWith("Maximilian, Jamblichus"));
    expect(youths && heroTitle(youths.epithet)).toBe("Maximilian, Jamblichus, Martinian, John, Dionysius, Exacustodianus and Antoninus");
  });

  it("keeps the card's rows one height: it fills its cell and its foot stays at the bottom", () => {
    // The grid stretches each cell to the tallest card in its row; these make the card fill it,
    // so a card whose gold line takes two lines stands beside its neighbours foot to foot.
    expect(src).toMatch(/className="press-card group flex h-full flex-col /);
    expect(src).toContain('<div className="flex grow gap-5">');
  });

  it("has gold lines long enough to need the room, or this holds nothing", () => {
    // Forty-five of the 182 are 26 letters or more (2026-11-11), which is about where one line of a
    // phone's card ends; the longest is 45.
    const long = SAINTS.filter((s) => (s.byname ?? "").length >= 26);
    expect(long.length).toBeGreaterThan(20);
  });
});
