import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The release notes a reader reads say nothing of keys or of a mouse (the
 * arbiter's word with the fresh-eyes items, 2026-11-11: "No sparkle, no keys,
 * hovering or code lines ... the keys rule reads data/changelog").
 *
 * What's new shows every note in data/changelog/entries.json (the committed
 * copy of the patch_notes table, and the apps' own) and the board message
 * above them (board.json). A note that says "Ctrl+K", "Esc" or "hover any
 * paragraph" speaks to a keyboard and a mouse the reader on a phone has
 * neither of; the guardrail walk found three on What's new in its first run
 * (docs/1.9-build/notes/gate-run-1.md). The old lines say what changed in
 * plain words now, and the table takes the same words (OWNER-STEPS, R0).
 *
 * The keys are checkMock's own `keys` rule (scripts/mock-check.mjs), copied
 * here because that rule runs inside the page; the last case fails if the two
 * ever part. The sparkle characters are lib/ui/__tests__/noSparkle.test.ts's,
 * which reads data/changelog too.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (f: string) => readFileSync(path.join(ROOT, f), "utf8");

/** checkMock's keys, as its source writes them: Esc, Ctrl or Cmd as a word, Alt, Option or Shift with a plus, the Mac's key signs. */
const KEY_SOURCE = String.raw`(?:^|[^\p{L}])(?:Esc|Ctrl|Cmd)(?![\p{L}])|(?:^|[^\p{L}])(?:Alt|Option|Shift)\s*\+|[\u2318\u2325\u21e7\u2303]`;
const KEY = new RegExp(KEY_SOURCE, "u");
/** And the keyboard named outright: the Escape key, arrow keys, the space bar, a shortcut. */
const KEYBOARD = /\bEscape[- ](?:key|to[- ]close)\b|\barrow[- ]keys?\b|\bspace ?bar\b|\bpress (?:space|enter)\b|\bbackspace\b|\bkeyboard shortcuts?\b/i;
/** A mouse's ways: hovering, a right-click, a mouse button. */
const MOUSE = /\bhover(?:s|ed|ing)?\b|\bright[- ]click\b|\bmouse(?:down|up|over)\b/i;

/** Code in a reader's line, by kind. */
const CODE: readonly (readonly [string, RegExp])[] = [
  ["backtick", /`[^`]+`/],
  ["file", /\b[\w.-]+\.(?:tsx?|mjs|jsx?|json|sql|css|md)\b/],
  ["path", /\b(?:lib|components|app|data|supabase|scripts|docs)\/[\w./[\]{}<>-]+/],
  ["call", /\b[a-z]\w*\([^)]*\)/],
  ["component", /\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b/],
  ["class", /\b(?:md|lg|sm|xl):[\w[\]-]+/],
  ["browser", /\b(?:window|router|document)\.\w+/],
  ["constant", /\b[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}\b/],
  ["tag", /<\/?(?:details|button|a|html|div|span|msg|kbd)\b[^>]*>/],
  ["table", /\b[a-z]+_[a-z_]+\b/],
];
/** Words the patterns would take for code: readers' handles and the names of products. */
const NOT_CODE = new Set(["ChristosAnesti", "cloudw_w", "PostHog", "PostCSS", "Next.js", "McEnerney", "McGuckin", "PayPal", "YouTube", "TikTok", "GitHub", "RevenueCat"]);

type Item = string | { text?: string };
type Note = { version: string; blurb?: string; items?: Item[] };

/** Every line a reader reads on What's new, with where it stands. */
function lines(): { where: string; text: string }[] {
  const notes = JSON.parse(read("data/changelog/entries.json")) as Note[];
  const out: { where: string; text: string }[] = [];
  for (const n of notes) {
    if (n.blurb) out.push({ where: `${n.version} blurb`, text: n.blurb });
    (n.items ?? []).forEach((it, i) => {
      const text = typeof it === "string" ? it : (it.text ?? "");
      if (text) out.push({ where: `${n.version} item ${i + 1}`, text });
    });
  }
  const board = JSON.parse(read("data/changelog/board.json")) as unknown;
  const walk = (v: unknown, where: string) => {
    if (typeof v === "string") out.push({ where, text: v });
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
  };
  walk(board, "board");
  return out;
}

describe("the notes on What's new speak to a reader's finger", () => {
  const all = lines();

  it("reads every note and the board", () => {
    expect(all.length).toBeGreaterThan(900);
  });

  it("names no key: no Ctrl+K, no Esc, no arrow keys, no space bar", () => {
    const found = all.filter((l) => KEY.test(l.text) || KEYBOARD.test(l.text)).map((l) => `${l.where}: ${l.text.slice(0, 90)}`);
    expect(found, "say what changed, not which key does it").toEqual([]);
  });

  it("asks for no mouse: no hovering, no right-click", () => {
    const found = all.filter((l) => MOUSE.test(l.text)).map((l) => `${l.where}: ${l.text.slice(0, 90)}`);
    expect(found, "say what changed, not what a mouse does").toEqual([]);
  });

  it("carries no code: no file, path, function, component, class, tag or table name", () => {
    // The arbiter's bar (2026-11-11): code becomes plain words, or goes where
    // it said nothing to a reader. Readers' handles, products and plurals
    // written "saint(s)" are words, and are named here.
    const found = all.flatMap((l) =>
      CODE.flatMap(([kind, re]) =>
        [...l.text.matchAll(new RegExp(re.source, "g"))].map((m) => m[0]).filter((w) => !NOT_CODE.has(w) && !/^\w+\(s\)$/.test(w)).map((w) => `${l.where}: ${kind} ${w}`),
      ),
    );
    expect(found, "say it in plain words").toEqual([]);
  });

  it("knows code when it sees it", () => {
    for (const [bad, kind] of [
      ["the `saint_bumps` table", "backtick"],
      ["see lib/i18n/locales.ts", "path"],
      ["SECURITY.md at the root", "file"],
      ["calls getMessages() on the server", "call"],
      ["the new TodayMenologionHero", "component"],
      ["hidden md:flex on phones", "class"],
      ["does a window.location.reload", "browser"],
      ["the ADMIN_DEBUG_ENABLED flag", "constant"],
      ["a <details> block", "tag"],
      ["rows in prayer_completions", "table"],
    ] as const) {
      expect(CODE.some(([k, re]) => k === kind && re.test(bad)), bad).toBe(true);
    }
    for (const ok of ["a reader on the Discord (ChristosAnesti)", "the saint(s) of the day", "a Next.js upgrade", "PostHog", "the Saved page", "Ephesians 1:19"]) {
      const words = CODE.flatMap(([, re]) => [...ok.matchAll(new RegExp(re.source, "g"))].map((m) => m[0])).filter((w) => !NOT_CODE.has(w) && !/^\w+\(s\)$/.test(w));
      expect(words, ok).toEqual([]);
    }
  });

  it("knows a key and a mouse when it sees them, and the words that are neither", () => {
    for (const bad of ["Ctrl+K opens it", "Esc closes it", "Escape to close", "the Escape key","press space to advance", "arrow keys move", "Shift + click", "Hover any paragraph", "right-click a verse", "a brighter hover state", "⌘K"]) {
      expect(KEY.test(bad) || KEYBOARD.test(bad) || MOUSE.test(bad), bad).toBe(true);
    }
    for (const ok of ["the keyboard on a phone ends above the field", "a key verse", "Escape from Egypt", "escaped quotation marks", "a mouse-coloured robe", "the hours of prayer"]) {
      expect(KEY.test(ok) || KEYBOARD.test(ok) || MOUSE.test(ok), ok).toBe(false);
    }
  });

  it("holds the keys checkMock holds", () => {
    expect(read("scripts/mock-check.mjs")).toContain(KEY_SOURCE);
  });
});
