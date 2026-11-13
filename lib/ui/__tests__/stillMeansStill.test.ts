// With the app's motion reduced, nothing moves (Gate 2.0, cause 10 of its
// run on the branch tip, 2026-11-13: run-tip-reduced.md, "With the app's
// motion reduced: moves"). The still path is a reader's choice in Settings,
// or a phone the app judges slow (lib/ui/deviceSpeed.ts); either way the
// pages are simply there.
//
// What a reader would notice if this broke: with motion reduced, Prayers'
// verse and You's reader still slid up into place (800ms), the cart still
// slid in from the side (300ms), the Plus and Pro buttons still shrank under
// a finger (150ms), and the questions' chevrons still turned (200ms).
//
// Two ways it went wrong, each checked here for every place it could:
//
// 1. A still rule that weighs less than the motion it stills. `:where()`
//    weighs nothing, so `:where([data-motion="reduce"]) .prayers-hero-in`
//    weighs one class, and the entrance `.prayers-hero-verse.prayers-hero-in`
//    two: the entrance won, and played.
// 2. A class list that moves a box with a transition (Tailwind's
//    `transition`, `transition-transform`, `transition-[transform,...]`) and
//    says nothing for the still path. The house's escape is
//    `motion-reduce:transition-none` (app/globals.css, "Tailwind's motion
//    variants follow the same switch"); `motion-safe:` on the transition is
//    the other way to say it.
//
// It cannot watch a screen (vitest runs with no browser). The walk that does
// is `node scripts/motion-walk.mjs <out> --reduced` on the export.

import fs from "node:fs";
import path from "node:path";

import postcss from "postcss";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const REDUCE = ':where([data-motion="reduce"])';

/** Splits on a separator outside brackets and parentheses. */
function splitTop(s: string, sep = ","): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

type Weight = [number, number, number];
const heavier = (x: Weight, y: Weight) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];

/** A selector's weight, as the browser counts it (ids, classes and the like, elements). */
function weightOf(selector: string): Weight {
  const w: Weight = [0, 0, 0];
  let s = selector;
  for (;;) {
    const m = /:(where|is|not|has|nth-child|nth-last-child|nth-of-type|nth-last-of-type|dir|lang)\(/.exec(s);
    if (!m) break;
    let i = m.index + m[0].length;
    let depth = 1;
    while (depth && i < s.length) {
      if (s[i] === "(") depth++;
      else if (s[i] === ")") depth--;
      i++;
    }
    const inner = s.slice(m.index + m[0].length, i - 1);
    let add: Weight = [0, 0, 0];
    if (m[1] === "is" || m[1] === "not" || m[1] === "has") {
      for (const part of splitTop(inner)) {
        const pw = weightOf(part);
        if (heavier(pw, add) > 0) add = pw;
      }
    } else if (m[1] !== "where") add = [0, 1, 0];
    w[0] += add[0];
    w[1] += add[1];
    w[2] += add[2];
    s = `${s.slice(0, m.index)} ${s.slice(i)}`;
  }
  s = s.replace(/\[[^\]]*\]/g, () => (w[1]++, " "));
  s = s.replace(/::[\w-]+(\([^)]*\))?/g, () => (w[2]++, " "));
  s = s.replace(/#[\w-]+/g, () => (w[0]++, " "));
  s = s.replace(/\.(?:\\.|[\w-])+/g, () => (w[1]++, " "));
  s = s.replace(/:[\w-]+/g, () => (w[1]++, " "));
  s.replace(/(^|[\s>+~])([a-zA-Z][\w-]*)/g, () => (w[2]++, ""));
  return w;
}

/** The classes of the element a selector picks: its last compound. */
function subjectClasses(selector: string): string[] {
  const parts = selector.replace(/:where\([^)]*\)/g, " ").split(/\s*[\s>+~]\s*/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  return [...last.matchAll(/\.((?:\\.|[\w-])+)/g)].map((m) => m[1]);
}

/** What a declaration sets moving: an animation, or the properties a transition carries. A duration alone moves nothing. */
const familyOf = (prop: string) => (/^animation(-name)?$/.test(prop) ? "animation" : /^transition(-property)?$/.test(prop) ? "transition" : null);

type Said = { selector: string; family: string; order: number; line: number };

function stylesheet() {
  const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
  const stills: Said[] = [];
  const moves: Said[] = [];
  let order = 0;
  postcss.parse(css, { from: "app/globals.css" }).walkRules((rule) => {
    for (let p: postcss.Node | undefined = rule.parent; p; p = p.parent) if (p.type === "atrule" && /keyframes/.test((p as postcss.AtRule).name)) return;
    const at = order++;
    const line = rule.source?.start?.line ?? 0;
    for (const selector of splitTop(rule.selector)) {
      rule.each((node) => {
        if (node.type !== "decl") return;
        const family = familyOf(node.prop);
        if (!family) return;
        const value = node.value.trim();
        const none = /^none\b/.test(value) || /^0m?s$/.test(value);
        if (selector.startsWith(REDUCE)) {
          if (none) stills.push({ selector: selector.slice(REDUCE.length).trim(), family, order: at, line });
        } else if (!none && !/data-motion=/.test(selector)) {
          moves.push({ selector, family, order: at, line });
        }
      });
    }
  });
  return { stills, moves };
}

describe("the stylesheet's still rules", () => {
  it("count weight as the browser does", () => {
    expect(weightOf(".prayers-hero-in")).toEqual([0, 1, 0]);
    expect(weightOf(".prayers-hero-verse.prayers-hero-in")).toEqual([0, 2, 0]);
    expect(weightOf(':where([data-motion="reduce"]) .a')).toEqual([0, 1, 0]);
    expect(weightOf(".a:has(.b:active)")).toEqual([0, 3, 0]);
    expect(weightOf("body[data-reader-away] .reader-dock")).toEqual([0, 2, 1]);
    expect(weightOf(".ob-pick::after")).toEqual([0, 1, 1]);
    expect(weightOf(":is(.a, .b.c) > *")).toEqual([0, 2, 0]);
  });

  it("each outweighs the motion it stills, so with motion reduced nothing it was written for plays", () => {
    const { stills, moves } = stylesheet();
    expect(stills.length).toBeGreaterThan(100);
    const losses: string[] = [];
    for (const move of moves) {
      const classes = subjectClasses(move.selector);
      // The still rules written for this element: aimed at its classes, of its kind.
      const aimed = stills.filter((s) => {
        const own = subjectClasses(s.selector);
        return s.family === move.family && own.length > 0 && own.every((c) => classes.includes(c));
      });
      if (!aimed.length) continue;
      const weight = weightOf(move.selector);
      const held = aimed.some((s) => {
        const by = heavier(weightOf(s.selector), weight);
        return by > 0 || (by === 0 && s.order > move.order);
      });
      if (!held) losses.push(`line ${move.line}: ${move.selector} (${move.family}) outweighs ${aimed.map((s) => `${REDUCE} ${s.selector}`).join(", ")}`);
    }
    expect(losses).toEqual([]);
  });
});

// ── The components ─────────────────────────────────────────────────────

const SKIP = /(^|\/)(__tests__|admin)(\/|$)/;

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (SKIP.test(rel)) continue;
    if (entry.isDirectory()) sources(rel, out);
    else if (/\.tsx$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/** The string literals in a piece of source (static parts of a template literal included). */
function literals(src: string): { text: string; at: number }[] {
  const out: { text: string; at: number }[] = [];
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
    out.push({ text: (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " "), at: m.index ?? 0 });
  }
  return out;
}

/**
 * The class lists in a file: each cn() or clsx() call is one list (a class
 * applied in one state and the transition in another are one element's), and
 * every other string literal is its own.
 */
function classLists(src: string): { text: string; at: number }[] {
  const lists: { text: string; at: number }[] = [];
  const taken: [number, number][] = [];
  for (const m of src.matchAll(/\b(?:cn|clsx)\(/g)) {
    const start = (m.index ?? 0) + m[0].length;
    let i = start;
    let depth = 1;
    while (depth && i < src.length) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") depth--;
      i++;
    }
    lists.push({ text: literals(src.slice(start, i - 1)).map((l) => l.text).join(" "), at: m.index ?? 0 });
    taken.push([start, i]);
  }
  for (const l of literals(src)) if (!taken.some(([a, b]) => l.at >= a && l.at < b)) lists.push(l);
  return lists;
}

const utility = (token: string) => token.slice(token.lastIndexOf(":") + 1);
const variants = (token: string) => token.slice(0, Math.max(0, token.lastIndexOf(":"))).split(":").filter(Boolean);

/** A class list that moves a box with a transition and says nothing for the still path: what it moves, or null. */
function movesWhenStill(list: string): string | null {
  const tokens = list.split(/\s+/).filter(Boolean);
  // `motion-reduce:` is the house's variant; `[:where([data-motion=reduce])_&]:` says the same in Tailwind's own words.
  const escape = tokens.some((t) => /^(motion-reduce|\[:where\(\[data-motion=reduce\]\)_&\]):transition-(none|opacity|colors)$/.test(t));
  if (escape) return null;
  const carries = tokens.find((t) => {
    if (variants(t).includes("motion-safe") || variants(t).includes("motion-reduce")) return false;
    const u = utility(t);
    return u === "transition" || u === "transition-all" || u === "transition-transform" || /^transition-\[[^\]]*\b(transform|translate|scale|rotate)\b[^\]]*\]$/.test(u);
  });
  if (!carries) return null;
  const moved = tokens.find((t) => !variants(t).includes("motion-reduce") && /^-?(translate|scale|rotate)-/.test(utility(t)) && !/^-?(translate|scale|rotate)(-[xyz])?-(0|none|100)$/.test(utility(t)));
  return moved ? `${carries} with ${moved}` : null;
}

describe("the components' class lists", () => {
  it("know a list that moves when still from one that does not", () => {
    expect(movesWhenStill("fixed transition-transform duration-300 translate-x-full")).toBe("transition-transform with translate-x-full");
    expect(movesWhenStill("transition-[transform,translate,scale,opacity] duration-150 active:scale-[0.99]")).toBe("transition-[transform,translate,scale,opacity] with active:scale-[0.99]");
    expect(movesWhenStill("text-paper/55 group-open:rotate-180 transition-transform duration-200")).toBe("transition-transform with group-open:rotate-180");
    expect(movesWhenStill("transition-transform group-open:rotate-180 motion-reduce:transition-none")).toBeNull();
    expect(movesWhenStill("motion-safe:transition-transform motion-safe:duration-300 rotate-180")).toBeNull();
    expect(movesWhenStill("transition-transform duration-[380ms] [:where([data-motion=reduce])_&]:transition-none translate-y-full")).toBeNull();
    expect(movesWhenStill("transition-opacity duration-200 opacity-0")).toBeNull();
    expect(movesWhenStill("transition-colors hover:bg-paper/10")).toBeNull();
    // A cn() call is one element's list: the transition in one argument, the move in another.
    expect(classLists('<aside className={cn("fixed transition-transform", open ? "translate-x-0" : "translate-x-full")} />').map((l) => movesWhenStill(l.text)).filter(Boolean)).toEqual(["transition-transform with translate-x-full"]);
  });

  it("every list that moves a box with a transition is still with motion reduced", () => {
    const found: string[] = [];
    for (const file of [...sources("app"), ...sources("components")]) {
      const src = fs.readFileSync(path.join(ROOT, file), "utf8");
      for (const list of classLists(src)) {
        const what = movesWhenStill(list.text);
        if (what) found.push(`${file}:${src.slice(0, list.at).split("\n").length}: ${what}`);
      }
    }
    expect(found).toEqual([]);
  });
});
