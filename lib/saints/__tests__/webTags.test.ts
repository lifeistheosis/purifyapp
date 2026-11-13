import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { tagOf } from "@/components/saints/web/webWords";
import { emWidth } from "@/lib/reading/coverText";
import { saintWeb, webSlugs } from "@/lib/saints/web";
import {
  BOX,
  CENTER_BOX,
  LABEL_SHARE,
  NARROWEST,
  SOFT,
  TAG_LINE,
  WORD_FIT,
  middleLines,
  nameLines,
  tagLines,
  tagText,
  webLayout,
  type WebNode,
} from "@/lib/saints/webLayout";

import en from "@/lib/i18n/messages/en.json";

/**
 * The line under a saint's name on his web is read whole (1.9, the gate's
 * final check of 2026-11-13, fail 5). It names a fact, the place and year of
 * a council, an event of the Church's history, how two saints are joined,
 * and it was held to one line and ended in an ellipsis where it did not fit:
 * at 390 on 17 webs ("Constantinople, 381" lost its year), at 320 on 44
 * ("Great Persecution", "Chalcedon, 451"). The arbiter's ruling the same
 * day: a label that names a fact shows whole; only an excerpt, such as the
 * Search sheet's preview line, may end in an ellipsis.
 *
 * What it holds: the line wraps as running text, a word too wide for the
 * label breaking at its syllable as the names do; the web gives each box the
 * lines its line takes on the narrowest phone, so the saints past a taller
 * box stand further out and nothing meets; and the copies of the web that
 * glide when another web takes the room draw the line the same way.
 *
 * What a reader would notice if this broke: "Constantinople, 3..." under a
 * Father on his web, or a saint's line running into the circle under it.
 */

const ROOT = process.cwd();
const WEB = fs.readFileSync(path.join(ROOT, "components/saints/web/WebConstellation.tsx"), "utf8");
const t = (key: string) => (en as Record<string, string>)[key] ?? key;
const webs = webSlugs().map((slug) => saintWeb(slug)!);
const nameOf = (n: WebNode) => (n.kind === "saint" ? n.person.short : n.name);

describe("the line under a saint's name on his web", () => {
  it("is never cut: no ellipsis, no clamp, no single line held", () => {
    const tagClass = /const TAG_CLASS = "([^"]*)";/.exec(WEB)?.[1];
    expect(tagClass).toBeDefined();
    for (const cut of ["truncate", "text-ellipsis", "line-clamp", "whitespace-nowrap", "overflow-hidden", "text-clip"]) {
      expect(tagClass, cut).not.toContain(cut);
    }
    // Its own line height, the one the layout counts by (TAG_LINE, 10.5px at 1.5).
    expect(tagClass).toContain("text-[10.5px] leading-[1.5]");
    expect(TAG_LINE).toBe(10.5 * 1.5);
  });

  it("is drawn with its breaks, on the web and in the copies that glide", () => {
    // The node itself, a saint leaving in a glide, and the saint growing to the middle.
    expect(WEB.match(/\{tagText\(tag\)\}/g)?.length).toBe(2);
    expect(WEB).toContain("{tagText(tagOf(chosen, t))}");
    expect(WEB).not.toMatch(/className=\{cn\(TAG_CLASS, LABEL_SHADOW\)\}>\{tag\}</);
  });

  it("breaks a word too wide for the label on the narrowest phone at its syllable, each piece fitting", () => {
    const label = NARROWEST * LABEL_SHARE;
    const wide = new Set<string>();
    for (const web of webs) {
      for (const n of web.nodes) {
        const tag = tagOf(n, t);
        const drawn = tagText(tag);
        expect(drawn.replaceAll(SOFT, ""), tag).toBe(tag);
        for (const word of drawn.split(/\s+/).flatMap((w) => w.split(/(?<=-)/))) {
          const whole = word.replaceAll(SOFT, "");
          if (emWidth(whole, "sans") * 10.5 <= label * WORD_FIT) continue;
          wide.add(whole);
          const pieces = word.split(SOFT);
          expect(pieces.length, `${web.center.slug}: "${whole}" in "${tag}" has no break`).toBe(2);
          for (const [i, piece] of pieces.entries()) expect(emWidth(i === 0 ? `${piece}-` : piece, "sans") * 10.5, piece).toBeLessThanOrEqual(label * WORD_FIT);
        }
      }
    }
    expect([...wide].sort()).toEqual(["Constantinople", "Constantinople,"]);
  });

  it("counts the lines it takes on the narrowest phone, as running text breaks", () => {
    // Fail 5's own words, each as it now stands at 320.
    expect(tagLines("Constantinople, 381")).toBe(2); // "Constan-" / "tinople, 381"
    expect(tagLines("Great Persecution")).toBe(2);
    expect(tagLines("Chalcedon, 451")).toBe(2);
    expect(tagLines("Triumph of Orthodoxy")).toBe(2);
    expect(tagLines("Nicaea, 325")).toBe(1);
    expect(tagLines("In the Lives")).toBe(1);
    expect(tagLines("451")).toBe(1);
    expect(tagLines("")).toBe(0);
    // A box with a line of two lines reaches one line further down; one of one line, no further.
    expect(webLayout(1, { tags: [2] }).down[0]).toBe(BOX.down + Math.ceil(TAG_LINE));
    expect(webLayout(1, { tags: [1] }).down[0]).toBe(BOX.down);
    expect(webLayout(1, { names: [3], tags: [2] }).down[0]).toBe(BOX.down + Math.ceil(14.03 + TAG_LINE));
  });

  it("gives every box on the 118 webs the lines its name and its line take, and keeps it clear of every other", () => {
    type Rect = { left: number; right: number; top: number; bottom: number };
    const overlap = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    expect(webs.length).toBe(118);
    let taller = 0;
    const websTaller = new Set<string>();
    for (const web of webs) {
      const names = web.nodes.map((n) => nameLines(nameOf(n)));
      const tags = web.nodes.map((n) => tagLines(tagOf(n, t)));
      const layout = webLayout(web.nodes.length, { names, tags, middle: middleLines(web.center.short) });
      const middle: Rect[] = [
        { ...CENTER_BOX[0], top: layout.center.y + CENTER_BOX[0].top, bottom: layout.center.y + CENTER_BOX[0].bottom },
        { ...CENTER_BOX[1], top: layout.center.y + CENTER_BOX[1].top, bottom: layout.center.y + layout.middleDown },
      ];
      // Each box as drawn: the circle, the name in its lines, the line under it in its lines.
      const boxes: Rect[] = layout.places.map((p, i) => ({
        left: p.x - BOX.half,
        right: p.x + BOX.half,
        top: p.y - BOX.up,
        bottom: p.y + BOX.down + Math.max(0, names[i] - 2) * 14.03 + Math.max(0, tags[i] - 1) * TAG_LINE,
      }));
      for (const [i, b] of boxes.entries()) {
        if (tags[i] > 1) {
          taller += 1;
          websTaller.add(web.center.slug);
        }
        expect(layout.down[i], `${web.center.slug} #${i}`).toBeGreaterThanOrEqual(b.bottom - layout.places[i].y);
        expect(b.top, `${web.center.slug} #${i}`).toBeGreaterThanOrEqual(0);
        expect(b.bottom, `${web.center.slug} #${i}`).toBeLessThanOrEqual(layout.height);
        for (const m of middle) expect(overlap(b, m), `${web.center.slug}: ${nameOf(web.nodes[i])} on the middle saint`).toBe(false);
        for (let j = i + 1; j < boxes.length; j++) expect(overlap(b, boxes[j]), `${web.center.slug}: ${nameOf(web.nodes[i])} and ${nameOf(web.nodes[j])}`).toBe(false);
      }
    }
    // The 44 webs fail 5 named at 320, give or take what the measure reads as a second line.
    expect(websTaller.size).toBeGreaterThanOrEqual(40);
    expect(taller).toBeGreaterThan(websTaller.size);
    // And the web asks the layout for them.
    expect(WEB).toContain("tags: nodes.map((n) => tagLines(tagOf(n, t)))");
  });
});
