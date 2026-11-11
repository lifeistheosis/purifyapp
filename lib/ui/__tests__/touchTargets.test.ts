// A source-reading guard, in the idiom of lib/saints/__tests__/iconRights.test.ts
// (MAX_UNVERIFIED) and lib/calendar/__tests__/noFrozenDay.test.ts.
//
// WCAG 2.5.5 asks for a 44x44 CSS px touch target. Nothing in CI checks it:
// tests/smoke/_axe.ts runs the WCAG 2.1 AA tag set, and `target-size` is AAA,
// so it is not in the run. The audit counted roughly sixty interactive
// elements under the floor, worst of them the Save control on Today at 61x22,
// whose height came from a 22px icon and no padding at all.
//
// This cannot measure pixels: vitest here is a node environment with no DOM
// and no layout. What it can do is count the class patterns that PROVE a
// too-small box, and hold that count so it only falls. Fixing a control means
// the number drops and the ceiling drops with it in the same commit. Adding
// one means the suite goes red.
//
// Deliberately narrow: it only counts explicit height classes on elements that
// are interactive, because those are unambiguous. It does NOT catch a control
// whose height comes from its content, which is exactly what the Save button
// was, so a falling number here is evidence of progress and never a proof of
// compliance. The real check is a device walk.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components"];

// Tailwind height classes below 44px (h-11 = 2.75rem = 44px is the floor).
// h-10 = 40, h-9 = 36, h-8 = 32, h-7 = 28, h-6 = 24.
const SMALL_H = /\bh-(?:[1-9]|10)\b(?!\S)/;

// Heights written out (min-h-[42px], h-[2.5rem]), which the scale above
// cannot see: four controls stood at 42px that way until 2026-11-10 (Fable
// Theology's find, the Community composer's two and Search's rows). A rem is
// the app's root, 17px. A max-h is a ceiling, not a height, and is not read.
const WRITTEN_H = /(?<![\w-])(?:min-)?h-\[(\d+(?:\.\d+)?)(px|rem)\]/g;
const ROOT_PX = 17;

// Sizes by the scale's size-N (width and height at once), which neither
// reading above saw: fourteen places stood at size-4 to size-10 that way
// until 2026-11-11 (1.9, the Updates chat's finding).
const SMALL_SIZE = /(?<![\w-])size-(?:[1-9]|10)\b(?!\S)/;

// Heights made of padding around a line of words (`px-2.5 py-1 text-caption`,
// 26.5px), which no reading above sees, since no height is stated at all:
// the fasting tracker's thirty Kept, In part and Broke pills stood at 29px
// that way until 2026-11-11 (fresh eyes M5; Fable Themes' 8a5c3cf7 took them
// to 44 with .hit-44), and the admin panel's shared picker at 38px (Admin's
// find). The height is the top and bottom padding and the line the words
// stand on: the house's type is set in px (app/globals.css, --text-caption
// and the rest), its line 1.5 of the size unless a leading says otherwise.
// Read from the classes a phone wears (a breakpoint's own are set aside).
const TYPE_PX: Record<string, number> = { eyebrow: 11, caption: 12, detail: 13, ui: 14, body: 17, lede: 19, "title-sm": 22, title: 28, heading: 32, xs: 0.75 * 17, sm: 0.875 * 17, base: 17, lg: 1.125 * 17 };
const LEADING: Record<string, number> = { none: 1, tight: 1.25, snug: 1.375, normal: 1.5, relaxed: 1.625, loose: 2 };

/** The height padding and one line of words give a control that states none, or null if it has no vertical padding or no size of type. */
function paddedHeight(classes: string): number | null {
  const space = (v: string) => (v.startsWith("[") ? (v.endsWith("px]") ? parseFloat(v.slice(1)) : parseFloat(v.slice(1)) * ROOT_PX) : Number(v) * 0.25 * ROOT_PX);
  const tokens = classes
    .replace(/["'`{}()?,]/g, " ")
    .split(/\s+/)
    // A class behind a variant (md:, hover:, pointer-fine:, a ternary's own colon) is not the phone's at rest.
    .filter((t) => t && !t.includes(":"));
  let top = 0;
  let bottom = 0;
  let padded = false;
  let size: number | null = null;
  let lead = 1.5;
  let linePx: number | null = null;
  for (const t of tokens) {
    let m: RegExpExecArray | null;
    if ((m = /^p[ytb]?-(\d+(?:\.\d+)?|\[[\d.]+(?:px|rem)\])$/.exec(t))) {
      const v = space(m[1]);
      if (t.startsWith("pt-")) top = v;
      else if (t.startsWith("pb-")) bottom = v;
      else top = bottom = v;
      padded = true;
    } else if ((m = /^text-(eyebrow|caption|detail|ui|body|lede|title-sm|title|heading|xs|sm|base|lg)$/.exec(t))) size = TYPE_PX[m[1]];
    else if ((m = /^text-\[(\d+(?:\.\d+)?)px\]$/.exec(t))) size = Number(m[1]);
    else if ((m = /^leading-(none|tight|snug|normal|relaxed|loose)$/.exec(t))) lead = LEADING[m[1]];
    else if ((m = /^leading-\[(\d+(?:\.\d+)?)\]$/.exec(t))) lead = Number(m[1]);
    else if ((m = /^leading-\[(\d+(?:\.\d+)?)px\]$/.exec(t))) linePx = Number(m[1]);
  }
  if (!padded || size === null) return null;
  return top + bottom + (linePx ?? size * lead);
}

/** Whether a written-out height under 44px stands in these classes. */
function writtenSmall(classes: string): boolean {
  for (const m of classes.matchAll(WRITTEN_H)) {
    const px = m[2] === "px" ? Number(m[1]) : Number(m[1]) * ROOT_PX;
    if (px < 44) return true;
  }
  return false;
}

/**
 * The classes a finger meets: a class that holds only under a fine pointer
 * (`pointer-fine:h-7`, `md:pointer-fine:min-h-0`) is a mouse's, and is set
 * aside before a height is read. WCAG's floor for a pointer is 24px (2.5.8);
 * the 44 this count holds is a finger's (2.5.5). So a control that states
 * a finger's 44 and a mouse's 28 (the admin panel's rows, the reader's
 * desktop circles) is 44 here, and one that is small for a finger is still
 * counted whatever a mouse gets.
 */
function fingerClasses(classes: string): string {
  return classes
    .split(/\s+/)
    .filter((token) => !token.includes("pointer-fine:") && !token.includes("(pointer:fine)"))
    .join(" ");
}

/**
 * A control drawn only for a fine pointer: hidden, and shown by a
 * pointer-fine display (`hidden [@media(pointer:fine)]:inline-flex`, the
 * scroll rail's arrows). A finger never meets it, so its size is a mouse's.
 */
function mouseOnly(classes: string): boolean {
  return /(?<![\w:-])hidden\b/.test(classes) && /(?:pointer-fine:|\[@media\(pointer:fine\)\]:)(?:inline-flex|flex|inline-grid|grid|inline-block|block|inline)\b/.test(classes);
}

// Class strings a control names rather than writes (`className={cn(PILL,
// ...)}`), read from where they are written: the same file, or a module of
// the app it imports. Until 2026-11-11 only the same file's were read, so
// Graphite's PILL (min-h-11) was missed and profile's See all was counted
// at 32px, and a small constant imported from elsewhere could slip by.
const CONSTANT = /\b(?:export\s+)?const\s+([A-Za-z_]\w*)\s*=\s*(["'`])([^"'`\n]*)\2/g;
const moduleConstants = new Map<string, Map<string, string>>();
function constantsOf(base: string): Map<string, string> {
  const known = moduleConstants.get(base);
  if (known) return known;
  const found = new Map<string, string>();
  for (const file of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    let src: string;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const m of src.matchAll(CONSTANT)) found.set(m[1], m[3]);
    break;
  }
  moduleConstants.set(base, found);
  return found;
}
function fileConstants(src: string): Map<string, string> {
  const named = new Map([...src.matchAll(CONSTANT)].map((m) => [m[1], m[3]] as [string, string]));
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@\/([^"]+)"/g)) {
    const mod = constantsOf(join(ROOT, m[2]));
    for (const part of m[1].split(",")) {
      const [name, alias] = part.trim().split(/\s+as\s+/);
      const local = (alias ?? name ?? "").trim();
      const value = mod.get((name ?? "").trim());
      if (value !== undefined && local && !named.has(local)) named.set(local, value);
    }
  }
  return named;
}

// A height the house's own stylesheets give a class (`.adm-rail-view {
// min-height: 28px }`), read from app/**/*.css: the largest such height
// any rule for that class states, or NaN where its rules give it padding
// and no height, so its height is its contents' and cannot be read here.
function* cssFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* cssFiles(full);
    else if (entry.endsWith(".css")) yield full;
  }
}
const CSS_HEIGHT = new Map<string, number>();
for (const css of cssFiles(join(ROOT, "app"))) {
  const text = readFileSync(css, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of text.matchAll(/(?:^|[}\s])\.([A-Za-z][\w-]*)\s*\{([^{}]*)\}/g)) {
    const h = /(?:^|;)\s*(?:min-)?height\s*:\s*(\d+(?:\.\d+)?)px/.exec(m[2]);
    if (h) CSS_HEIGHT.set(m[1], Math.max(Number.isNaN(CSS_HEIGHT.get(m[1])) ? 0 : CSS_HEIGHT.get(m[1]) ?? 0, Number(h[1])));
    else if (/(?:^|;)\s*padding(?:-block|-top|-bottom)?\s*:/.test(m[2]) && !CSS_HEIGHT.has(m[1])) CSS_HEIGHT.set(m[1], NaN);
  }
}

// Text links and buttons standing in a list (1.9, the arbiter's word of
// 2026-11-11, "every control"): a control whose tag stands directly in an
// <li>, with no height and no padding of its own and nothing inside it but
// its words and an inline icon, is as tall as its line of words: the
// website footer's column links stood at 21px that way, 12px apart, which no
// reading above sees, since no height or padding is stated at all.

/**
 * Whether the control's tag stands directly in a list item: `<li ...>` before
 * it on its line, or alone on a line above, with nothing between but a
 * condition that opens around it (`{href ? (`, `{open && (`), as an event's
 * Scripture links stand.
 */
function inListItem(lines: string[], i: number, tagAt: number): boolean {
  const opener = /^\{[^{}]*(?:\?|&&)\s*\(?$|^\($/;
  const li = /<li\b[^>]*>\s*(?:\{[^{}]*(?:\?|&&)\s*\(?\s*)?$/;
  const before = lines[i].slice(0, tagAt).trim();
  if (li.test(before)) return true;
  if (before !== "" && !opener.test(before)) return false;
  for (let k = i - 1; k >= 0 && k >= i - 4; k--) {
    const t = lines[k].trim();
    if (!t || t.startsWith("{/*") || t.startsWith("//") || t.startsWith("*") || opener.test(t)) continue;
    return /^<li\b[^>]*>$/.test(t) || li.test(t);
  }
  return false;
}

/** The height of a control made of a line of words and any padding: the body's 17px at 1.5 where no size is said. */
function listedHeight(classes: string): number {
  const space = (v: string) => (v.startsWith("[") ? (v.endsWith("px]") ? parseFloat(v.slice(1)) : parseFloat(v.slice(1)) * ROOT_PX) : Number(v) * 0.25 * ROOT_PX);
  let top = 0;
  let bottom = 0;
  let size = ROOT_PX;
  let lead = 1.5;
  let linePx: number | null = null;
  for (const t of classes.replace(/["'`{}()?,]/g, " ").split(/\s+/).filter((t) => t && !t.includes(":"))) {
    let m: RegExpExecArray | null;
    if ((m = /^p[ytb]?-(\d+(?:\.\d+)?|\[[\d.]+(?:px|rem)\])$/.exec(t))) {
      const v = space(m[1]);
      if (t.startsWith("pt-")) top = v;
      else if (t.startsWith("pb-")) bottom = v;
      else top = bottom = v;
    } else if ((m = /^text-(eyebrow|caption|detail|ui|body|lede|title-sm|title|heading|xs|sm|base|lg)$/.exec(t))) size = TYPE_PX[m[1]];
    else if ((m = /^text-\[(\d+(?:\.\d+)?)px\]$/.exec(t))) size = Number(m[1]);
    else if ((m = /^leading-(none|tight|snug|normal|relaxed|loose)$/.exec(t))) lead = LEADING[m[1]];
    else if ((m = /^leading-\[(\d+(?:\.\d+)?)\]$/.exec(t))) lead = Number(m[1]);
    else if ((m = /^leading-\[(\d+(?:\.\d+)?)px\]$/.exec(t))) linePx = Number(m[1]);
  }
  return top + bottom + (linePx ?? size * lead);
}

/** What stands inside the control, after its opening tag. */
function childrenOf(markup: string): string {
  let depth = 0;
  let quote = "";
  for (let k = 1; k < markup.length; k++) {
    const c = markup[k];
    if (quote) {
      if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return markup.slice(k + 1);
  }
  return "";
}

/**
 * Only words and inline icons inside: no block, picture or other component of
 * the app, and no markup the file built beforehand (`{inner}` where `const
 * inner = (<div ...`), any of which would give the control its own height.
 */
function wordsOnly(children: string, icons: Set<string>, src = ""): boolean {
  if (/<(?:div|img|Image|p|ul|ol|li|section|article|figure|h[1-6])\b/.test(children)) return false;
  for (const m of children.matchAll(/<([A-Z]\w*)/g)) if (m[1] !== "T" && !icons.has(m[1])) return false;
  for (const m of children.matchAll(/\{\s*([A-Za-z_]\w*)\s*\}/g)) if (new RegExp(`\\bconst\\s+${m[1]}\\s*=\\s*\\(?\\s*<`).test(src)) return false;
  return !/className=[^>]*(?<![\w-])(?:block|flex|grid)\b/.test(children);
}

/** A name in the control's classes this count cannot read: a constant it was not given, or a function's answer (`item(on)`). */
function unread(stated: string, constants: Map<string, string>): boolean {
  // An arbitrary value's own CSS (`[transition-duration:var(--x)]`) is no name of the code's.
  const code = stated.replace(/\[[^\]]*\]/g, "");
  for (const m of code.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)) if (!constants.has(m[0])) return true;
  return /\b(?!cn\(|clsx\(|cx\()[a-z]\w*\(/.test(code);
}

/** Lines that both open an interactive element and set a sub-44px height. */
const INTERACTIVE = /<(?:button|a|Link)\b/;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (["node_modules", ".next", "out", "__tests__"].includes(entry)) continue;
      yield* walk(full);
    } else if (entry.endsWith(".tsx")) {
      yield full;
    }
  }
}

/**
 * The control's own classes: the first className after its tag, unless a
 * child's tag comes first (then it has none here). A string, or a {...}
 * expression read to its closing brace, with the class strings of any
 * same-file constant it names (`const arrow = "h-11 w-11 ..."`), which the
 * window alone could not see.
 */
function ownClasses(window: string, constants: Map<string, string>): string | null {
  const at = window.indexOf("className=");
  if (at < 0 || /<[A-Za-z]/.test(window.slice(1, at))) return null;
  const rest = window.slice(at + "className=".length);
  let own = "";
  if (rest[0] === '"' || rest[0] === "'") {
    const end = rest.indexOf(rest[0], 1);
    own = rest.slice(1, end < 0 ? undefined : end);
  } else if (rest[0] === "{") {
    let depth = 0;
    let quote = "";
    for (let k = 0; k < rest.length; k++) {
      const c = rest[k];
      if (quote) {
        if (c === quote) quote = "";
        continue;
      }
      if (c === '"' || c === "'") quote = c;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        own = rest.slice(1, k);
        break;
      }
    }
    if (!own) own = rest;
  }
  for (const name of own.match(/\b[A-Za-z_]\w*\b/g) ?? []) {
    const value = constants.get(name);
    if (value) own += ` ${value}`;
  }
  return own;
}

/** A height of 44px or more that the control states for itself. */
function statesTall(classes: string): boolean {
  if (/(?<![\w-])(?:min-)?h-(?:1[1-9]|[2-9]\d|\d{3}|full|screen|svh|dvh)\b/.test(classes)) return true;
  if (/(?<![\w-])size-(?:1[1-9]|[2-9]\d|\d{3})\b/.test(classes)) return true;
  for (const m of classes.matchAll(/(?<![\w-])(?:min-)?(?:h|size)-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) {
    if ((m[2] === "px" ? Number(m[1]) : Number(m[1]) * ROOT_PX) >= 44) return true;
  }
  return false;
}

/**
 * Count sub-44px interactive elements. Each control is read by its own
 * classes first (a height it states for itself, small or 44 and over), and
 * by the classes inside it only when it states none, since then a child's
 * height is its height (an icon button is the size of its icon). Read twelve
 * lines from the tag (1.9: eight missed the Ambience row and the reader
 * settings' chips, whose classes sit further down), and a .hit-44 control
 * has a 44px touch box whatever height it paints at.
 */
function countSmallTargets(): {
  total: number;
  byFile: Record<string, number>;
  written: number;
  writtenByFile: Record<string, number>;
  sized: number;
  sizedByFile: Record<string, number>;
  padded: number;
  paddedByFile: Record<string, number>;
  listed: number;
  listedByFile: Record<string, number>;
} {
  const paddedByFile: Record<string, number> = {};
  let padded = 0;
  const listedByFile: Record<string, number> = {};
  let listed = 0;
  const byFile: Record<string, number> = {};
  const writtenByFile: Record<string, number> = {};
  const sizedByFile: Record<string, number> = {};
  let total = 0;
  let written = 0;
  let sized = 0;
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      const constants = fileConstants(src);
      const icons = new Set([...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@\/components\/ui\/icons\/[^"]+"/g)].flatMap((m) => m[1].split(",").map((n) => (n.trim().split(/\s+as\s+/)[1] ?? n.trim()).trim())));
      let n = 0;
      let w = 0;
      let z = 0;
      let q = 0;
      let l = 0;
      for (let i = 0; i < lines.length; i++) {
        if (!INTERACTIVE.test(lines[i])) continue;
        // The className may sit on the same line or a few lines below.
        const tagAt = lines[i].search(INTERACTIVE);
        const window = [lines[i].slice(tagAt), ...lines.slice(i + 1, i + 12)].join(" ");
        const upToNextTag = window.split(/<(?:button|a|Link)\b/).slice(0, 2).join(" ");
        if (!/className=/.test(upToNextTag)) continue;
        const stated = ownClasses(upToNextTag, constants);
        // Drawn only for a fine pointer: a mouse's, whatever its size.
        if (stated !== null && mouseOnly(stated)) continue;
        const own = stated === null ? null : fingerClasses(stated);
        const read = own === null || (!SMALL_H.test(own) && !writtenSmall(own) && !SMALL_SIZE.test(own) && !statesTall(own)) ? fingerClasses(upToNextTag) : own;
        // A control carrying .hit-44 has a 44px touch box regardless of the
        // height it paints at, so it is not a defect even though the small
        // height class is still there.
        if (/\bhit-44\b/.test(read) || (own !== null && /\bhit-44\b/.test(own))) continue;
        if (SMALL_H.test(read)) n++;
        else if (writtenSmall(read)) w++;
        else if (SMALL_SIZE.test(read)) z++;
        else if (own !== null && !statesTall(own) && !/(?<![\w-])(?:min-)?(?:h|size)-/.test(own)) {
          // No height stated anywhere it is read: padding and its line of words make it.
          const h = paddedHeight(own);
          if (h !== null && h < 44) q++;
          else if (h === null && stated !== null && !unread(stated, constants) && inListItem(lines, i, tagAt)) {
            // A line of words in a list: as tall as its line, or as a class of the house's stylesheets makes it.
            const markup = [lines[i].slice(tagAt), ...lines.slice(i + 1, i + 30)].join(" ");
            const close = /<\/(?:a|Link|button)>/.exec(markup);
            if (close && wordsOnly(childrenOf(markup.slice(0, close.index)), icons, src)) {
              const fromCss = own.split(/\s+/).map((t) => CSS_HEIGHT.get(t)).filter((v): v is number => v !== undefined);
              if (!fromCss.some((v) => Number.isNaN(v)) && Math.max(listedHeight(own), ...fromCss) < 44) l++;
            }
          }
        }
      }
      const name = file.slice(ROOT.length + 1).replace(/\\/g, "/");
      if (n > 0) {
        byFile[name] = n;
        total += n;
      }
      if (w > 0) {
        writtenByFile[name] = w;
        written += w;
      }
      if (z > 0) {
        sizedByFile[name] = z;
        sized += z;
      }
      if (q > 0) {
        paddedByFile[name] = q;
        padded += q;
      }
      if (l > 0) {
        listedByFile[name] = l;
        listed += l;
      }
    }
  }
  return { total, byFile, written, writtenByFile, sized, sizedByFile, padded, paddedByFile, listed, listedByFile };
}

// The count as measured when this guard was written. IT MAY ONLY FALL.
// Lower it in the same commit that fixes the controls, so the diff shows the
// work. Never raise it.
//
// 49 -> 46 when components/admin/preview/PurifyShopifyAdmin.tsx was deleted in
// v5. That file was 826 lines of dead Polaris mockup behind /admin/preview,
// imported by nothing, and it held three of the offenders. The ceiling was at
// exactly 49 with the tree at 49, so the redesign had no room for a single
// compact control until it went.
//
// 46 -> 40 on 2026-09-28, with the saved, reading and Florilegium redesign:
// its new controls went in at 44px, the Discord first-open card's two buttons
// went from 40 to 44, and the 40px icon tile became a named constant
// (Graphite ICON_TILE_SM) so a tall row that shows one is no longer read as a
// small target.
//
// 40 -> 39 on 2026-10-15 (1.7): the old floating ambience controller went,
// ambience moved into the reader's settings at 44px.
//
// 39 -> 35 on 2026-10-16 (1.7), with the one phone tab bar (MobileHeader):
// the bar's Support lamp and the dead one in MobileTopBar went, Today's old
// bar and its 40px bell went, and You's 36px settings mark left the bar. The
// search, the bell and the Premium pill's box are 44px on every tab.
//
// 35 -> 33 on 2026-10-28 (1.8), with the Bible reader as the owner's pick B
// of round 2, "The page": the reader's bookmark and settings icons left the
// bar for two round buttons with 44px touch boxes, and the chapter's name on
// the pill is h-11, over 44px. The tree stood at 34 before it, one under the
// line.
// 33 -> 29 on 2026-11-08 (1.9, build 88 note 5, found by
// scripts/mock-check.mjs): the shared sheet's close and the phone top bar's
// menu button were h-10 w-10, 42.5px on the app's 17px root, and are h-11
// w-11. The top bar's back button had the same size in a class constant this
// count cannot see, and went to h-11 w-11 with them. The tree stood at 31
// before it.
// 29 -> 28 on 2026-11-10 (1.9, the arbiter's guardrail list from the Themes
// chat's scripts/mock-check.mjs run on John 1): the chapter pill's two arrows
// were h-10 w-10, 42.5px, and are 44 to the touch with .hit-44, as the audio
// dock's arrows already were. The 44 commentary markers on the same page,
// about 14 by 5 drawn, had a 24px touch box in a class constant this count
// cannot see, and are .hit-44 with them (held below).
// 28 -> 26 on 2026-11-10 (1.9): the tree stood at 26, two fixed since
// without the ceiling following.
// 1.9 (2026-11-11, the arbiter's word): the count reads twelve lines from
// the tag, and each control by its own classes first, so a child's height
// counts only where the control states none of its own (an icon button is
// the size of its icon). So taught it saw 30. The same night 23 went to 44,
// their look kept (.hit-44, or the row's own min-h-11 where it was 57px
// already). Left: the Bible's and a Father's work's desktop action circles
// (VerseRow 1303, 1326, 1359, 1380; ParagraphRow 423, 455, 471), 28px and
// 4px apart, so a 44px touch box would reach into the next one: their
// spacing waits on the owner's word; and the admin panel's five (Admin's):
// SupportConsole 496, GrowthPanel 578 and 597, MessagesTab 296,
// TrafficViews 953.
// 12 -> 7 the same night (the arbiter's word): the admin panel's five are 44.
// The support console's Put in tracking is min-h-11, and Put in the order
// beside it too, which sat past the window; the messages' Shop threads
// switch is min-h-11; the multi-buy's Add a step is h-11, and its Remove
// keeps h-10 beside the two pickers it lines up with and carries .hit-44;
// the traffic reader's scrim was never small, a full-screen button read by
// the grab handle under it, and states its height (h-full) now. Left: the
// seven circles above, which are the Updates chat's.
// 7 -> 0 on 2026-11-11 (1.9): the circles are a mouse's. Opened to 44 with
// .hit-44 and 17px between them, they took 64px from the verse's words on
// the website (reverted, 456400e86), and measuring them showed a finger
// never had them: a tablet's browser has no hover, so they stood unseen,
// and a hold there dimmed the verse and opened nothing, its window being
// md:hidden. So the toolbar shows only to a fine pointer at md and wider
// (md:pointer-fine:flex), a finger at any width holds the verse or the
// paragraph for its window, as on a phone and in the apps' tablets (1.7.1),
// and each circle states a finger's 44 and a mouse's 28, which this count
// reads by fingerClasses above. None is left.
const MAX_SMALL_TARGETS = 0;

// Heights written out (WRITTEN_H above), counted on their own so the ceiling
// above keeps its history and still only falls. The count learned to read
// them on 2026-11-10 (1.9, Fable Theology's find), when it saw 32: the
// Community composer's field and its Share a line, and Search's rows, at
// 42px, went to 44 the same day; the 29 left are the admin panel's 17
// (30 to 42px, a computer's mouse more than a finger), the shop's 7, and
// one each in the reader's settings, the journal's Today, Now Playing,
// Today's masthead and the profile's settings. IT MAY ONLY FALL, as above.
// The admin panel's 17 went to 44 the same evening (the arbiter's word: he
// uses the panel on his phone, and the rail shows on his iPad): the rail's
// rows, the segmented controls, the reader card's actions, the grab handle,
// and the rows that were 44 only under md now at every width. Two of the 17
// were a child's height read as the button's (the handle's 4px bar, a 20px
// code badge): each button is min-h-11 now, and the child keeps its look by
// its style or its line height.
// The last 12, the ones a reader meets, went the same night (the arbiter's
// word): the 40px controls are 44 (the reader's settings rows, the Ambience
// row beside them too, which sat past this count's window; the shop's
// preview banner, its filter options and the seller's next step); the chips
// and the message's heart keep their size and carry .hit-44 (the product's
// chips, the shop's facet chips and their Clear all, whose wrapped rows now
// stand 10px apart so the touch boxes do not overlap; the profile's
// toggles; the masthead's fasting link, a line of text); and two were a
// child's height read as the control's (Today's icon tile in a 54px row,
// Now Playing's loop number in a 44px option), which keep their look by
// size-[38px] and by style. None is left.
// The count taught on 2026-11-11 (above) sees two more that the eight-line
// window could not: the admin panel's traffic rows (TrafficViews 283 and
// 772, min-h-[27px] and min-h-[28px]). Not new controls, newly seen, as the
// 32 were when the count first read written heights; they are Admin's, and
// this falls to 0 with them.
// 2 -> 0 the same night: the country rows beside the map are min-h-11 to a
// finger (46.75px measured), and under a mouse (pointer-fine) stand at 28px
// by padding, where they were drawn at 27, above WCAG's 24px floor for a
// pointer; the table's country name keeps its 28px and carries .hit-44,
// whose 44px box fits inside its 45px row. None is left.
const MAX_WRITTEN_SMALL_TARGETS = 0;

// Sizes by size-N (SMALL_SIZE above), counted on their own, as the written
// heights were, so the two ceilings above keep their histories and still
// only fall. The count learned to read them on 2026-11-11 (1.9), when it saw
// 14. Seven were cards and rows already 60px and more whose icon tile was
// read as their height (apologetics and topics cards, the lessons list, the
// shop's new request, the path's plates, the Theology hub's two rows): each
// states the min-h-11 it has. Four were small and are 44 to the touch with
// their look kept (.hit-44): Community's close on a linked post (38px),
// Theology's passage deck's two arrows (38px, which a tablet's browser shows
// at md; 6px apart now so the touch boxes do not overlap) and the topic
// reader's step link (25px); and Now Playing's sound bar, 42.5px tall from
// its disc, too. The scroll rail's arrows are drawn only for a fine pointer,
// a mouse's (mouseOnly above). The last, the admin planner's 16px
// checkbox (components/admin/planner/PlanBoard.tsx), is 44 to a finger and
// keeps its 16px box for a mouse (pointer-fine), the box drawn inside it, 1
// -> 0 the same night. None is left. IT MAY ONLY FALL.
const MAX_SIZED_SMALL_TARGETS = 0;

// Heights made of padding and a line of words (paddedHeight above), counted
// on their own as the others were. The count learned to read them on
// 2026-11-11 (1.9, the arbiter's word with fresh eyes M5: "teach the count
// what let them slip"), when it saw 90. IT MAY ONLY FALL.
// 90 -> 76 the same night (Updates): the reader's four preference pills,
// Today's English switch, Search's tabs, and two pills no page shows now
// (BookGrid, MobilePill) are 44 to the touch with their look kept (.hit-44);
// the book switcher's rows, the Bible sidebar's chapter cells and the study
// rail's Continue reading, which sit flush with their neighbours, are 44
// tall (min-h-11); and the Bible chapter sheet's three doors, an icon over
// their words and 52px drawn, state the min-h-11 they have. Left, by whose
// files they are: the admin panel's 25; profile and account, 24; Community,
// 5; the shop, 4, and the EIKON box, 4; the website's footer, 4, its nav, 3,
// and Discover's two door pills, which a phone does not show; and one each
// in the install prompt, the language switcher, the unsubscribe page, and
// two shared controls (ShareButton, SearchSelect).
// 76 -> 43 the same night (Admin): the admin panel's 25 are 44 to a finger
// and compact to a mouse (min-h-11 pointer-fine:min-h-0, the panel's rule
// since 2026-11-10); the EIKON box's four and the shop's three are 44
// (min-h-11), and the seller form's Remove, which stands on the line of the
// fields beside it, keeps its look and is 44 to the touch (.hit-44).
// 43 -> 5 the same night (Updates), each looked at first: profile's 14 and
// account's 10, the website's footer (44 by 44 on a phone already, short
// from md up) and its language switcher, Discover's two door pills and its
// menu's rows, the install prompt, the unsubscribe page and the search
// select are 44 tall (min-h-11) where the layout had room; the nav's Shop
// pill (both navs), profile's See all and its segmented choices, and the
// shared Share pill keep their look and are 44 to the touch (.hit-44). Left:
// Community's 5 (Fable Themes).
// 5 -> 0 the next morning (Fable Themes): Community's five. A muted reply's
// folded row in a thread (35px) is 44 tall; the moderators' page's Try again
// and its way back, and a profile's Try again (38px each), are 44 tall
// (min-h-11); the moderators' two tabs, 32px inside their own pill, keep
// their look and are 44 to the touch (.hit-44). None is left. IT MAY ONLY
// FALL, and from here that means it stays at none.
const MAX_PADDED_SMALL_TARGETS = 0;

// Links and buttons standing in a list with nothing but a line of words to
// make them tall (inListItem, wordsOnly and listedHeight above), counted on
// their own from 2026-11-11 (1.9, the arbiter's word: "teach the touch count
// to read text links in lists too, so it cannot slip again"), when it saw
// 11. IT MAY ONLY FALL. The same day it learned to read a class string
// imported from another module of the app (Graphite's PILL), a height the
// house's stylesheets give a class, and markup built beforehand inside a
// control, and no other reading moved.
// 11 -> 3 the same day (Updates): the website footer's column links (21px,
// 12px apart, from md up; a phone's footer was already its accordion's 44),
// the council map's place names, an event's Scripture, its councils and
// saints and its relations, and the collections seen through on You and on
// profile are 44 to a finger and their old size to a mouse (inline-flex
// min-h-11 ... pointer-fine:min-h-0, the admin panel's rule). Left: the
// admin panel's 2 (the page list's names in AdminShell, the import panel's
// link) and the chant page's sources (ChantAbout).
// 3 -> 1 the same morning (Admin): the page list's names and the import
// panel's link are 44 to a finger and compact to a mouse, by the panel's
// rule. Left: the chant page's sources (ChantAbout).
// 1 -> 0 the same day (Updates 2, on the arbiter's word): the chant page's
// sources are 44 to a finger and their line's own height to a mouse.
const MAX_LISTED_SMALL_TARGETS = 0;

describe("touch targets", () => {
  const { total, byFile, written, writtenByFile, sized, sizedByFile, padded, paddedByFile, listed, listedByFile } = countSmallTargets();

  it(`has no more than ${MAX_LISTED_SMALL_TARGETS} links and buttons in lists made of a line of words`, () => {
    expect(
      listed,
      `Links and buttons standing in a list with nothing but a line of words to make them tall rose to ${listed}, ceiling ${MAX_LISTED_SMALL_TARGETS}.\n` +
        `Give each its 44 (inline-flex min-h-11 items-center, a mouse's own with pointer-fine:min-h-0), then lower the ceiling here:\n` +
        Object.entries(listedByFile).sort((a, b) => b[1] - a[1]).map(([f, c]) => `  ${c}  ${f}`).join("\n"),
    ).toBeLessThanOrEqual(MAX_LISTED_SMALL_TARGETS);
  });

  it(`has no more than ${MAX_PADDED_SMALL_TARGETS} interactive elements made under 44px by their padding`, () => {
    expect(
      padded,
      `Interactive elements whose padding and line of words make them under 44px (px-2.5 py-1 text-caption and the like) rose to ${padded}, ceiling ${MAX_PADDED_SMALL_TARGETS}.\n` +
        Object.entries(paddedByFile).sort((a, b) => b[1] - a[1]).map(([f, c]) => `  ${c}  ${f}`).join("\n"),
    ).toBeLessThanOrEqual(MAX_PADDED_SMALL_TARGETS);
  });

  it("reads a link standing in a list as tall as its line of words, and only that", () => {
    // In a list: the tag alone under its <li>, or on the <li>'s own line; not under a paragraph.
    expect(inListItem(["<ul>", "  <li key={l.href}>", "    <Link", "      href={l.href}"], 2, 4)).toBe(true);
    expect(inListItem(['<li><Link href="/x" className="text-ui">x</Link></li>'], 0, 4)).toBe(true);
    expect(inListItem(["<p>", "  <Link href=\"/x\">"], 1, 2)).toBe(false);
    expect(inListItem(['<li key={ref} className="font-sans text-ui">', "  {href ? (", "    <Link href={href}"], 2, 4)).toBe(true);
    // Its line: the footer's text-ui 21px; with no size of its own, the body's 25.5px.
    expect(listedHeight("font-sans text-ui text-paper/75 hover:text-paper")).toBeCloseTo(21, 1);
    expect(listedHeight("hover:text-paper transition-colors")).toBeCloseTo(25.5, 1);
    // Words and an inline icon only; a cover, a block or a component of the app gives it its own height.
    expect(wordsOnly(" {l.label} <ChevronRight size={14} /> ", new Set(["ChevronRight"]))).toBe(true);
    expect(wordsOnly(" <WorkCover card={b} /> ", new Set())).toBe(false);
    expect(wordsOnly(' <span className="block font-serif">x</span> ', new Set())).toBe(false);
    expect(wordsOnly(" {inner} ", new Set(), "const inner = (\n  <div className=\"flex\">")).toBe(false);
    expect(wordsOnly(" {s.title} ", new Set(), "const inner = (\n  <div>")).toBe(true);
    // A name it cannot read is not taken for a line of words; an arbitrary value's CSS is no name.
    expect(unread("FLOR_ROW", new Map())).toBe(true);
    expect(unread("item(on)", new Map())).toBe(true);
    expect(unread('cn(PILL, "px-4")', new Map([["PILL", "min-h-11"]]))).toBe(false);
    expect(unread("hover:text-paper [transition-duration:var(--duration-fast)]", new Map())).toBe(false);
  });

  it("reads a class string imported from the app's own modules, and a height the house's stylesheets give a class", () => {
    expect(fileConstants('import { CARD, PILL } from "@/components/ui/Graphite";').get("PILL")).toContain("min-h-11");
    expect(fileConstants('import { FLOR_ROW } from "@/components/florilegium/florStyle";').get("FLOR_ROW")).toContain("min-h-[60px]");
    // .rule-med is sized by its contents (padding and no height): read as unknown, never as a line of words.
    expect(Number.isNaN(CSS_HEIGHT.get("rule-med"))).toBe(true);
  });

  it("reads a height made of padding and a line of words", () => {
    // The fasting tracker's pill as it stood before 8a5c3cf7: 29px drawn, 26.5 by its classes.
    expect(paddedHeight("rounded-pill px-2.5 py-1 text-caption font-semibold")).toBeCloseTo(26.5, 1);
    // Discover's door pills: 42.25px, under by a hair.
    expect(paddedHeight("rounded-pill px-5 py-2.5 font-sans text-ui")).toBeCloseTo(42.25, 1);
    // A leading of its own, and padding written out.
    expect(paddedHeight("py-[10px] text-detail leading-tight")).toBeCloseTo(36.25, 1);
    expect(paddedHeight("pt-2 pb-3 text-ui leading-[20px]")).toBeCloseTo(41.25, 1);
    // A breakpoint's padding is not a phone's.
    expect(paddedHeight("py-1 md:py-4 text-caption")).toBeCloseTo(26.5, 1);
    // No padding, or no size of type: nothing to read.
    expect(paddedHeight("text-caption underline")).toBeNull();
    expect(paddedHeight("px-3 py-2")).toBeNull();
  });

  it(`has no more than ${MAX_SIZED_SMALL_TARGETS} interactive elements sized under 44px by size-N`, () => {
    const worst = Object.entries(sizedByFile)
      .sort((a, b) => b[1] - a[1])
      .map(([f, n]) => `  ${n}  ${f}`)
      .join("\n");
    expect(
      sized,
      `Interactive elements sized under 44px (size-9 and the like) rose to ${sized}, ceiling ${MAX_SIZED_SMALL_TARGETS}.\n` +
        `Give the control real padding or .hit-44, or state the height a tall card has (min-h-11), then lower the ceiling here:\n${worst}`,
    ).toBeLessThanOrEqual(MAX_SIZED_SMALL_TARGETS);
  });

  it("reads a size by size-N, and a control drawn only for a mouse as a mouse's", () => {
    expect(SMALL_SIZE.test("inline-flex size-9 items-center")).toBe(true);
    expect(SMALL_SIZE.test("size-11 rounded-full")).toBe(false);
    expect(SMALL_SIZE.test("text-size-9")).toBe(false);
    expect(SMALL_SIZE.test('<Book size={19} />')).toBe(false);
    expect(mouseOnly("hidden size-9 items-center [@media(pointer:fine)]:inline-flex")).toBe(true);
    expect(mouseOnly("hidden md:pointer-fine:flex items-center")).toBe(true);
    expect(mouseOnly("hidden size-9 md:grid")).toBe(false);
    expect(mouseOnly("md:hidden pointer-fine:flex")).toBe(false);
    expect(fingerClasses("size-11 [@media(pointer:fine)]:size-7")).toBe("size-11");
    // The four small ones, 44 to the touch.
    const has = (file: string, text: string) => expect(readFileSync(join(ROOT, file), "utf8"), file).toContain(text);
    has("components/community/CommunityClient.tsx", 'className="hit-44 absolute -right-2 top-1 inline-flex size-9 items-center');
    // A study's step link is 44 tall in its own box now (the gate's first run measured its 26; lib/theology/__tests__/studyGate.test.ts).
    has("components/theology/TopicReader.tsx", 'className="tap-press inline-flex min-h-11 max-w-full items-center gap-[9px]');
    has("components/prayers/NowPlayingBar.tsx", 'className="tap-press hit-44 flex min-w-0 flex-1 items-center gap-3 text-start"');
    const deck = readFileSync(join(ROOT, "components/theology/PassageDeck.tsx"), "utf8");
    expect((deck.match(/className="tap-press hit-44 (?:ms-2|ms-0\.5) hidden size-9 /g) ?? []).length).toBe(2);
  });

  it(`has no more than ${MAX_WRITTEN_SMALL_TARGETS} interactive elements with a written-out height under 44px`, () => {
    const worst = Object.entries(writtenByFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([f, n]) => `  ${n}  ${f}`)
      .join("\n");
    expect(
      written,
      `Interactive elements with a written-out height under 44px (min-h-[42px] and the like) rose to ${written}, ceiling ${MAX_WRITTEN_SMALL_TARGETS}.\n` +
        `Write 44 (min-h-[44px], or min-h-11) or give the control .hit-44, then lower the ceiling. Worst offenders:\n${worst}`,
    ).toBeLessThanOrEqual(MAX_WRITTEN_SMALL_TARGETS);
  });

  it("keeps the reader settings' chips 44 to the touch on a computer too", () => {
    // The text size, font and spacing chips draw at 36 to 38px where the
    // pointer is fine (a touch laptop or a tablet's browser at desktop width
    // meets them with a finger). The count above cannot see them: the size
    // chips' min-h-9 sits past its eight-line window. So they are named here
    // (the arbiter's word, 2026-11-10): each carries .hit-44 there.
    //
    // The palettes were chips too, taking their height from padding, until
    // build 93 note 4 made them a shelf of small pages
    // (components/reader/ReadingModeChips.tsx). A page is 50px wide and 90px
    // tall at the least (lib/reader/__tests__/readerShelf.test.ts holds the
    // sizes), and the one link beside them is a finger tall.
    const menu = readFileSync(join(ROOT, "components/bible/ReaderSettingsMenu.tsx"), "utf8");
    const chips = readFileSync(join(ROOT, "components/reader/ReadingModeChips.tsx"), "utf8");
    expect(menu).toContain('touch ? "min-h-11 text-detail" : "hit-44 min-h-9 text-caption"');
    expect(chips).toContain("<ModeTile");
    expect(chips).toMatch(/data-all-modes=""\s*className="[^"]*\bmin-h-11\b/);
    // And no control of its own is written there under a finger's height.
    expect(chips).not.toMatch(/\b(?:min-h|h)-(?:[1-9]|10|\[(?:[1-3]?\d|4[0-3])px\])(?![\w.-])/);
  });

  it("reads a control by its own classes, and a child's height only where the control states none", () => {
    const none = new Map<string, string>();
    // Its own classes, not a child's.
    expect(ownClasses('<button type="button" className="min-h-11 px-2"><span className="h-3 w-3" />', none)).toBe("min-h-11 px-2");
    expect(ownClasses('<button className={cn("h-9 w-9", on && "x")}>', none)).toContain("h-9 w-9");
    // A child's class before any of its own: none here.
    expect(ownClasses('<button type="button"><span className="h-6" />', none)).toBeNull();
    // A same-file constant is read through (MobileWorkPill's arrows).
    expect(ownClasses("<button className={cn(arrow, next ? \"a\" : \"b\")}>", new Map([["arrow", "h-11 w-11"]]))).toContain("h-11 w-11");
    // 44 and over, stated: a child's height is then the child's.
    for (const tall of ["min-h-11", "h-12", "size-11", "h-[50px]", "min-h-[104px]", "h-full"]) expect(statesTall(tall), tall).toBe(true);
    for (const small of ["h-9", "min-h-9", "h-[40px]", "size-10", "px-4"]) expect(statesTall(small), small).toBe(false);
  });

  it("reads a finger's height, and sets a mouse's aside", () => {
    // A finger's 44 and a mouse's 28: 44 here.
    const circle = fingerClasses("h-11 w-11 pointer-fine:h-7 pointer-fine:w-7 rounded-full");
    expect(SMALL_H.test(circle)).toBe(false);
    expect(statesTall(circle)).toBe(true);
    // Small for a finger whatever a mouse gets: counted.
    expect(SMALL_H.test(fingerClasses("h-9 md:pointer-fine:h-11"))).toBe(true);
    expect(writtenSmall(fingerClasses("min-h-[40px] pointer-fine:min-h-[44px]"))).toBe(true);
    // A mouse's height, small or tall, is never a finger's.
    expect(statesTall(fingerClasses("pointer-fine:h-12"))).toBe(false);
    expect(fingerClasses('"min-h-11 w-full pointer-fine:min-h-0 pointer-fine:py-1"')).toBe('"min-h-11 w-full');
    // The reader's desktop circles: shown only to a fine pointer, each a finger's 44 and a mouse's 28.
    for (const file of ["components/bible/VerseRow.tsx", "components/saints/ParagraphRow.tsx"]) {
      const src = readFileSync(join(ROOT, file), "utf8");
      expect(src, file).toContain('"hidden md:pointer-fine:flex native-md-hidden items-center gap-1 shrink-0');
      expect(src, file).not.toMatch(/md:h-7|h-9 w-9 md:/);
      expect((src.match(/h-11 w-11 pointer-fine:h-7 pointer-fine:w-7 rounded-full/g) ?? []).length, file).toBe(file.includes("VerseRow") ? 7 : 4);
    }
  });

  it("reads a height written out as well as the scale's", () => {
    expect(writtenSmall('className="min-h-[42px] px-3"')).toBe(true);
    expect(writtenSmall('className="h-[2.5rem]"')).toBe(true);
    expect(writtenSmall('className="min-h-[44px]"')).toBe(false);
    expect(writtenSmall('className="max-h-[30px]"')).toBe(false);
    // The three found on 2026-11-10 are 44 now.
    const composer = readFileSync(join(ROOT, "components/community/CommunityClient.tsx"), "utf8");
    expect((composer.match(/min-h-\[44px\]/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(composer).not.toContain("min-h-[42px]");
    expect(readFileSync(join(ROOT, "components/search/SearchRows.tsx"), "utf8")).toContain('className="search-row flex min-h-[44px] ');
  });

  it(`has no more than ${MAX_SMALL_TARGETS} interactive elements under 44px`, () => {
    const worst = Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([f, n]) => `  ${n}  ${f}`)
      .join("\n");
    expect(
      total,
      `Sub-44px interactive elements rose to ${total}, ceiling ${MAX_SMALL_TARGETS}.\n` +
        `WCAG 2.5.5 wants 44x44. Give the control real padding where the layout\n` +
        `has room, or app/globals.css .hit-44 where it does not, then lower the\n` +
        `ceiling in this file. Worst offenders:\n${worst}`,
    ).toBeLessThanOrEqual(MAX_SMALL_TARGETS);
  });

  it("the Bible's commentary markers and the chapter pill's arrows are 44px to the touch", () => {
    const verse = readFileSync(join(ROOT, "components/bible/VerseRow.tsx"), "utf8");
    // Beside the marker, never over a word: before a verse, and after a drop-capped first verse.
    expect(verse).toContain('const TAP_TARGET = "touch-manipulation hit-44 hit-44-lead";');
    expect(verse).toContain('const TAP_TARGET_AFTER = "touch-manipulation hit-44 hit-44-trail";');
    expect((verse.match(/^\s*TAP_TARGET,$/gm) ?? []).length).toBe(1);
    expect((verse.match(/^\s*TAP_TARGET_AFTER,$/gm) ?? []).length).toBe(1);
    // The squares' gap is the markers' own (0.375rem, spacing 1.5), and it is logical.
    expect(verse).toContain('<span className="inline-flex items-baseline me-1.5 align-super">');
    expect(verse).toContain('<span className="inline-flex items-baseline ms-1.5 align-super">');
    const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
    expect(css).toMatch(/\.hit-44\.hit-44-lead::after \{\s*inset-inline-end: -0\.375rem;\s*\}/);
    expect(css).toMatch(/\.hit-44\.hit-44-trail::after \{\s*inset-inline-start: -0\.375rem;\s*\}/);
    const pill = readFileSync(join(ROOT, "components/bible/MobileChapterPill.tsx"), "utf8");
    const link = pill.slice(pill.indexOf("<Link"), pill.indexOf(">", pill.indexOf("className=", pill.indexOf("<Link"))));
    expect(link).toMatch(/className="hit-44 h-10 w-10 /);
  });

  it("the small text links the same checkMock run found are 44px to the touch", () => {
    // John 1's links to the neighbouring books (41 by 19) and Today's "See all" (51 by 19).
    const pager = readFileSync(join(ROOT, "components/bible/ChapterPager.tsx"), "utf8");
    expect((pager.match(/className="hit-44 hover:text-paper transition-colors"/g) ?? []).length).toBe(2);
    const pray = readFileSync(join(ROOT, "components/today/PrayNowCard.tsx"), "utf8");
    expect(pray).toContain('className="hit-44 tap-press inline-flex items-center gap-0.5');
  });

  it("Theology's councils heading, a 22px line of words, is 44px to the touch", () => {
    const lib = readFileSync(join(ROOT, "components/theology/TheologyLibrary.tsx"), "utf8");
    expect(lib).toContain('<Link href="/councils" className="hit-44 tap-press flex items-baseline justify-between gap-3">');
  });

  it("the .hit-44 utility the fixes rely on is still defined", () => {
    const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
    expect(css).toMatch(/\.hit-44::after\s*\{/);
    expect(css).toMatch(/min-height:\s*44px/);
  });
});
