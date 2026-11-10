// No side stripes (CLAUDE.md, the owner's word of 2026-11-10): "the line on
// the left is a vibe-coded AI slob guardrail that gets hit, and it gets
// detected through impeccable, which is an AI slob detector. So add this to
// our guardrails because it's implemented throughout certain sections, and we
// cannot have this." A bar or a one-sided border down the edge of a quote, a
// summary note, a card or a callout is AI slop. He found it on the reading
// room's editorial summaries and on the councils' words in build 89 (note 1),
// and on the Florilegium's cards (note 5). Quotes and notes stand on their
// own type, not on a rule beside them.
//
// So the app's code (app/, components/, lib/) is read for a border on one
// side only, down the left or the right: Tailwind's border-l, -r, -s and -e,
// a stylesheet's border-left, -right, -inline-start and -inline-end, a style
// object's borderLeft and the rest; and for a thin bar pinned down an edge.
// A true divider (the line between two columns, between the two halves of
// one control, the lines of a grid) is allowed only by name and reason, in
// DIVIDERS below. One a reader can see carries the same reason on itself, as
// data-mock-allow="stripe" data-mock-why="...", which is where
// scripts/mock-check.mjs reads it on every screen of the export
// (scripts/stripe-walk.mjs). lib/ui/__tests__/noRays.test.ts is its shape.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const ROOTS = ["app", "components", "lib"];
const KINDS = /\.(css|tsx?|mjs)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) walk(file, out);
    else if (KINDS.test(name)) out.push(file);
  }
  return out;
}

type Found = { file: string; line: number; text: string; how: string };
type Side = "top" | "bottom" | "start" | "end";

/** A comment line says what it likes about borders. */
const COMMENT = /^\s*(\/\/|\/?\*|\{\/\*)/;

/** A Tailwind border width: `border`, `border-2`, `border-s`, `md:border-l-[3px]`, `first:border-s-0`. */
const WIDTH = /^((?:[\w[\]&>*=-]+:)*)border(?:-([xytblrse]))?(?:-(\d+(?:\.\d+)?|px|\[\d*\.?\d+px\]))?$/;

const SIDES: Record<string, Side[]> = {
  "": ["top", "bottom", "start", "end"],
  x: ["start", "end"],
  y: ["top", "bottom"],
  t: ["top"],
  b: ["bottom"],
  l: ["start"],
  s: ["start"],
  r: ["end"],
  e: ["end"],
};

function oneSided(sides: Set<Side>): boolean {
  return sides.has("start") !== sides.has("end") && !sides.has("top") && !sides.has("bottom");
}

/** The class strings' borders on a line: one-sided for some variant (base, md:, first:...)? */
function tailwindStripe(line: string): string | null {
  const tokens = line.split(/[\s"'`{}(),;]+/).map((t) => t.replace(/^!/, ""));
  const widths = tokens.flatMap((t) => {
    const m = WIDTH.exec(t);
    if (!m) return [];
    const width = m[3] === undefined ? 1 : m[3] === "px" ? 1 : parseFloat(m[3].replace(/[[\]px]/g, ""));
    return [{ variant: m[1], sides: SIDES[m[2] ?? ""], width, token: t }];
  });
  if (!widths.some((w) => w.width > 0 && w.sides.length < 4 && w.sides.every((s) => s === "start" || s === "end"))) return null;
  const variants = [...new Set(widths.map((w) => w.variant))];
  for (const variant of variants) {
    const sides = new Set<Side>();
    for (const w of widths) {
      if (w.variant !== "" && w.variant !== variant) continue;
      for (const s of w.sides) {
        if (w.width > 0) sides.add(s);
        else sides.delete(s);
      }
    }
    if (oneSided(sides)) {
      const token = widths.find((w) => (w.variant === "" || w.variant === variant) && w.width > 0 && w.sides.length <= 2 && w.sides.every((s) => s === "start" || s === "end"))!.token;
      return `${token}: a border on one side only${variant ? ` (${variant.slice(0, -1)})` : ""}`;
    }
  }
  return null;
}

/** A thin bar pinned down an edge, in a class string: absolute, full height, a few px wide, at an edge, painted. */
function tailwindBar(line: string): string | null {
  const tokens = line.split(/[\s"'`{}(),;]+/).map((t) => t.replace(/^(?:[\w-]+:)*/, ""));
  const has = (re: RegExp) => tokens.some((t) => re.test(t));
  const pinned = has(/^(absolute|fixed)$/);
  const tall = has(/^(inset-y-0|h-full)$/) || (has(/^top-0$/) && has(/^bottom-0$/));
  const thin = has(/^w-(px|0\.5|1|\[[1-4]px\])$/);
  const edge = has(/^(start|end|left|right)-0$/);
  const painted = has(/^bg-/);
  return pinned && tall && thin && edge && painted ? "a thin bar pinned down an edge" : null;
}

/** A stylesheet's rules with a border on one side only, or a thin bar pinned down an edge. */
function cssStripes(css: string): { line: number; how: string }[] {
  const out: { line: number; how: string }[] = [];
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = rule.exec(css); m; m = rule.exec(css)) {
    const body = m[2];
    const at = css.slice(0, m.index + m[1].length).split("\n").length;
    const sides = new Set<Side>();
    const set = (list: Side[], value: string) => {
      const width = /^\s*(0(?:px)?|none|hidden)\b/.test(value) ? 0 : 1;
      for (const s of list) {
        if (width) sides.add(s);
        else sides.delete(s);
      }
    };
    for (const d of body.split(";")) {
      const [rawName, ...rest] = d.split(":");
      if (!rawName || rest.length === 0) continue;
      const name = rawName.trim();
      const value = rest.join(":").trim();
      if (name === "border" || name === "border-style") {
        if (name === "border") set(["top", "bottom", "start", "end"], value);
        continue;
      }
      if (name === "border-width") {
        const v = value.split(/\s+/);
        const [t, r = t, b = t, l = r] = v;
        set(["top"], t);
        set(["end"], r);
        set(["bottom"], b);
        set(["start"], l);
        continue;
      }
      const side = /^border-(top|bottom|left|right|inline-start|inline-end|block-start|block-end|inline|block)(-width)?$/.exec(name);
      if (!side) continue;
      const which: Record<string, Side[]> = {
        top: ["top"],
        "block-start": ["top"],
        bottom: ["bottom"],
        "block-end": ["bottom"],
        block: ["top", "bottom"],
        left: ["start"],
        "inline-start": ["start"],
        right: ["end"],
        "inline-end": ["end"],
        inline: ["start", "end"],
      };
      set(which[side[1]], value);
    }
    if (oneSided(sides)) out.push({ line: at, how: "a border on one side only" });
    const decl = (n: string) => new RegExp(`(?:^|;|\\s)${n}\\s*:\\s*([^;]+)`).exec(body)?.[1]?.trim();
    const width = decl("width");
    const thin = width !== undefined && /^[0-4](\.\d+)?px$/.test(width);
    const pinned = /^(absolute|fixed)$/.test(decl("position") ?? "");
    const tall = (decl("top") === "0" && decl("bottom") === "0") || decl("inset-block") === "0" || decl("height") === "100%" || /^0 \S+ 0 /.test(decl("inset") ?? "");
    const edge = decl("left") === "0" || decl("right") === "0" || decl("inset-inline-start") === "0" || decl("inset-inline-end") === "0" || /^0 auto 0 0$|^0 0 0 auto$/.test(decl("inset") ?? "");
    const painted = /background/.test(body);
    if (thin && pinned && tall && edge && painted) out.push({ line: at, how: "a thin bar pinned down an edge" });
  }
  return out;
}

const STYLE_SIDE = /\bborder(Left|Right|InlineStart|InlineEnd)(Width)?\s*:/;

function stripesIn(file: string): Found[] {
  const rel = path.relative(ROOT, file);
  const text = readFileSync(file, "utf8");
  if (file.endsWith(".css")) return cssStripes(text).map((s) => ({ file: rel, line: s.line, text: text.split("\n")[s.line - 1]?.trim() ?? "", how: s.how }));
  const out: Found[] = [];
  text.split("\n").forEach((line, i) => {
    if (COMMENT.test(line)) return;
    const how = tailwindStripe(line) ?? tailwindBar(line) ?? (STYLE_SIDE.test(line) ? "a style object's border on one side" : null);
    if (how) out.push({ file: rel, line: i + 1, text: line.trim(), how });
  });
  return out;
}

/**
 * The true dividers: each a line between two things, never a stripe beside
 * one. `has` is a piece of its line; `why` is the reason, and for one a
 * reader can see (`screen`), the same reason is its data-mock-why.
 */
type Divider = { file: string; has: string; why: string; screen?: true };

const DIVIDERS: Divider[] = [
  // What readers see.
  { file: "components/calendar/CalendarGrid.tsx", has: "grid grid-cols-7 border-l", why: "the month grid's lines", screen: true },
  { file: "components/mobile/BibleStudyRow.tsx", has: "border-s border-paper/[0.06]", why: "the line between the row's two halves", screen: true },
  { file: "components/native/PressToCopy.tsx", has: "border-s border-paper/15 pe-6 ps-5", why: "the line between Copy and Quote in journal", screen: true },
  { file: "components/shop/ShopSubTabs.tsx", has: "border-s border-white/8", why: "the line between the shop's tabs and the cart", screen: true },
  { file: "components/shop/ShopHomeClient.tsx", has: "md:border-l md:border-t-0", why: "the line between the shop's two columns on a wide screen", screen: true },
  { file: "components/player/NowPlayingSheet.tsx", has: "md:w-[440px] md:border-l", why: "the player's edge, docked beside the page on a wide screen", screen: true },
  { file: "components/bible/BookChapterSidebar.tsx", has: "border-r border-white/8", why: "the line between the computer's chapter list and the page", screen: true },
  { file: "components/theology/TopicReader.tsx", has: "gap-2 border-s border-paper/7", why: "the lines between the study's three figures", screen: true },
  // Shapes drawn while a page loads: no words in them, nothing for checkMock to read.
  { file: "app/(app)/bible/[book]/[chapter]/loading.tsx", has: "border-r border-white/8", why: "the line between the computer's chapter list and the page, while it loads" },
  { file: "components/calendar/CalendarSkeleton.tsx", has: "grid grid-cols-7 border-l", why: "the month grid's lines, while it loads" },
  // The admin panel: his own tool, on the website only.
  { file: "components/admin/AdminShell.tsx", has: "flex-col border-r px-3", why: "the admin rail's edge, between it and the page" },
  { file: "components/admin/hero.tsx", has: "border-l px-3", why: "the lines between an admin control's choices" },
  { file: "components/admin/releases/notes.tsx", has: "md:border-r", why: "the line between a note's before and after columns in the admin" },
  { file: "components/admin/tabs/DropTab.tsx", has: "top-[26px] border-l", why: "the line that joins the drop's steps in the admin" },
  { file: "components/admin/tabs/HomeTab.tsx", has: "lg:border-l", why: "the lines between the admin home's columns" },
  { file: "components/admin/tabs/TrafficViews.tsx", has: "border-l border-dashed", why: "the traffic chart's axis in the admin" },
  { file: "components/admin/needed/needed.module.css", has: ".holdFill", why: "the moving edge of the admin's hold-to-confirm fill" },
  { file: "components/admin/needed/parts.tsx", has: "borderRightWidth", why: "the moving edge of the admin's hold-to-confirm fill" },
  { file: "app/admin/admin-theme.css", has: ".adm-tbl-1st::after", why: "the edge of an admin table's first column, pinned while the rest scrolls under it" },
];

describe("no side stripes in the app", () => {
  const files = ROOTS.flatMap((r) => walk(path.join(ROOT, r)));
  const found = files.flatMap(stripesIn);
  const allowed = (f: Found) => DIVIDERS.find((d) => d.file === f.file && f.text.includes(d.has));

  it("reads the app's code", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("draws no border on one side only, and no thin bar down an edge, but a true divider named below", () => {
    const stripes = found.filter((f) => !allowed(f)).map((f) => `${f.file}:${f.line} ${f.how}: ${f.text.slice(0, 140)}`);
    expect(stripes, "a quote or a note stands on its own type; a true divider is named in DIVIDERS with its reason").toEqual([]);
  });

  it("names no divider that is not there any more", () => {
    const stale = DIVIDERS.filter((d) => !found.some((f) => allowed(f) === d)).map((d) => `${d.file}: ${d.has}`);
    expect(stale).toEqual([]);
  });

  it("puts each divider a reader sees under the same reason on itself, where checkMock reads it", () => {
    for (const d of DIVIDERS.filter((x) => x.screen)) {
      const source = readFileSync(path.join(ROOT, d.file), "utf8");
      expect(source, `${d.file}: data-mock-why="${d.why}"`).toContain(`data-mock-why="${d.why}"`);
    }
  });

  it("gives every allowance in the app its reason", () => {
    for (const file of files.filter((f) => /\.tsx$/.test(f))) {
      const source = readFileSync(file, "utf8");
      const allows = source.match(/data-mock-allow="[^"]*\bstripe\b[^"]*"/g) ?? [];
      const whys = source.match(/data-mock-why="[^"]{8,}"/g) ?? [];
      expect(whys.length, path.relative(ROOT, file)).toBeGreaterThanOrEqual(allows.length);
    }
  });

  it("catches a stripe however it is written, and lets a frame or a rule across pass", () => {
    expect(tailwindStripe(`<p className="mb-5 border-l-2 pl-4 font-sans">`)).not.toBeNull();
    expect(tailwindStripe(`<blockquote className="border-s border-paper/40 ps-5">`)).not.toBeNull();
    expect(tailwindStripe(`className="group block border-t border-paper/10 py-7 md:border-l md:border-t-0"`)).not.toBeNull();
    expect(tailwindStripe(`className="rounded-[20px] border border-dashed border-paper/20 p-4"`)).toBeNull();
    expect(tailwindStripe(`className="border-r border-b border-paper/8"`)).toBeNull();
    expect(tailwindStripe(`className="border-b border-paper/10 pb-4"`)).toBeNull();
    expect(tailwindStripe(`className="border-x border-paper/10"`)).toBeNull();
    expect(tailwindStripe(`className="border-separate border-spacing-2 border-solid"`)).toBeNull();
    expect(tailwindBar(`<span className="absolute inset-y-0 start-0 w-0.5 bg-paper/40" />`)).not.toBeNull();
    expect(tailwindBar(`<span aria-hidden className="absolute inset-y-0 start-[6px] w-px bg-paper/12" />`)).toBeNull();
    expect(cssStripes(".a { border-left: 2px solid red; padding-left: 14px; }")).toHaveLength(1);
    expect(cssStripes(".a { border: 0 solid red; border-right-width: 1px; border-bottom-width: 1px; }")).toEqual([]);
    expect(cssStripes(".a::after { content: \"\"; position: absolute; top: 0; bottom: 0; right: 0; width: 1px; background: red; }")).toHaveLength(1);
  });
});
