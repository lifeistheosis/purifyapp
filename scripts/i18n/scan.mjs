// The hardcoded-string scan's reading of one .tsx file (scripts/i18n-check.mjs
// --scan): which stretches are words a reader sees, written in place of a t()
// key. Heuristics, not a parser: JSX text nodes with letters in them, and the
// props a reader meets (title, aria-label, placeholder, alt, label).
//
// Its own module so a test can hold it both ways, catching words and passing
// code: lib/i18n/__tests__/hardcodedScan.test.ts.
//
// TELLING CODE FROM WORDS (2026-11-10, the arbiter: six findings on the branch
// were code read as words). The text pattern looks for `> words <` on a line,
// and code is full of > and <: an arrow, a comparison, a generic. Three readings
// of the source around a match, each exact for JSX, settle most of them:
//   - a JSX tag never ends in `=>`, so a match opened by an arrow is code
//     (`([e]) => setShow(e.boundingClientRect.bottom < 0)`);
//   - a JSX tag begins `<` and a letter, `/` or `>`, so a match closed by any
//     other `<` (a comparison, `< 0`, `<= max`) is code;
//   - a type declaration is never copy, so `type X = A<B> & Partial<C>;` is
//     blanked like a comment before the scan reads the file.
// And code's operators (`!=`, `==`, `??`, `?.`) never stand in prose.

import fs from "node:fs";
import path from "node:path";

/**
 * Directories whose UI strings have been fully extracted. Grows one surface at
 * a time; the scan fails on words typed into a file under these, in
 * npm run i18n:check --scan and in lib/i18n/__tests__/hardcodedScan.test.ts.
 */
export const CONVERTED_DIRS = [
  "components/layout",
  "components/nav",
  "components/i18n",
  "components/today",
  "components/calendar",
  "components/fasting",
  "components/prayers",
  "components/discover",
  "app/(app)/prayers",
  "components/bible",
  "app/(app)/bible",
  "components/saints",
  "app/(app)/saints",
  "app/(app)/councils",
  "app/(app)/history",
  "app/(app)/theology",
  "app/(app)/topics",
  "app/(app)/apologetics",
  "app/(app)/heresies",
  "app/(app)/discover",
  "app/(app)/reading",
  "app/(app)/saved",
  "app/(app)/florilegium",
  "app/(app)/chants",
  "app/(app)/walkthroughs",
  "app/(app)/account",
  "app/(auth)",
  "app/(app)/premium",
  "app/(app)/pricing",
  "app/(app)/plan",
  "app/(app)/whats-new",
  "app/(app)/faq",
  "app/(app)/about",
  "app/(app)/support",
  "components/profile",
  "components/account",
  "components/premium",
  "components/onboarding",
  "components/pwa",
  "components/mobile",
  "app/(app)/shop",
  "app/(app)/campaigns",
  "components/shop",
  "components/campaigns",
  "components/gifts",
  "components/marketing",
  "components/reader",
  "components/ui",
  "components/native",
  "components/analytics",
  "components/feature",
  "components/content",
  "components/history",
  "components/florilegium",
  "components/theology",
  "components/saved",
  "components/reading",
  "components/chants",
  "components/walkthrough",
  "app/(app)/parishes",
  "components/parishes",
  "components/widget",
  "components/start",
  "app/(app)/start",
];

/** Intentional literals the scan lets through: brand names, citations, whole files. */
export const ALLOWLIST_FILE = path.join("scripts", "i18n", "scan-allowlist.json");

export function readAllowlist(root) {
  const file = path.join(root, ALLOWLIST_FILE);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { substrings: [], files: [] };
}

function* tsxUnder(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* tsxUnder(full);
    // JSX copy lives in .tsx; scanning .ts only yields type-position false positives.
    else if (entry.name.endsWith(".tsx")) yield full;
  }
}

/** Every .tsx under these directories (relative to root), scanned with the allowlist: [{ file, hits }]. */
export function scanDirs(root, dirs, allowlist = readAllowlist(root)) {
  const results = [];
  for (const relDir of dirs) {
    const abs = path.join(root, relDir);
    if (!fs.existsSync(abs)) continue;
    for (const full of tsxUnder(abs)) {
      const file = path.relative(root, full).replace(/\\/g, "/");
      if ((allowlist.files ?? []).includes(file)) continue;
      if ((allowlist.dirPrefixes ?? []).some((d) => file.includes(d))) continue;
      const hits = scanSource(fs.readFileSync(full, "utf8"), allowlist.substrings ?? []);
      if (hits.length > 0) results.push({ file, hits });
    }
  }
  return results;
}

/** User-facing string props. */
const PROP_RE = /(?:title|aria-label|placeholder|alt|label)=\s*"([^"]{3,})"/g;
/**
 * JSX text: > ...letters... < on one line, not starting with { (an expression)
 * and containing at least one ASCII letter run of 3+.
 */
const TEXT_RE = />\s*([^<>{}\n]*[A-Za-z]{3}[^<>{}\n]*?)\s*</g;

/** Replaces every character but a newline with a space, so line numbers hold. */
const blank = (s) => s.replace(/[^\n]/g, " ");

/**
 * The source as the scan reads it: comments and type declarations blanked, so
 * doc comments, type annotations in them and type-level generics cannot match.
 */
export function readable(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, blank)
    .replace(/^[ \t]*(?:export[ \t]+)?type[ \t]+\w+[^=\n]*=[\s\S]*?;[ \t]*$/gm, blank);
}

/**
 * The words a reader would see in this source that are not a t() key, as
 * { line, text }. `substrings` silences intentional literals (brand names,
 * citations), as scripts/i18n/scan-allowlist.json lists them.
 */
export function scanSource(source, substrings = []) {
  const src = readable(source);
  const hits = [];
  for (const re of [PROP_RE, TEXT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const text = m[1].trim();
      if (!/[A-Za-z]{3}/.test(text)) continue;
      if (re === TEXT_RE && isCode(src, m, text)) continue;
      // Template-literal interiors are code.
      if (text.includes("${")) continue;
      // Comparison/boolean expressions spanning tag-like operators
      // (a > b && c < d) are code, not copy.
      if (/^=|&&|\|\|/.test(text) || /^[=!<>]/.test(text)) continue;
      if (text.startsWith("(") && text.includes(".")) continue;
      if (substrings.some((s) => text.includes(s))) continue;
      const line = src.slice(0, m.index).split("\n").length;
      hits.push({ line, text: text.slice(0, 60) });
    }
  }
  return hits;
}

/** Whether a JSX-text match is code read as words. */
function isCode(src, m, text) {
  // An arrow: `x => words <` (a JSX tag never ends in `=>`).
  if (src[m.index - 1] === "=") return true;
  // A `<` that does not begin a tag: a comparison, `a < 0`, `b <= max`.
  const after = src[m.index + m[0].length];
  if (after === undefined || !/[A-Za-z/>]/.test(after)) return true;
  // Code's operators, which prose never writes.
  if (/!=|==|\?\?|\?\.\w/.test(text)) return true;
  // Single identifier-like words in a text position are almost always TS
  // generics (Promise<void>, ReactNode) rather than copy; eslint
  // jsx-no-literals is the net for one-word JSX text.
  if (!text.includes(" ") && text.length < 10) return true;
  // JSX ternary/expression connectors between two tags, e.g.
  // ") : headline ? (" or "cond === x ? (": code, not copy.
  if (/^[)\]}].*[({[]$/.test(text)) return true;
  if (/[({[]$/.test(text) && /[?=&|]/.test(text)) return true;
  // The two guards above only catch a code fragment whose brackets sit at its
  // very ends. A match can also slice through the MIDDLE of a call:
  // `if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1)` hands this regex
  // "48) step(dx", because the > and the < read as tag delimiters. What gives
  // it away is a closing bracket with no opening bracket before it, which
  // balanced prose cannot produce. Copy that opens its own parenthetical,
  // "Read more (opens a new tab)", is still flagged, because there the open
  // comes first.
  const close = text.search(/[)\]}]/);
  const open = text.search(/[({[]/);
  if (close !== -1 && (open === -1 || close < open)) return true;
  // An object literal between two tags is code: `<T .../>, title: <T` hands
  // this regex ", title:", and `{ start: x > 4, end: y < max }` hands it
  // "4, end: el.scrollLeft". Prose does not start with a comma and end on a
  // colon, or read as `operand, key: member.access`.
  if (/^,\s*\w+:$/.test(text)) return true;
  if (/^\w+,\s*\w+:\s*\w+(\.\w+)+$/.test(text)) return true;
  return false;
}
