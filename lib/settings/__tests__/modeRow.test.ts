// The reading modes in Settings as one row swept sideways (build 95 note 18).
// His word, 2026-11-13 about 07:59 UTC, with a screenshot of the modes wrapped
// in rows (Dark, Light, True black, Candlelight, Monastery, Holy Mountain, then
// Councils "0 of 19" and Cappadocian "0 of 3" under them): "reading mode
// chooser here should be a clean scroller with haptic feedback rather than
// stacks".
//
// What this holds, each of which the two rows before it failed:
//   - one row, the five, a look while it is applied and the two earned on it;
//   - swept sideways, coming to rest on a page, running to the panel's edges;
//   - the chapter strip's click as each page passes (lib/ui/scrollTicks.ts,
//     whose own test holds the click: the phone apps only, never with Clicks
//     as you scroll off);
//   - the page that is on moved into sight by the row alone, never the
//     screen, still under reduced motion, mirrored in Arabic;
//   - pages a finger can take at every width, and the next one cut off at the
//     edge at every common phone width, so a reader sees there is more;
//   - all of them on the row on a computer, where nothing is swept.
// Where the pages are drawn and how they look is litPanels.test.ts.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { inSightBy } from "../modeRow";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const PAGES = code("components/settings/ReadingModePages.tsx");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** The rules of the stylesheet as [selector, body, the media query it is inside or ""]. */
const RULES: [string, string, string][] = (() => {
  const out: [string, string, string][] = [];
  let media = "";
  let depth = 0;
  let mediaDepth = -1;
  let at = 0;
  let head = "";
  for (let i = 0; i < CSS.length; i += 1) {
    const ch = CSS[i];
    if (ch === "{") {
      head = CSS.slice(at, i).trim();
      if (head.startsWith("@media")) {
        media = head;
        mediaDepth = depth;
        depth += 1;
        at = i + 1;
        continue;
      }
      const close = CSS.indexOf("}", i);
      out.push([head, CSS.slice(i + 1, close), media]);
      i = close;
      at = i + 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === mediaDepth) {
        media = "";
        mediaDepth = -1;
      }
      at = i + 1;
    }
  }
  return out;
})();

/** One selector's declarations, outside any media query or inside the one named. */
function decls(selector: string, media = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [sel, body, m] of RULES) {
    if (m !== media) continue;
    if (!sel.split(",").some((s) => s.trim() === selector)) continue;
    for (const d of body.split(";")) {
      const colon = d.indexOf(":");
      if (colon > 0) out[d.slice(0, colon).trim()] = d.slice(colon + 1).trim();
    }
  }
  return out;
}

const px = (v: string | undefined) => Number(/^(-?[\d.]+)px$/.exec(v ?? "")?.[1]);

describe("the reading modes in Settings, one row", () => {
  it("draws one row, not the five over a row of the two earned", () => {
    expect(PAGES).toContain('className="set-mode-row"');
    expect(PAGES).not.toContain("set-modes-earned");
    expect(PAGES.match(/role="group"/g)).toHaveLength(1);
    // The five, a look while it is the one applied, and the two earned, in the registry's order.
    expect(PAGES).toContain("READING_THEMES.filter((m) => !m.look || m.id === theme)");
  });

  it("is swept sideways and comes to rest on a page, running to the panel's edges", () => {
    const row = decls(".set-mode-row");
    expect(row["overflow-x"]).toBe("auto");
    expect(row["scroll-snap-type"]).toBe("x mandatory");
    expect(row.display).toBe("flex");
    // The panel's row is padded 16px at each side (.set-row): the row runs past that to the panel's edges.
    expect(px(decls(".set-row").padding?.split(/\s+/)[1])).toBe(16);
    expect(row["margin-inline"]).toBe("-16px");
    // A page rests where its start meets the row's own padding.
    expect(row["padding-inline"]).toBe("16px 0");
    expect(row["scroll-padding-inline"]).toBe("16px");
    const page = decls(".set-mode-row > .set-mode");
    expect(page["scroll-snap-align"]).toBe("start");
    expect(page.flex).toBe("none");
    // Nothing glides by itself: a reader who asked for less motion is moved only by their own finger.
    expect(row["scroll-behavior"]).toBeUndefined();
  });

  it("gives the click as each page passes, with the chapter strip's own hand (lib/ui/scrollTicks.ts)", () => {
    expect(PAGES).toContain('import { useScrollTicks } from "@/lib/ui/scrollTicks";');
    expect(PAGES).toContain("useScrollTicks(row);");
    // On the row itself.
    expect(PAGES).toMatch(/ref=\{row\}\s+role="group"\s+aria-label=\{t\("ui\.readingMode"\)\}\s+className="set-mode-row"/);
  });

  it("clicks the same way on the Reading mode page and in the Bible's own sheet (his all recs, 2026-11-13 about 14:29 UTC)", () => {
    const gallery = fs.readFileSync("components/settings/ReadingModeGallery.tsx", "utf8");
    const sheet = fs.readFileSync("components/reader/ReadingModeChips.tsx", "utf8");
    for (const [name, file] of [["the Reading mode page", gallery], ["the Bible's own sheet", sheet]] as const) {
      expect(file, name).toContain('import { useScrollTicks } from "@/lib/ui/scrollTicks";');
    }
    // Every shelf of the page is a Shelf, which holds its own row and its click.
    expect(gallery).not.toMatch(/<div role="group"[^>]*className="set-shelf"/);
    expect(gallery.match(/<Shelf label=/g)).toHaveLength(3);
    expect(gallery).toMatch(/function Shelf\([\s\S]*?const row = useRef<HTMLDivElement>\(null\);\s*useScrollTicks\(row\);[\s\S]*?ref=\{row\} role="group" aria-label=\{label\} className="set-shelf"/);
    // The sheet's shelf, on the ref it already scrolls by.
    expect(sheet).toContain("useScrollTicks(shelf);");
    expect(sheet).toMatch(/ref=\{shelf\} role="group" aria-label=\{name\} className="reader-shelf"/);
  });

  it("brings the page that is on into sight by moving the row alone, still under reduced motion", () => {
    expect(PAGES).toContain("useOnInSight(row,");
    expect(PAGES).toContain("box.scrollBy({ left: by, behavior: still ? \"auto\" : \"smooth\" })");
    expect(PAGES).toContain('document.documentElement.dataset.motion === "reduce"');
    // Never the screen: no scrollIntoView, no window scrolled.
    expect(PAGES).not.toMatch(/scrollIntoView|window\.scroll/);
  });

  it("mirrors in Arabic: every room and edge is the row's start and end, never left or right", () => {
    for (const sel of [".set-mode-row", ".set-mode-row > .set-mode", ".set-mode-row::after", ".set-mode-row .set-mode-name"]) {
      const props = Object.keys(decls(sel));
      expect(props.length, `${sel} has rules`).toBeGreaterThan(0);
      expect(props.filter((p) => /(^|-)(left|right)$/.test(p)), sel).toEqual([]);
    }
  });

  /** The page's width at a scale (.set-mode: calc(168px * var(--mp-k))). */
  const width = (k: number) => 168 * k;
  const scaleAt = (w: number) => {
    const at = (media: string) => {
      const k = Number(decls(".set-mode-row", media)["--mp-k"]);
      expect(Number.isFinite(k) && k > 0, `--mp-k ${media || "outside a media query"}`).toBe(true);
      return k;
    };
    if (w >= 768) return at("@media (min-width: 768px)");
    if (w >= 400) return at("@media (min-width: 400px)");
    return at("");
  };
  const GAP = () => px(decls(".set-mode-row").gap);

  it("takes a finger on every page at every width (44px and more)", () => {
    expect(decls(".set-mode").width).toBe("calc(168px * var(--mp-k))");
    for (const w of [320, 360, 390, 412, 430, 600, 768, 1032]) {
      expect(width(scaleAt(w)), `${w}px wide`).toBeGreaterThanOrEqual(44);
      // The page is 228px tall at the same scale.
      expect(228 * scaleAt(w), `${w}px wide`).toBeGreaterThanOrEqual(44);
    }
  });

  it("cuts the next page off at the edge at every common phone width, so a reader sees there is more", () => {
    // The screen pads Settings 16px at each side, and the row runs to the
    // panel's edges: the row is the screen less 32px, and its first page
    // rests 16px in from its start.
    const shown = (w: number) => {
      const k = scaleAt(w);
      const step = width(k) + GAP();
      const room = w - 32 - 16;
      const part = room % step;
      return part >= width(k) ? 0 : part / width(k);
    };
    const short = [360, 375, 390, 393, 412, 414, 430]
      .map((w) => ({ w, part: shown(w) }))
      .filter(({ part }) => part < 0.2 || part > 0.8)
      .map(({ w, part }) => `${w}px wide: the page at the edge is ${Math.round(part * 100)}% shown`);
    expect(short, short.join("\n")).toEqual([]);
  });

  it("stands all eight on the row on a computer, where nothing is swept", () => {
    // From 768px wide the screen pads Settings 32px at each side, up to 720px.
    for (const w of [768, 1032, 1440]) {
      const row = Math.min(720, w - 64);
      const eight = 16 + 8 * width(scaleAt(w)) + 7 * GAP();
      expect(eight, `${w}px wide`).toBeLessThanOrEqual(row);
    }
  });
});

describe("where the row moves to (inSightBy)", () => {
  // A row 328px wide from x 16 (a 360px phone), padded 16px at its start.
  const row = { left: 16, right: 344 };
  const room = 16;

  it("leaves a page already in sight where it is", () => {
    expect(inSightBy({ row, page: { left: 120, right: 204 }, lead: { left: 24, right: 108 }, room, rtl: false })).toBeNull();
  });

  it("brings a page past the end into sight, with the page before it at the start", () => {
    // The sixth page, past the edge; the fifth leads.
    const page = { left: 512, right: 596 };
    const lead = { left: 416, right: 500 };
    expect(inSightBy({ row, page, lead, room, rtl: false })).toBe(416 - (16 + 16));
  });

  it("brings a page cut at the end whole into sight, the check beside its corner included", () => {
    expect(inSightBy({ row, page: { left: 270, right: 340 }, lead: { left: 176, right: 260 }, room, rtl: false })).toBe(176 - 32);
  });

  it("mirrors in Arabic, where the start is the right edge", () => {
    // In sight.
    expect(inSightBy({ row, page: { left: 156, right: 240 }, lead: { left: 252, right: 336 }, room, rtl: true })).toBeNull();
    // Past the end, on the left: the row moves the other way.
    const by = inSightBy({ row, page: { left: -236, right: -152 }, lead: { left: -140, right: -56 }, room, rtl: true });
    expect(by).toBe(-56 - (344 - 16));
    expect(by).toBeLessThan(0);
  });

  it("leads with the page itself when it is the first", () => {
    // Scrolled away from the start, the first page is behind it.
    const first = { left: -150, right: -66 };
    expect(inSightBy({ row, page: first, lead: first, room, rtl: false })).toBe(-150 - 32);
  });
});
