// The tab bar keeps its ground on a look (1.9, Updates 98p).
//
// What a reader would notice if this broke: on a look (or Candlelight in one
// of the Church's fasts), scroll any tab and the page slides under a bar with
// no ground at all, the tab's name, the Plus pill, search and the bell standing
// on the page's own words and pictures. On the export, Prayers scrolled 900px,
// the pill's word read 2.10 to 2.24:1 on the seven dark looks and 3.88 to
// 4.37:1 on six light ones (Updates 98o), and 3.98 to 4.37:1 in Arabic at the
// chants door (Round 3 apply A): what stood under the word was the page.
//
// Why: a look lets its room through the page's own sections, so the rule in
// app/globals.css ("The page lets its room through") clears every bg-night
// inside the page except what is its own surface, "a bar that stays in place"
// among them. That bar was named by the `sticky` class, and the tab bar is
// pinned by `.tab-topbar` in the apps (html.is-native .tab-topbar), not by
// that class, so the rule cleared it too. Inner pages' bar (MobileTopBar)
// carries `sticky` and kept its ground all along.
//
// This reads the source. The pixels are measured on the export with
// scripts/mock-check.mjs (docs/handoffs/updates-98p.md).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { READING_THEMES } from "@/lib/reader/readingModes";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const BAR = read("components/mobile/MobileHeader.tsx");

/** The rule that lets a look's room through: its selector for the page's own sections. */
const ROOM = "html:is([data-look], [data-candle-season]) :is(main, body > .safe-pt) .bg-night:not(";

/** What the room rule leaves its ground to: the entries of its :not(), read with their brackets. */
function keepsItsGround(): string[] {
  const at = CSS.indexOf(ROOM);
  if (at < 0) return [];
  let depth = 1;
  let i = at + ROOM.length;
  const start = i;
  for (; i < CSS.length && depth > 0; i += 1) {
    if (CSS[i] === "(") depth += 1;
    else if (CSS[i] === ")") depth -= 1;
  }
  const list = CSS.slice(start, i - 1);
  const out: string[] = [];
  let part = "";
  depth = 0;
  for (const ch of list) {
    if (ch === "(" || ch === "[") depth += 1;
    if (ch === ")" || ch === "]") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(part.trim());
      part = "";
    } else part += ch;
  }
  if (part.trim()) out.push(part.trim());
  return out;
}

/** The tab bar as MobileHeader draws it on a tab (sticky, the default): its classes and its attributes. */
function tabBar(): { classes: Set<string>; attrs: Set<string> } {
  const header = /<header([\s\S]*?)>/.exec(BAR)?.[1] ?? "";
  const cn = /className=\{cn\("([^"]+)",\s*sticky && "([^"]+)"\)\}/.exec(header);
  const classes = new Set([...(cn?.[1].split(/\s+/) ?? []), ...(cn ? [cn[2]] : [])]);
  const attrs = new Set([...header.matchAll(/\b(data-[a-z-]+)=/g)].map((m) => m[1]));
  return { classes, attrs };
}

/** Does one entry of the :not() list name this element? Simple selectors only: a combinator names its neighbours, not the bar. */
function names(entry: string, el: { classes: Set<string>; attrs: Set<string> }): boolean {
  if (/[\s>+~]/.test(entry.replace(/\[[^\]]*\]/g, ""))) return false;
  const cls = /^\.([\w-]+)$/.exec(entry);
  if (cls) return el.classes.has(cls[1]);
  const attr = /^\[([\w-]+)\]$/.exec(entry);
  if (attr) return el.attrs.has(attr[1]);
  const has = /^\[class\*="([^"]+)"\]$/.exec(entry);
  if (has) return [...el.classes].some((c) => c.includes(has[1]));
  throw new Error(`the room rule's :not() names something this test cannot read: ${entry}`);
}

describe("the tab bar on a look", () => {
  it("is drawn solid, pinned in the apps by .tab-topbar and not by the sticky class", () => {
    const bar = tabBar();
    expect(bar.classes.has("bg-night")).toBe(true);
    expect(bar.classes.has("tab-topbar")).toBe(true);
    expect(bar.attrs.has("data-tab-topbar")).toBe(true);
    expect(bar.classes.has("sticky")).toBe(false);
    expect(CSS).toMatch(/html\.is-native \.tab-topbar\s*\{\s*position:\s*sticky;/);
  });

  it("keeps its ground where a look lets its room through the page, so nothing scrolls under its words", () => {
    const kept = keepsItsGround();
    // The rule is there, and still keeps the bars it kept (inner pages' bar is .sticky).
    expect(kept).toContain(".sticky");
    expect(kept).toContain(".fixed");
    expect(kept.some((entry) => names(entry, tabBar())), `the room rule clears the tab bar: :not(${kept.join(", ")})`).toBe(true);
  });

  it("leaves its ground clear only over a page's own picture, until the picture has gone up under it", () => {
    // The one place the bar is clear on purpose (Prayers' Pantocrator, You's Ladder): data-bar-solid ends it.
    // A bar named inside :not() is a bar left alone, not one cleared.
    const bare = (selector: string) => selector.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, "");
    const clear = [...CSS.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter(
      ([, selector, body]) => /\[data-tab-topbar\]|\.tab-topbar/.test(bare(selector)) && /background-color:\s*transparent/.test(body),
    );
    expect(clear.length).toBe(1);
    for (const selector of clear[0][1].split(",")) expect(selector).toMatch(/:has\(\.(prayers|you)-hero\):not\(\[data-bar-solid\]\)/);
  });
});

// The Plus pill's word on that ground, on the five palettes, the two earned by
// reading and the fourteen looks: the page's ink on the pill's sheen at both
// ends of its gradient (white at 16 and 4 percent over the bar's ground, or on
// paper the pearl's 75 and 30 percent), the less kind of the two. Its still
// white glow is measured on the pixels (scripts/mock-check.mjs), not here.
type Rgb = [number, number, number];
const hex = (raw: string): Rgb => {
  const m = /#([0-9a-f]{6})\b/i.exec(raw);
  if (!m) throw new Error(`not a colour: ${raw}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as Rgb;
};
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const over = (white: number, ground: Rgb): Rgb => ground.map((v) => 255 * white + v * (1 - white)) as Rgb;
const ratio = (a: Rgb, b: Rgb) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** A custom property's value in the first rule whose selector is exactly `selector`. */
function token(selector: string, name: string): string | null {
  for (const m of CSS.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    const d = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(m[2]);
    if (d) return d[1].trim();
  }
  return null;
}

/** The sheen's white at both ends of its gradient, from the pill's own rules. */
function sheen(onPaper: boolean): number[] {
  const rule = onPaper ? /html\[data-reading-mode="parchment"\] \.premium-pill\s*\{([^}]*)\}/ : /(?:^|\})\s*\.premium-pill\s*\{([^}]*)\}/;
  const body = rule.exec(CSS)?.[1] ?? "";
  const stops = [...body.matchAll(/linear-gradient\(180deg,\s*([^)]*\))\s*,\s*([^)]*\))\)/g)].flatMap((m) => [m[1], m[2]]);
  const whites = stops.map((s) => Number(/(?:,|\/)\s*(0?\.\d+)\s*\)$/.exec(s)?.[1]));
  if (whites.length !== 2 || whites.some((w) => !Number.isFinite(w))) throw new Error("the pill's sheen is not read");
  return whites;
}

const MODES = ["default", "parchment", "black", "candlelight", "monastery", "councils", "cappadocian"] as const;

describe("the Plus pill's word on the bar's ground", () => {
  const grounds: [name: string, ink: Rgb, ground: Rgb, onPaper: boolean][] = [];
  for (const mode of MODES) {
    const pick = (name: string) => {
      const raw = (mode === "default" ? null : token(`html[data-reading-mode="${mode}"]`, name)) ?? token("@theme", name) ?? token(":root", name);
      if (!raw) throw new Error(`${mode}: no ${name}`);
      return hex(raw);
    };
    grounds.push([mode, pick("--color-paper"), pick("--color-night"), mode === "parchment"]);
  }
  for (const theme of READING_THEMES.filter((t) => t.look)) {
    const own = (name: string) => {
      const raw = token(`html[data-look="${theme.id}"]`, name);
      if (!raw) throw new Error(`${theme.id}: no ${name}`);
      return hex(raw);
    };
    grounds.push([theme.id, own("--color-paper"), own("--color-night"), theme.look === "light"]);
  }

  it("reads seven palettes and fourteen looks", () => {
    expect(grounds.length).toBe(21);
  });

  it("holds 4.5:1 on every one of them", () => {
    for (const [name, ink, ground, onPaper] of grounds) {
      const r = Math.min(...sheen(onPaper).map((white) => ratio(ink, over(white, ground))));
      expect(r, `${name}: ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
