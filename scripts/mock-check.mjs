// A mockup is held to the same guardrails as the app (2026-11-07, build 88
// note 3, docs/1.9-build/notes/build-88.md).
//
// The first drawings of the verse note were made by hand over the native
// export and broke eight rules this repository already keeps: a × typed as
// the close button, a target 34px across, grey at 4.1:1, colours typed in
// that ignore Light, a side stripe, a reading of the verse as the sample
// words, the journal promised to every reader, a sheet drawn by hand. Nothing
// caught them: the guards in lib/ui/__tests__ read app/ and components/, and
// a drawing touches neither. So a mockup is drawn from the app's own
// components, and goes through this before it is sent (CLAUDE.md, "Mockups").
//
// What it measures, in the part of the page a selector names:
//   contrast     every word against the ground it sits on, on all five
//                palettes (WCAG AA: 4.5:1, or 3:1 for large text). The ground
//                is the words' parents' colours laid one over another. Where
//                a gradient is among them (a raised tray, a card's sheen, a
//                fade) it is painted as the browser paints it and read where
//                the words are, at its least kind pixel (1.9; until then
//                such words were "not measured, look": with those on
//                pictures, 1,119 lines on 44 of the export's 127 screens,
//                334 on 11 since). Words on a picture, or with a picture or
//                another piece drawn across them, are not measured, and are
//                said: a picture's own measure is by its pixels
//                (scripts/words-on-pictures.mjs). With { pixels: true }
//                (the gate's walks), each such word is measured that way,
//                on each palette, as part of the check: a shortfall is a
//                contrast fail ("x:1 at its least on the pixels under it"),
//                and only a word with no pixels to read (past the screen's
//                edge, not drawn) is still said, for a still and an eye. The
//                result's looks list each with its ratio on each palette. That holds for words on
//                plain colours too, of pictures: a tile's words over its
//                picture were summed on the tile's colours until 1.9, and
//                are said now, with the picture's name
//   placeholder  a field's placeholder, the same
//   target       every control at least 44 by 44 (touchTargets.test.ts);
//                links inside a sentence and hit-44 controls excepted
//   glyph        no control whose label is a character standing in for an
//                icon (docs/design/icon-system.md)
//   palette      every colour follows the palette: one that is the same on
//                Dark and on Light was typed in (lightSurfaces.test.ts)
//   gold         no gold, as lib/ui/goldTone.ts measures it (noGold.test.ts)
//   stripe       no side stripe: a border on one side only, or a thin bar
//                down a box's edge (1.7, notes 21 and 24)
//   mirror       everything mirrors in Arabic; what stays put was placed
//                with left or right, not start or end
//   emdash       no em dash in a word, a label or a placeholder; words the
//                app did not write (a Father's, a council's, as their
//                edition prints them) say so on themselves, as below
//   rays         no burst of separate light rays (a repeating conic gradient,
//                on a thing or its ::before or ::after): vibe-coded AI slop,
//                the owner's word of 2026-11-08; light is a soft pool
//   sparkle      no four-point sparkle star: the characters U+2726, U+2727
//                and U+2728 in the words, a label or a ::before or ::after,
//                or a star of four points drawn (the old Sparkle icon, or
//                one like it): AI slop, the owner's word of 2026-11-11
//                (CLAUDE.md, "No sparkle star"); an icon from
//                components/ui/icons that names what the place is
//   picture      no empty picture: an image with no source or one that did
//                not load, or a round frame the size of a portrait with a
//                face and nothing in it (build 93 note 1, St Alexander's
//                empty circle); a loading shimmer is not one
//   dashed       no dashed placeholder box: a dashed or dotted edge on three
//                sides or more, or round it as an outline (build 93 note 4)
//   keys         no keyboard hint on a phone: Esc, Ctrl, Cmd, a chord with
//                Alt or Shift, the Mac's key signs, or a key drawn as <kbd>,
//                shown where the pointer is a finger (build 93 note 7's list)
//   cut          no control's name cut short: the first words a control holds
//                ended by an ellipsis, cut at a line, or clipped by the box
//                they stand in, up to the control itself (the journal's walk
//                with no Plus, 2026-11-11: More's tiles read "H..."); a
//                preview's later words are not its name, and readers' own
//                words, rightly cut in a list, say so on themselves
// What no measure can see is printed after it, to be answered by eye.
//
// A piece meant to break one of these says so on itself, with its reason,
// and the report lists every such allowance:
//   data-mock-allow="stripe" data-mock-why="the reading progress bar"
//   data-mock-allow="emdash" data-mock-why="a Father's own words, as his edition prints them"
//
// Use, from a mockup's own script (it leaves the page as it found it):
//   import { checkMock, printMockCheck } from "./mock-check.mjs";
//   const ok = printMockCheck(await checkMock(page, "[data-journal-composer]"), "the note sheet");
// On a page of the native export (npm run build:android first), as it loads:
//   node scripts/mock-check.mjs /journal/ main
// The same, held on the fourteen looks as well as the five palettes (1.9):
//   node scripts/mock-check.mjs /journal/ main --looks
// Its own proof, the first drawings' mistakes caught and a house piece passed:
//   node scripts/mock-check.mjs --self-test
// And the proof of the grounds it paints, each set beside the screen's own
// pixels under the same words:
//   node scripts/painted-ground-check.mjs

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { READING_THEMES, themeAttributes } from "../lib/reader/readingModes.ts";
import { isGoldTone, oklchOf } from "../lib/ui/goldTone.ts";

/** The five palettes, as AppThemeController wears them on <html>. */
export const PALETTES = [
  ["Dark", null],
  ["Light", "parchment"],
  ["Black", "black"],
  ["Candlelight", "candlelight"],
  ["Monastery", "monastery"],
];

/**
 * The looks (1.9): the fourteen Plus themes of the registry, each worn as
 * data-look over Dark or over Light (lib/reader/readingModes.ts,
 * themeAttributes). A third value names the look. They are not in PALETTES:
 * a mockup is held on the five, as CLAUDE.md says, and a screen is held on
 * the looks as well where the looks are what is being checked:
 *   checkMock(page, selector, { palettes: [...PALETTES, ...LOOKS] })
 * or, from the command line, --looks.
 */
export const LOOKS = READING_THEMES.filter((theme) => theme.look).map((theme) => {
  const { mode, look } = themeAttributes(theme.id);
  return [theme.label, mode, look];
});

/**
 * The two palettes earned by reading (1.9, lib/reader/earned.ts): Councils and
 * Cappadocian, the registry's collection palettes, each its own
 * data-reading-mode. A reader who has earned one reads every screen in it, so
 * checkMock wears them by default beside the five (WORN), and the looks'
 * callers add them (EVERY). Until 2026-11-13 no list held them, and no gate
 * run measured them: on Prayers' chants door they were the worst of all
 * (4.26 to 4.32:1, found by reading, Updates 9).
 */
export const EARNED = READING_THEMES.filter((theme) => theme.collection).map((theme) => {
  const { mode } = themeAttributes(theme.id);
  return [theme.label, mode];
});

/** What checkMock wears when it is not told: the five palettes and the two earned by reading. */
export const WORN = [...PALETTES, ...EARNED];

/** Every palette a reader can wear: the five, the two earned by reading, and the looks. */
export const EVERY = [...WORN, ...LOOKS];

/**
 * The registry's palettes that a list leaves out (none, or the self-test fails):
 * every theme must be worn by EVERY, and every theme that is not a look by WORN.
 */
export function paletteGaps(lists = { worn: WORN, every: EVERY }) {
  const wears = (list, id) => {
    const { mode, look } = themeAttributes(id);
    return list.some(([, m, l]) => (m ?? null) === mode && (l ?? null) === look);
  };
  return READING_THEMES.flatMap((theme) => [
    ...(wears(lists.every, theme.id) ? [] : [`${theme.label} is in no list (EVERY)`]),
    ...(theme.look || wears(lists.worn, theme.id) ? [] : [`${theme.label} is not worn by default (WORN)`]),
  ]);
}

/** Put a palette on the page, as the app does: its mode, and its look or none. */
const wear = (page, mode, look) =>
  page.evaluate(
    ([m, l]) => {
      const h = document.documentElement;
      if (m) h.setAttribute("data-reading-mode", m);
      else h.removeAttribute("data-reading-mode");
      if (l) h.setAttribute("data-look", l);
      else h.removeAttribute("data-look");
    },
    [mode ?? null, look ?? null],
  );

export const CHECKS = ["contrast", "placeholder", "target", "glyph", "palette", "gold", "stripe", "mirror", "emdash", "rays", "sparkle", "picture", "dashed", "keys", "cut"];

/** Why the Church's red, and white words on it, stay the same on every palette (the arbiter, 2026-11-11). */
const CRIMSON = "the Church's red (--color-crimson), one red on every palette by design, and white words on it (5.8:1): not a colour typed in";

/** What a measure cannot see. */
export const BY_EYE = [
  "Built from the app's own component for the job, rendered from the export; only the proposed change is new.",
  "Icons from components/ui/icons. Plus shown with its mark, and never promised to every reader.",
  "Sample words plain: no reading of Scripture or of a Father written for the picture.",
  "Existing words (i18n keys) first; a new line in the house voice (docs/brand/voice.md).",
];

// ── In the page ─────────────────────────────────────────────────────────

/** What the part of the page named by `selector` shows, on the palette it wears now. */
async function look(arg) {
  // A selector, or { selector, only: "stripe" } for the stripe measure alone.
  // `tag`: mark each word whose ground it cannot read (data-mock-look), for the pixels pass.
  const { selector, only, tag = false } = typeof arg === "string" ? { selector: arg, only: null } : arg;
  const root = document.querySelector(selector);
  if (!root) return null;
  // Any colour syntax (Tailwind's color-mix computes to oklab), read back as sRGB.
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (c) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = "rgba(0, 0, 0, 0)";
    cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], Math.round((d[3] / 255) * 1000) / 1000];
  };
  const allowance = (el, check) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const list = n.getAttribute("data-mock-allow");
      if (list && list.split(/[\s,]+/).includes(check)) return n.getAttribute("data-mock-why") || "(no reason given)";
      if (check === "palette" && n.classList.contains("dark-island")) return "a dark island, dark on every palette (app/globals.css)";
      if (check === "gold" && n.matches('[data-hl-color="yellow"]')) return "the yellow highlighter, his own exception (noGold.test.ts, lib/bible/highlightPalette.ts)";
    }
    return null;
  };
  // The words an element holds. innerText is empty for what the browser has
  // not drawn yet (a card under content-visibility: auto, off the screen), so
  // a name or a letter there is read from textContent instead (Fable Themes'
  // find on /community/, 2026-11-11: authors' names read as nameless buttons,
  // a reader's disc with its letter as an empty frame).
  const textOf = (el) => (el.innerText || "").trim() || (el.textContent || "").trim();
  const nameOf = (el) => {
    const words = (el.getAttribute("aria-label") || textOf(el) || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim();
    return `${el.tagName.toLowerCase()}${words ? ` "${words.slice(0, 32)}"` : ""}`;
  };
  const opacityOf = (el) => {
    let o = 1;
    for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  // A face drawn behind a thing's words: a ::before or ::after that covers it
  // and sits behind its content, as Settings lights its chosen choice
  // (.set-track). Opaque, it is the ground (a gradient: each of its stops);
  // a face that lets the ground through is not trusted, and the walk goes on.
  // Without it the chosen "New" read as its dark words on the dark track,
  // about 1:1 on every palette (build 89's guardrail list, 2026-11-10).
  const STOP = /(?:rgba?|hsla?|color|oklab|oklch|lab|lch)\([^()]*(?:\([^()]*\)[^()]*)*\)|#[0-9a-f]{3,8}\b/gi;
  const faceOf = (n) => {
    for (const pseudo of ["::before", "::after"]) {
      const p = getComputedStyle(n, pseudo);
      if (!p.content || p.content === "none" || p.position !== "absolute") continue;
      if (Number(p.opacity) < 0.999 || p.visibility === "hidden" || !(parseInt(p.zIndex, 10) < 0)) continue;
      if (!["top", "right", "bottom", "left"].every((side) => parseFloat(p[side]) <= 0.5)) continue;
      const image = p.backgroundImage && p.backgroundImage !== "none" ? p.backgroundImage : null;
      if (image && !/^(?:linear|radial)-gradient\(/.test(image)) return { unknown: `${n.tagName.toLowerCase()} has a picture behind its words` };
      const stops = image ? [...image.matchAll(STOP)].map((m) => rgba(m[0])) : [rgba(p.backgroundColor)];
      if (!stops.length || stops.some((s) => s[3] < 0.999)) continue;
      return { rgbs: stops.map((s) => s.slice(0, 3)) };
    }
    return null;
  };
  // A list as CSS writes one, split at its commas (a comma inside a function
  // or a quoted address is not one): a background's layers, and their sizes.
  const commas = (value) => {
    const out = [];
    let depth = 0;
    let quote = "";
    let from = 0;
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
      if (quote) {
        if (ch === "\\") i++;
        else if (ch === quote) quote = "";
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) {
        out.push(value.slice(from, i).trim());
        from = i + 1;
      }
    }
    out.push(value.slice(from).trim());
    return out;
  };
  const GRADIENT = /^(?:repeating-)?(?:linear|radial|conic)-gradient\(/;
  // A gradient that hides what is under it: every stop opaque, and laid over
  // the whole box.
  const covers = (cs, images) => {
    const sizes = commas(cs.backgroundSize);
    const repeats = commas(cs.backgroundRepeat);
    return images.some((layer, i) => {
      if (!GRADIENT.test(layer)) return false;
      const stops = [...layer.matchAll(STOP)].map((m) => rgba(m[0]));
      if (!stops.length || stops.some((s) => s[3] < 0.999)) return false;
      return /^(?:auto|auto auto|cover|100% 100%)$/.test(sizes[i % sizes.length] ?? "auto") || /^(?:repeat|round)$/.test(repeats[i % repeats.length] ?? "repeat");
    });
  };
  // The ground a thing sits on: a face drawn behind its words, or its own
  // and its parents' backgrounds, laid one over another down to the first
  // that is opaque. Plain colours are summed here. With a gradient among
  // them (a raised tray, a card's sheen, a fade) no one colour is the
  // ground, so the stack is painted and read where the words are
  // (paintedGround, below). A picture has no colour to read: not measured,
  // and said.
  const groundOf = (el, at) => {
    const layers = [];
    const painted = [];
    let gradient = false;
    let base = null;
    for (let n = el; n; n = n.parentElement) {
      if (!painted.length) {
        const face = faceOf(n);
        if (face) return face;
      }
      const cs = getComputedStyle(n);
      const tag = n.tagName.toLowerCase();
      const images = cs.backgroundImage && cs.backgroundImage !== "none" ? commas(cs.backgroundImage) : [];
      const drawn = images.filter((layer) => layer !== "none");
      if (drawn.some((layer) => !GRADIENT.test(layer))) return { unknown: `${tag} has a picture` };
      if (drawn.length) {
        if (/text/.test(cs.backgroundClip)) return { unknown: `${tag}'s letters are filled with a gradient` };
        if (/fixed/.test(cs.backgroundAttachment)) return { unknown: `${tag} has a gradient fixed to the screen` };
        gradient = true;
      }
      const c = rgba(cs.backgroundColor);
      if (drawn.length || c[3] > 0) painted.push(n);
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 0.999 || (drawn.length && covers(cs, images))) {
        base = n;
        break;
      }
    }
    if (gradient) return { paint: { el, at, nodes: painted, base } };
    let g = [255, 255, 255];
    for (const c of layers.reverse()) g = g.map((v, i) => c[i] * c[3] + v * (1 - c[3]));
    // The sum stands unless a picture is drawn across the words (picturedOf, below).
    return { rgb: g, job: { el, at, base } };
  };
  // What holds a thing in place, and with that cuts what spills out of it
  // and carries it as it scrolls: its parent, unless the thing is placed out
  // of the flow (a pinned sheet, a badge set on a corner). Such a thing is
  // held by the box it is placed by alone, and the parents between neither
  // cut it nor carry it (CSS Positioned Layout, the containing block).
  const none = (v) => !v || v === "none";
  const pinsHere = (cs) =>
    ![cs.transform, cs.translate, cs.rotate, cs.scale, cs.perspective, cs.filter, cs.backdropFilter].every(none) ||
    /layout|paint|strict|content/.test(cs.contain || "") ||
    Boolean(cs.containerType && cs.containerType !== "normal") ||
    /transform|perspective|filter|translate|rotate|scale/.test(cs.willChange || "") ||
    Boolean(cs.contentVisibility && cs.contentVisibility !== "visible");
  const holds = (cs, pos) => (pos === "fixed" ? pinsHere(cs) : pos === "absolute" ? cs.position !== "static" || pinsHere(cs) : true);
  // How far a row can carry what is in it, each way, from where it is
  // scrolled now: [back, on], the first never above nought and the second
  // never below. A box that hides without scrolling (overflow: clip)
  // carries nothing.
  const carry = (p, cs, sideways) => {
    if ((sideways ? cs.overflowX : cs.overflowY) === "clip") return [0, 0];
    const [at, most] = sideways ? [p.scrollLeft, Math.max(0, p.scrollWidth - p.clientWidth)] : [p.scrollTop, Math.max(0, p.scrollHeight - p.clientHeight)];
    // A row read from the right counts its scroll down from nought.
    const [least, greatest] = sideways && cs.direction === "rtl" ? [-most, 0] : [0, most];
    return [Math.min(0, at - greatest), Math.max(0, at - least)];
  };
  // What is seen of a line of words: its box, cut to every box that hides
  // what spills out of it (a clamped paragraph still reports the lines it
  // hides, and those lie over whatever is below it).
  //
  // Words scrolled right out of their row (the later doors of a row that
  // scrolls sideways, the foot of a list that scrolls in a box of its own)
  // are read at the middle of the row, where a reader brings them to read
  // them, and whatever the row carries is taken there with them (`shifts`:
  // for what `under` carries, by how much). Nothing on the page is moved:
  // a row that is really scrolled wakes the pictures it brings into sight,
  // and a page that changes as it is measured is measured differently each
  // time. The middle, and not where the row would first show them: a rail
  // fades at its edges, and what stands under that fade is on its way in,
  // not yet being read.
  //
  // Until 2026-11-11 such words were read where their numbers put them,
  // past the row's edge. That is right only when their ground scrolls with
  // them (a cover in a rail). The Search sheet's later doors stand on the
  // sheet behind the row: they were read past the sheet itself, on the
  // painting's bare paper, 1.00:1 on Dark (the gate's third run, Admin's
  // find).
  //
  // Left where their numbers put them, as before: words out of a box with
  // no room at all (a part that is closed, and opens where it is), out of a
  // box that cannot scroll to them, and out of the page itself.
  const seenOf = (el, r) => {
    let { left, right, top, bottom } = r;
    const shifts = [];
    let out = false;
    let pos = null;
    for (let p = el; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      // A parent the words are not placed by neither cuts them nor carries them.
      if (pos !== null && !holds(cs, pos)) continue;
      pos = cs.position;
      const [cutX, cutY] = [cs.overflowX !== "visible", cs.overflowY !== "visible"];
      if (!cutX && !cutY) continue;
      const box = p.getBoundingClientRect();
      const inX = !cutX || Math.min(right, box.right) - Math.max(left, box.left) >= 1;
      const inY = !cutY || Math.min(bottom, box.bottom) - Math.max(top, box.top) >= 1;
      if (inX && inY) {
        if (cutX) [left, right] = [Math.max(left, box.left), Math.min(right, box.right)];
        if (cutY) [top, bottom] = [Math.max(top, box.top), Math.min(bottom, box.bottom)];
        continue;
      }
      out = true;
      if (p === document.body || p === document.documentElement) continue;
      // How far to the middle of the box along one line; null where the box cannot scroll the words into itself.
      const toMiddle = (sideways) => {
        const [a, b, lo, hi] = sideways ? [left, right, box.left, box.right] : [top, bottom, box.top, box.bottom];
        if (hi - lo < 1) return null;
        const want = (lo + hi) / 2 - (a + b) / 2;
        const [back, on] = carry(p, cs, sideways);
        const can = Math.min(on, Math.max(back, want));
        return Math.min(b + can, hi) - Math.max(a + can, lo) >= 1 ? want : null;
      };
      const [dx, dy] = [inX ? 0 : toMiddle(true), inY ? 0 : toMiddle(false)];
      if (dx === null || dy === null) continue;
      shifts.push({ under: p, dx, dy });
      [left, right, top, bottom] = [left + dx, right + dx, top + dy, bottom + dy];
      // Not all of them fit in the row: cut to it, as words half in sight are.
      if (cutX) [left, right] = [Math.max(left, box.left), Math.min(right, box.right)];
      if (cutY) [top, bottom] = [Math.max(top, box.top), Math.min(bottom, box.bottom)];
    }
    return { left, top, right, bottom, width: right - left, height: bottom - top, out, shifts };
  };
  // Whether a row carries a thing as it scrolls: the row is one of the boxes that hold the thing in place.
  const carriedBy = (row, e) => {
    if (row === e || !row.contains(e)) return false;
    let pos = getComputedStyle(e).position;
    for (let p = e.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (holds(cs, pos)) {
        if (p === row) return true;
        pos = cs.position;
      } else if (p === row) return false;
    }
    return false;
  };
  // Where a thing stands for a line of words that is read in the middle of its row: taken there with them, when the row carries it too.
  const rectFor = (at, e, r = e.getBoundingClientRect()) => {
    let [dx, dy] = [0, 0];
    for (const sh of at.shifts ?? []) if (carriedBy(sh.under, e)) [dx, dy] = [dx + sh.dx, dy + sh.dy];
    return dx || dy ? { left: r.left + dx, top: r.top + dy, right: r.right + dx, bottom: r.bottom + dy, width: r.right - r.left, height: r.bottom - r.top } : r;
  };
  // What else is drawn across a line of words, inside the ground they stand
  // on, that is no parent of theirs: a picture laid behind them, a shade, a
  // glow. The painting below lays the words' parents one over another and can
  // not tell whether such a piece lies under the words or over them, so it
  // does not vouch for words with one across them: they are said, to be
  // looked at (a picture's own measure is scripts/words-on-pictures.mjs). A
  // picture that has not arrived yet (an <img> still clear) counts: it is
  // the ground once it comes. A blurred piece spreads past its box, and is
  // taken as wide as its blur. A bar pinned to the screen only passes over
  // what scrolls beneath it, and is no ground. A piece that only throws a
  // shadow is not across the words; its shadow is, and is painted with them.
  let pieces = null;
  const PICTURED = new Set(["img", "video", "canvas", "svg", "iframe", "object", "embed"]);
  // The part of the page that holds a thing and that the browser has not
  // drawn yet (content-visibility: a card off the screen, a closed part), or
  // null when the thing is drawn. Such a part is kept at a stand-in size, so
  // what is in it lies, by its numbers, across the parts after it: where a
  // thing in it stands can be told only against the rest of the same part.
  const undrawn = new WeakMap();
  const undrawnOf = (e) => {
    if (undrawn.has(e)) return undrawn.get(e);
    let held = null;
    if (typeof e.checkVisibility === "function" && !e.checkVisibility({ contentVisibilityAuto: true })) {
      for (let n = e; n && !held; n = n.parentElement) {
        const cv = getComputedStyle(n).contentVisibility;
        if (cv && cv !== "visible" && n !== e) held = n;
      }
      held ??= e;
    }
    undrawn.set(e, held);
    return held;
  };
  // A name a mender can find the piece by: its tag and its own class, not a class that only places it.
  const PLACING = /^(?:absolute|relative|fixed|sticky|static|block|inline(?:-block|-flex)?|flex|grid|hidden|contents|pointer-events-none|inset-.*|(?:h|w|min-h|min-w|max-h|max-w|size)-.*|object-.*|bg-(?:cover|center|contain|no-repeat)|scale-.*|blur(?:-.*)?|opacity-.*|z-.*|-?(?:top|left|right|bottom|start|end)-.*|shrink-.*|rounded.*|overflow-.*|transition.*|duration-.*|ease-.*|motion-.*)$/;
  const classOf = (e) => (e.getAttribute("class") || "").trim().split(/\s+/).find((c) => c && !PLACING.test(c)) ?? "";
  // How far a box's shadows fall outside it, at most.
  const reachOf = (shadow) => {
    let reach = 0;
    for (const one of commas(shadow)) {
      if (/\binset\b/.test(one)) continue;
      const [x = 0, y = 0, blur = 0, spread = 0] = (one.replace(STOP, "").match(/-?[\d.]+px/g) || []).map(parseFloat);
      reach = Math.max(reach, Math.max(0, blur + spread) + Math.max(Math.abs(x), Math.abs(y)));
    }
    return reach;
  };
  const cornersOf = (cs) => ["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => `border-${c}-radius:${cs.getPropertyValue(`border-${c}-radius`)}`).join(";");
  const piecesOf = () => {
    if (pieces) return pieces;
    pieces = [];
    for (const e of document.body.querySelectorAll("*")) {
      const tag = e.tagName.toLowerCase();
      if (e.closest("svg") && tag !== "svg") continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden") continue;
      const images = cs.backgroundImage && cs.backgroundImage !== "none" ? commas(cs.backgroundImage).filter((layer) => layer !== "none") : [];
      const picture = PICTURED.has(tag) || images.some((layer) => !GRADIENT.test(layer));
      const paints = picture || images.length > 0 || rgba(cs.backgroundColor)[3] > 0.02;
      const shadow = cs.boxShadow && cs.boxShadow !== "none" ? cs.boxShadow : null;
      if (!paints && !shadow) continue;
      if (!picture && opacityOf(e) < 0.02) continue;
      const box = e.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      const blur = 2.5 * parseFloat(/blur\(([\d.]+)px\)/.exec(cs.filter)?.[1] ?? 0);
      const first = (e.getAttribute("class") || "").trim().split(/\s+/)[0];
      // Which picture, for whoever goes to look: its file's name where it has one, and its own class.
      const from = tag === "img" ? e.currentSrc || e.getAttribute("src") || "" : (/url\(["']?([^"')]+)/.exec(images.find((layer) => !GRADIENT.test(layer)) ?? "")?.[1] ?? "");
      const file = /^(?:data|blob):/.test(from) ? "" : (from.split(/[?#]/)[0].split("/").pop() ?? "").slice(0, 48);
      const own = tag === "img" ? "" : classOf(e) || (file ? "" : first);
      const who = `${tag}${own ? `.${own}` : ""}${file ? `, ${file}` : ""}`;
      pieces.push({
        e,
        box,
        r: { left: box.left - blur, top: box.top - blur, right: box.right + blur, bottom: box.bottom + blur },
        paints,
        picture,
        what: picture ? `a picture is drawn across it (${who})` : `another piece is drawn across it (${tag}${first ? `.${first}` : ""})`,
        shadow,
        reach: shadow ? reachOf(shadow) : 0,
        corners: cornersOf(cs),
      });
    }
    return pieces;
  };
  // Two pixels: a letter's box stands a pixel past a tight line, and that is not across.
  const overlaps = (r, at, by = 2) => Math.min(r.right, at.right) - Math.max(r.left, at.left) >= by && Math.min(r.bottom, at.bottom) - Math.max(r.top, at.top) >= by;
  // Where a piece is painted among its neighbours (CSS 2.1, appendix E, and
  // what has joined it since): in the flow, or placed, at a z of its own. A
  // thing is surely lifted out of the flow by what always makes a layer
  // (`lifted`), and may be by what only sometimes does (`mayLift`: a z given
  // to a thing that may not take one, a will-change, a containment). A thing
  // that only may be lifted is a doubt, and a doubt is never "underneath".
  const lifted = (cs) =>
    /fixed|sticky/.test(cs.position) ||
    (cs.position !== "static" && cs.zIndex !== "auto") ||
    Number(cs.opacity) < 1 ||
    ![cs.transform, cs.translate, cs.rotate, cs.scale, cs.filter, cs.backdropFilter, cs.perspective, cs.clipPath, cs.maskImage, cs.webkitMaskImage, cs.viewTransitionName].every(none) ||
    (cs.mixBlendMode && cs.mixBlendMode !== "normal") ||
    cs.isolation === "isolate" ||
    /layout|paint|strict|content/.test(cs.contain || "") ||
    (cs.containerType && cs.containerType !== "normal");
  const mayLift = (cs) => cs.zIndex !== "auto" || !none(cs.contain) || (cs.willChange && cs.willChange !== "auto") || (cs.contentVisibility && cs.contentVisibility !== "visible");
  const layerOf = (x, top) => {
    let z = null;
    let placed = false;
    let doubt = false;
    for (let n = x; n && n !== top; n = n.parentElement) {
      const cs = getComputedStyle(n);
      // The outermost that makes a layer of its own carries all inside it.
      if (lifted(cs)) z = cs.zIndex === "auto" ? 0 : Number(cs.zIndex);
      else if (mayLift(cs)) doubt = true;
      if (cs.position !== "static") placed = true;
    }
    return { placed: placed || z !== null, z: z ?? 0, doubt };
  };
  // A piece outside the words' ground (the first opaque parent they stand
  // on) is hidden by that ground when it is painted before it. Only what is
  // surely painted before it is left out; the rest may lie over the words.
  const under = new Map();
  const surelyUnder = (piece, base) => {
    const seen = under.get(base) ?? under.set(base, new Map()).get(base);
    if (seen.has(piece)) return seen.get(piece);
    let top = piece.parentElement;
    while (top && !top.contains(base)) top = top.parentElement;
    let sure = false;
    if (top) {
      const [a, b] = [layerOf(piece, top), layerOf(base, top)];
      const first = Boolean(piece.compareDocumentPosition(base) & Node.DOCUMENT_POSITION_FOLLOWING);
      const cs = getComputedStyle(piece);
      if (a.doubt || b.doubt) sure = false;
      else if (!a.placed && !b.placed) sure = first && !/^inline/.test(cs.display) && cs.float === "none";
      else if (!a.placed) sure = b.z >= 0;
      else if (!b.placed) sure = a.z < 0;
      else sure = a.z < b.z || (a.z === b.z && first);
    }
    seen.set(piece, sure);
    return sure;
  };
  // A piece counts for a line of words when it is no parent or child of
  // theirs, is not pinned apart from them, and is inside their ground or not
  // surely underneath it.
  const beside = (p, el, base) => {
    if (p.e === base || p.e.contains(el) || el.contains(p.e)) return false;
    // Not drawn yet, one or the other: only what is held in the same part can be told to lie across it.
    if (undrawnOf(p.e) !== undrawnOf(el)) return false;
    for (let n = p.e; n && !n.contains(el); n = n.parentElement) {
      if (/fixed|sticky/.test(getComputedStyle(n).position)) return false;
    }
    return !base || base.contains(p.e) || !surelyUnder(p.e, base);
  };
  // What is seen of a piece from where the words are: its box, cut to every
  // box apart from the words that hides what spills out of it.
  const seenFrom = (p, el, at) => {
    let { left, top, right, bottom } = rectFor(at, p.e, p.r);
    for (let n = p.e.parentElement; n && !n.contains(el); n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const q = rectFor(at, n);
      if (cs.overflowX !== "visible") [left, right] = [Math.max(left, q.left), Math.min(right, q.right)];
      if (cs.overflowY !== "visible") [top, bottom] = [Math.max(top, q.top), Math.min(bottom, q.bottom)];
    }
    return { left, top, right, bottom };
  };
  const acrossOf = ({ el, at, base }) => {
    for (const p of piecesOf()) {
      if (p.paints && overlaps(rectFor(at, p.e, p.r), at) && beside(p, el, base) && overlaps(seenFrom(p, el, at), at)) return p.what;
    }
    // A parent's own ::before or ::after laid across the words (a veil, a
    // sheen): placed from the parent's box, as CSS places it. Every parent
    // up to the ground, whether or not it paints a ground of its own.
    for (let n = el; n; n = n === base ? null : n.parentElement) {
      const b = rectFor(at, n);
      const cs = getComputedStyle(n);
      for (const pseudo of ["::before", "::after"]) {
        const p = getComputedStyle(n, pseudo);
        if (!p.content || p.content === "none" || p.content === "normal" || p.position !== "absolute" || Number(p.opacity) < 0.02) continue;
        if (!(rgba(p.backgroundColor)[3] > 0.02) && !(p.backgroundImage && p.backgroundImage !== "none")) continue;
        const left = b.left + parseFloat(cs.borderLeftWidth) + parseFloat(p.left);
        const top = b.top + parseFloat(cs.borderTopWidth) + parseFloat(p.top);
        const r = { left, top, right: left + parseFloat(p.width), bottom: top + parseFloat(p.height) };
        // Placed by something this cannot read (auto): said, not guessed.
        if (![r.left, r.top, r.right, r.bottom].every(Number.isFinite) || overlaps(r, at)) return `${n.tagName.toLowerCase()} draws a piece of its own across it (${pseudo})`;
      }
    }
    return null;
  };
  // The same question for words on plain colours, of pictures alone (1.9).
  // The sum of the parents' colours is no ground for words with a picture
  // laid behind them by something that is not their parent (a tile's words
  // over its picture, the numerals under a picture plate): it passed or
  // failed them on colours that are not what is behind them, 116 words on
  // 11 screens of the export. They are said, with the picture's name, and
  // measured by their pixels (scripts/words-on-pictures.mjs). Only a
  // picture: a plain piece across such words is left to the sum, as it was.
  const picturedOf = ({ el, at, base }) => {
    for (const p of piecesOf()) {
      if (p.picture && overlaps(rectFor(at, p.e, p.r), at) && beside(p, el, base) && overlaps(seenFrom(p, el, at), at)) return p.what;
    }
    return null;
  };
  // The ground where a gradient is part of it, painted and read. The words'
  // parents, from the first opaque one up, are laid one over another as
  // boxes with their own backgrounds, corners and shadows, each where it
  // stands about the words, and over them the shadows that pieces beside the
  // words throw across them (a picture plate's on its tray, a raised card's
  // on the card below it), in an SVG the browser paints into a canvas: the
  // gradient is the browser's own, its lines, its stops and its colour space
  // with it. What comes back is the ground under these words and nowhere
  // else (a word at the dark foot of a fade is not held to its clear head).
  // Of all its pixels three are kept: the least kind to these words, the
  // lightest and the darkest. checkMock measures against them with the one
  // sum (contrast, below); the sum here only chooses the pixel.
  //
  // Held to the screen: scripts/painted-ground-check.mjs photographs a page
  // with its letters cleared and sets every painted ground beside the
  // screen's own pixels under the same words.
  //
  // What it does not see, as the sum of plain colours never did: a parent
  // faded as a whole (its opacity), a filter or a blend laid on a parent.
  const PAINT = [512, 256];
  const linear = (v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  const paintedGround = async (job, fg, alpha) => {
    const across = acrossOf(job);
    if (across) return { unknown: across };
    const { el, nodes, base } = job;
    const isPage = (n) => n === document.body || n === document.documentElement;
    // A letter's box stands a pixel past a tight line. Where it overhangs the
    // piece the words stand on by less than two pixels, the ground is read to
    // that piece's edge: past it lies what is beside the words, not under them.
    const at = { ...job.at };
    if (!isPage(nodes[0])) {
      const on = rectFor(at, nodes[0]);
      if (on.left > at.left && on.left - at.left < 2) at.left = on.left;
      if (on.top > at.top && on.top - at.top < 2) at.top = on.top;
      if (on.right < at.right && at.right - on.right < 2) at.right = on.right;
      if (on.bottom < at.bottom && at.bottom - on.bottom < 2) at.bottom = on.bottom;
    }
    // Whole pixels, inward: a box that ends part way through a pixel is
    // painted there half clear, and that edge is no ground.
    let [left, top, right, bottom] = [Math.ceil(at.left), Math.ceil(at.top), Math.floor(at.right), Math.floor(at.bottom)];
    if (right - left < 1) [left, right] = [Math.floor(at.left), Math.floor(at.left) + 1];
    if (bottom - top < 1) [top, bottom] = [Math.floor(at.top), Math.floor(at.top) + 1];
    const [W, H] = [right - left, bottom - top];
    const [w, h] = [Math.min(PAINT[0], W), Math.min(PAINT[1], H)];
    const read = { left, top, right, bottom };
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const px = (v) => `${parseFloat(v) || 0}px`;
    const place = (b) => `position:absolute;box-sizing:border-box;margin:0;left:${b.left - left}px;top:${b.top - top}px;width:${b.width}px;height:${b.height}px`;
    // The words' parents, the farthest first: each one that paints a ground or throws a shadow.
    const chain = [];
    for (let n = el; n; n = n.parentElement) {
      if (nodes.includes(n) || (!isPage(n) && getComputedStyle(n).boxShadow !== "none")) chain.push(n);
      if (n === base) break;
    }
    let boxes = "";
    for (const n of chain.reverse()) {
      const cs = getComputedStyle(n);
      // The page's own ground is painted over the whole of it, whatever box
      // <body> has; a gradient of its own is placed by the page's box.
      const b = !isPage(n) ? rectFor(at, n) : cs.backgroundImage !== "none" ? document.documentElement.getBoundingClientRect() : { left, top, width: W, height: H };
      const sides = (name, tail = "") => ["Top", "Right", "Bottom", "Left"].map((side) => px(cs[`${name}${side}${tail}`])).join(" ");
      boxes += `<div style="${esc(
        [
          place(b),
          "border-style:solid",
          "border-color:transparent",
          `border-width:${sides("border", "Width")}`,
          `padding:${sides("padding")}`,
          `background-color:${cs.backgroundColor}`,
          `background-image:${cs.backgroundImage}`,
          `background-size:${cs.backgroundSize}`,
          `background-position:${cs.backgroundPosition}`,
          `background-repeat:${cs.backgroundRepeat}`,
          `background-origin:${cs.backgroundOrigin}`,
          `background-clip:${cs.backgroundClip}`,
          `background-blend-mode:${cs.backgroundBlendMode}`,
          // The first opaque parent is the ground itself, to its corners: what is under those is not in this painting.
          ...(isPage(n) ? [] : [...(n === base ? [] : [cornersOf(cs)]), `box-shadow:${cs.boxShadow}`]),
        ].join(";"),
      )}"></div>`;
    }
    // The shadows thrown across the words by pieces beside them, each cut to
    // the boxes that hide what spills out of them. A shadow is laid over the
    // whole ground: thrown from a later layer it lies over the words as well,
    // and dims them with their ground, which this counts as ground alone.
    for (const p of piecesOf()) {
      if (!p.shadow || !p.reach) continue;
      const pb = rectFor(at, p.e, p.box);
      if (!overlaps({ left: pb.left - p.reach, top: pb.top - p.reach, right: pb.right + p.reach, bottom: pb.bottom + p.reach }, read, 1) || !beside(p, el, base)) continue;
      const cut = { left: -1e6, top: -1e6, right: 1e6, bottom: 1e6 };
      let opacity = 1;
      for (let n = p.e; n && !isPage(n); n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (!n.contains(el)) opacity *= Number(cs.opacity);
        if (n === p.e || (cs.overflowX === "visible" && cs.overflowY === "visible")) continue;
        const q = rectFor(at, n);
        if (cs.overflowX !== "visible") [cut.left, cut.right] = [Math.max(cut.left, q.left), Math.min(cut.right, q.right)];
        if (cs.overflowY !== "visible") [cut.top, cut.bottom] = [Math.max(cut.top, q.top), Math.min(cut.bottom, q.bottom)];
      }
      if (cut.right - cut.left < 1 || cut.bottom - cut.top < 1) continue;
      const frame = { left: cut.left, top: cut.top, width: cut.right - cut.left, height: cut.bottom - cut.top };
      boxes += `<div style="${esc(`${place(frame)};overflow:hidden`)}"><div style="${esc(`position:absolute;box-sizing:border-box;left:${pb.left - cut.left}px;top:${pb.top - cut.top}px;width:${p.box.width}px;height:${p.box.height}px;${p.corners};box-shadow:${p.shadow};opacity:${opacity}`)}"></div></div>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><foreignObject x="0" y="0" width="${W}" height="${H}"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${base ? "transparent" : "#ffffff"}">${boxes}</div></foreignObject></svg>`;
    let data;
    try {
      const picture = new Image();
      picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await picture.decode();
      const paper = document.createElement("canvas");
      paper.width = w;
      paper.height = h;
      const pen = paper.getContext("2d", { willReadFrequently: true });
      pen.drawImage(picture, 0, 0, w, h);
      data = pen.getImageData(0, 0, w, h).data;
    } catch {
      return { unknown: "the gradient behind it could not be painted to be read" };
    }
    // The paper is clear under the words' ground (white only where nothing
    // they stand on is opaque: the browser's own white is the ground then),
    // so a pixel the ground does not reach comes back clear and is not read.
    // It was white until 2026-11-11, and words that stood past their ground
    // were read on that white: 1.00:1 for the lightest ink on a dark palette.
    const seen = new Map();
    let bare = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 255) {
        bare += 1;
        continue;
      }
      const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      if (!seen.has(key)) seen.set(key, [data[i], data[i + 1], data[i + 2]]);
    }
    // Nothing of the ground is under the words where they stand: said, never read as paper.
    if (!seen.size) return { unknown: base ? `it stands past the ground it would be measured on (${base.tagName.toLowerCase()}${classOf(base) ? `.${classOf(base)}` : ""})` : "the gradient behind it could not be painted to be read" };
    const light = (c) => 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]);
    let worst = null;
    let lightest = null;
    let darkest = null;
    for (const g of seen.values()) {
      const l = light(g);
      const over = light(fg.slice(0, 3).map((v, i) => v * alpha + g[i] * (1 - alpha)));
      const ratio = (Math.max(over, l) + 0.05) / (Math.min(over, l) + 0.05);
      if (!worst || ratio < worst.ratio) worst = { g, ratio };
      if (!lightest || l > lightest.l) lightest = { g, l };
      if (!darkest || l < darkest.l) darkest = { g, l };
    }
    // Where it was read, on the page, and whether a photograph of the page
    // would show it there (scripts/painted-ground-check.mjs): not when the
    // words are pinned to the screen, and not, until their row is scrolled to
    // them, when they are read at the middle of a row they are scrolled out of.
    let pinned = false;
    for (let n = el; n && !pinned; n = n.parentElement) pinned = /fixed|sticky/.test(getComputedStyle(n).position);
    // For the proof: the rows these words are read in the middle of, each as the way to it from the page's root, and how far it would carry them there.
    const way = (e) => {
      const steps = [];
      for (let n = e; n && n !== document.documentElement; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
      return steps;
    };
    const rows = (job.at.shifts ?? []).map((sh) => ({ row: way(sh.under), dx: sh.dx, dy: sh.dy }));
    return { rgbs: [worst.g, lightest.g, darkest.g], painted: true, box: [left + scrollX, top + scrollY, W, H], apart: Boolean(job.at.out) || pinned, pinned, rows, word: rows.length ? way(el) : null, bare: bare / (data.length / 4) };
  };
  const largeText = (cs) => {
    const size = parseFloat(cs.fontSize);
    return size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
  };
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1 && getComputedStyle(el).visibility !== "hidden";
  };

  // Every element but the insides of an icon.
  const all = [root, ...root.querySelectorAll("*")].filter((e) => !(e.closest("svg") && e.tagName.toLowerCase() !== "svg"));

  const stripes = [];
  for (const e of all) {
    if (!shown(e)) continue;
    const cs = getComputedStyle(e);
    const width = (s) => (cs[`border${s}Style`] === "none" ? 0 : parseFloat(cs[`border${s}Width`]));
    const [top, right, bottom, left] = ["Top", "Right", "Bottom", "Left"].map(width);
    const oneSide = (left > 0) !== (right > 0) && top === 0 && bottom === 0 && textOf(e).length > 0;
    let bar = false;
    const r = e.getBoundingClientRect();
    const parent = e.parentElement?.getBoundingClientRect();
    if (parent && r.width <= 4 && r.height >= 16 && rgba(cs.backgroundColor)[3] >= 0.25) {
      const atEdge = Math.abs(r.left - parent.left) <= 2 || Math.abs(r.right - parent.right) <= 2;
      bar = atEdge && r.height >= parent.height * 0.6;
    }
    if (oneSide || bar) {
      stripes.push({ name: nameOf(e), how: oneSide ? `a border on its ${left > 0 ? "left" : "right"} side only` : `a bar ${Math.round(r.width)}px wide down its box's edge`, allow: allowance(e, "stripe") });
    }
  }

  // The stripe measure alone, for the walk over every screen (stripesOn).
  if (only === "stripe") return { words: [], placeholders: [], controls: [], paints: [], stripes, rays: [], sparkles: [], pictures: [], dashedBoxes: [], keyHints: [], cuts: [], emDash: false, dashes: [] };

  const words = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.textContent.replace(/\s+/g, " ").trim();
    const el = t.parentElement;
    if (!text || !el || el.closest(".sr-only, svg, [hidden]")) continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || getComputedStyle(el).visibility === "hidden") continue;
    const cs = getComputedStyle(el);
    const fg = rgba(cs.color);
    // Words faded right out are not shown (a title waiting for its bar, an
    // action behind a row until it is swiped): nothing to read, nothing to measure.
    if (fg[3] * opacityOf(el) < 0.05) continue;
    words.push({
      text: text.slice(0, 48),
      fg,
      alpha: fg[3] * opacityOf(el),
      ground: groundOf(el, seenOf(el, r)),
      // Kept for the pixels pass's mark below, and dropped before the words leave the page.
      el,
      large: largeText(cs),
      // WCAG asks nothing of a control that cannot be used.
      disabled: Boolean(el.closest(":disabled, [aria-disabled='true']")),
      allow: allowance(el, "contrast"),
    });
  }

  const placeholders = [...root.querySelectorAll("input[placeholder], textarea[placeholder]")]
    .filter((f) => f.placeholder && shown(f))
    .map((f) => {
      const fg = rgba(getComputedStyle(f, "::placeholder").color);
      // A placeholder stands inside the field's edge and padding, not out to its corners.
      const cs = getComputedStyle(f);
      const b = f.getBoundingClientRect();
      const inset = (side) => parseFloat(cs[`border${side}Width`]) + parseFloat(cs[`padding${side}`]);
      const inner = { left: b.left + inset("Left"), top: b.top + inset("Top"), right: b.right - inset("Right"), bottom: b.bottom - inset("Bottom") };
      return { text: f.placeholder.slice(0, 48), fg, alpha: fg[3] * opacityOf(f), ground: groundOf(f, seenOf(f, inner.right - inner.left >= 1 && inner.bottom - inner.top >= 1 ? inner : b)), large: largeText(cs), allow: allowance(f, "placeholder") };
    });

  // Words on a gradient: their ground is painted and read, one line at a
  // time. Words on plain colours keep their sum, unless a picture is drawn
  // across them: then they are said.
  for (const w of [...words, ...placeholders]) {
    if (w.ground.paint) w.ground = await paintedGround(w.ground.paint, w.fg, w.alpha);
    else if (w.ground.job) {
      const pictured = picturedOf(w.ground.job);
      w.ground = pictured ? { unknown: pictured } : { rgb: w.ground.rgb };
    }
  }

  // The pixels pass's mark (`tag`): each word whose ground is not read from colours, now that every
  // ground is settled, the same mark on every palette (the first look gives it, the others read it).
  for (const w of words) {
    w.lookAt = null;
    if (tag && w.ground.unknown) {
      w.lookAt = w.el.getAttribute("data-mock-look");
      if (w.lookAt === null) {
        w.lookAt = String(document.querySelectorAll("[data-mock-look]").length);
        w.el.setAttribute("data-mock-look", w.lookAt);
      }
    }
    delete w.el;
  }

  const CONTROL =
    "button, a[href], [role=button], [role=link], [role=tab], [role=radio], [role=checkbox], [role=switch], [role=menuitem], [role=option], input:not([type=hidden]), select, textarea, summary";
  const controls = [root, ...root.querySelectorAll(CONTROL)]
    .filter((c) => c.matches(CONTROL) && shown(c))
    .map((c) => {
      const r = c.getBoundingClientRect();
      return {
        name: nameOf(c),
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        // A link inside a sentence is excepted (WCAG 2.5.5), and hit-44 reaches
        // out to 44 by 44 without moving the ink (app/globals.css).
        inline: c.tagName === "A" && getComputedStyle(c).display === "inline",
        hit44: c.classList.contains("hit-44"),
        // What a button or a link shows; a field shows what was typed in it.
        face: c.matches("input, select, textarea") ? "" : (c.innerText || "").replace(/\s+/g, ""),
        allowTarget: allowance(c, "target"),
        allowGlyph: allowance(c, "glyph"),
      };
    });

  // The Church's red (--color-crimson): one red on every palette by design (the strict fast,
  // a removal, an error), so the palette rule does not read it, or white words on it, as typed.
  const crimson = rgba(getComputedStyle(document.documentElement).getPropertyValue("--color-crimson").trim() || "transparent");
  const isRed = (c) => Boolean(c) && crimson[3] > 0 && c.slice(0, 3).every((v, i) => Math.abs(v - crimson[i]) <= 2);
  const paints = all.map((e) => {
    if (!shown(e)) return null;
    const cs = getComputedStyle(e);
    const p = { name: nameOf(e), allowPalette: allowance(e, "palette"), allowGold: allowance(e, "gold") };
    const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    // Letters drawn clear (a wash's backdrop, which only lays out the colour
    // behind a field's words) carry no colour to follow a palette with.
    if ((hasText || e.tagName.toLowerCase() === "svg") && rgba(cs.color)[3] >= 0.05) p.color = rgba(cs.color);
    const bg = rgba(cs.backgroundColor);
    if (bg[3] >= 0.25) p.bg = bg;
    const border = ["Top", "Right", "Bottom", "Left"]
      .filter((s) => cs[`border${s}Style`] !== "none" && parseFloat(cs[`border${s}Width`]) > 0)
      .map((s) => rgba(cs[`border${s}Color`]))
      .find((c) => c[3] >= 0.25);
    if (border) p.border = border;
    p.red = { color: isRed(p.color), bg: isRed(p.bg), border: isRed(p.border) };
    // White words on the red: the nearest ground under them that is not clear is the red.
    if (p.color && p.color.slice(0, 3).every((v) => v >= 253)) {
      for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
        const g = rgba(getComputedStyle(n).backgroundColor);
        if (g[3] < 0.25) continue;
        p.onRed = isRed(g);
        break;
      }
    }
    return p;
  });

  // A burst of separate rays: a repeating conic gradient, drawn on a thing or
  // on its ::before or ::after (where the app's own two are drawn).
  const rays = [];
  for (const e of all) {
    if (!shown(e)) continue;
    for (const pseudo of [null, "::before", "::after"]) {
      if (/repeating-conic-gradient/.test(getComputedStyle(e, pseudo).backgroundImage || "")) {
        rays.push({ name: `${nameOf(e)}${pseudo ?? ""}`, allow: allowance(e, "rays") });
      }
    }
  }

  // An em dash. What is said is what is shown (innerText) and what is read
  // out (the labels). A dash in words the app did not write, the Fathers'
  // and the councils' as their editions print them, is allowed by name on
  // the piece that holds them; a label is the app's own, and never is.
  const labels = [root, ...root.querySelectorAll("[aria-label], [placeholder], [title], [alt]")].flatMap((e) => ["aria-label", "placeholder", "title", "alt"].map((a) => e.getAttribute(a) || "")).join("\n");
  const dashes = [];
  if (root.innerText.includes("\u2014")) {
    const texts = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = texts.nextNode(); t; t = texts.nextNode()) {
      const el = t.parentElement;
      if (!el || !t.textContent.includes("\u2014")) continue;
      // Words that are not drawn are not said.
      if (el.getClientRects().length === 0 || getComputedStyle(el).visibility === "hidden") continue;
      dashes.push({ name: nameOf(el), allow: allowance(el, "emdash") });
    }
  }

  // A sparkle (CLAUDE.md, "No sparkle star", the owner's word of 2026-11-11):
  // the four-point star as a character in the words, a label or a ::before
  // or ::after, or drawn as one outline with four points.
  const SPARK = /[\u2726-\u2728]/;
  const sparkles = [];
  const sparkWords = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = sparkWords.nextNode(); t; t = sparkWords.nextNode()) {
    const el = t.parentElement;
    if (!el || !SPARK.test(t.textContent) || el.getClientRects().length === 0) continue;
    sparkles.push({ name: nameOf(el), how: "a sparkle character in the words", allow: allowance(el, "sparkle") });
  }
  for (const e of [root, ...root.querySelectorAll("[aria-label], [placeholder], [title], [alt]")]) {
    if (["aria-label", "placeholder", "title", "alt"].some((a) => SPARK.test(e.getAttribute(a) || ""))) {
      sparkles.push({ name: nameOf(e), how: "a sparkle character in a label", allow: allowance(e, "sparkle") });
    }
  }
  for (const e of all) {
    if (!shown(e)) continue;
    for (const pseudo of ["::before", "::after"]) {
      if (SPARK.test(getComputedStyle(e, pseudo).content || "")) {
        sparkles.push({ name: `${nameOf(e)}${pseudo}`, how: "a sparkle character drawn by CSS", allow: allowance(e, "sparkle") });
      }
    }
  }
  // Drawn: one closed outline that goes once round its middle, with four
  // tips and a deep waist between each two. A square, a diamond or a box has
  // shallow ones, a five-point star five tips, a cross or a plus is lines.
  const fourPoints = (g) => {
    const tag = g.tagName.toLowerCase();
    if (tag === "path") {
      const d = (g.getAttribute("d") || "").trim();
      if ((d.match(/[Mm]/g) || []).length !== 1 || !/[Zz]$/.test(d)) return false;
    } else if (tag !== "polygon") return false;
    let len = 0;
    try {
      len = g.getTotalLength();
    } catch {
      return false;
    }
    if (!(len > 0)) return false;
    const N = 240;
    const pts = Array.from({ length: N }, (_, i) => g.getPointAtLength((len * i) / N));
    const mx = pts.reduce((sum, q) => sum + q.x, 0) / N;
    const my = pts.reduce((sum, q) => sum + q.y, 0) / N;
    const r = pts.map((q) => Math.hypot(q.x - mx, q.y - my));
    const steps = pts.map((q, i) => {
      const n = pts[(i + 1) % N];
      let d = Math.atan2(n.y - my, n.x - mx) - Math.atan2(q.y - my, q.x - mx);
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      return d;
    });
    const turn = steps.reduce((sum, d) => sum + d, 0);
    if (Math.abs(Math.abs(turn) - 2 * Math.PI) > 0.2 || steps.some((d) => d * Math.sign(turn) < -0.05)) return false;
    const top = Math.max(...r);
    const tips = [];
    for (let i = 0; i < N; i++) {
      if (r[i] > 0.75 * top && r[i] >= r[(i - 1 + N) % N] && r[i] > r[(i + 1) % N]) tips.push(i);
    }
    if (tips.length !== 4) return false;
    for (let k = 0; k < 4; k++) {
      const from = tips[k];
      const to = tips[(k + 1) % 4];
      let low = Infinity;
      for (let i = from; i !== to; i = (i + 1) % N) low = Math.min(low, r[i]);
      if (low > 0.55 * Math.min(r[from], r[to])) return false;
    }
    return true;
  };
  // A shape's answer is its outline's alone, so each outline is read once on a page: the same
  // icon drawn on fifty posts once, not fifty times, and not again for every palette worn (an
  // outline does not change with the palette). The 240 points read along every drawn path on
  // every palette took 15 of the 17 seconds a palette on /community/, and its 22 palettes ran
  // past the walk's limit, which closed the page under the measure (Updates 25, 2026-11-13).
  // Kept on the page for the measure's own passes; the app never reads it.
  const shapes = (window.__mockFourPoints ??= new Map());
  const fourPointsOnce = (g) => {
    const tag = g.tagName.toLowerCase();
    const key = tag === "polygon" ? `polygon ${g.getAttribute("points") || ""}` : `${tag} ${g.getAttribute("d") || ""} ${getComputedStyle(g).d || ""}`;
    if (!shapes.has(key)) shapes.set(key, fourPoints(g));
    return shapes.get(key);
  };
  for (const g of root.querySelectorAll("path, polygon")) {
    if (g.getClientRects().length === 0 || !fourPointsOnce(g)) continue;
    const icon = g.closest("svg") || g;
    sparkles.push({ name: nameOf(icon), how: "a star of four points drawn", allow: allowance(icon, "sparkle") });
  }

  // An empty picture (build 93 notes 1, 12 and 18): an image with no source
  // or one that did not load, or a round frame the size of a portrait that
  // shows a face (a ground or an edge) and holds nothing: no words, no
  // picture, no icon. A shimmer standing in while a picture loads
  // (animate-pulse, or inside aria-busy) is not one.
  const pictures = [];
  const loading = (e) => Boolean(e.closest(".animate-pulse, [aria-busy='true']"));
  for (const img of root.querySelectorAll("img")) {
    // Only a picture a reader can see is judged: one held clear while it is still being asked for
    // (a saint's wide picture, waiting, its carried icon in its place) is not an empty picture,
    // and one that gave up leaves the page (Updates 2's find, 2026-11-11).
    if (!shown(img) || loading(img) || opacityOf(img) < 0.05) continue;
    const r = img.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const src = img.currentSrc || img.getAttribute("src") || "";
    if (!src) pictures.push({ name: nameOf(img), how: "a picture with no source", allow: allowance(img, "picture") });
    else if (img.complete && img.naturalWidth === 0) pictures.push({ name: nameOf(img), how: `a picture that did not load (${src.split("/").pop().slice(0, 60)})`, allow: allowance(img, "picture") });
  }
  const FILLED = "img, svg, canvas, video, picture, object, iframe";
  for (const e of all) {
    if (!shown(e) || loading(e) || e.matches(FILLED)) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 32 || r.height < 32 || r.width > 240 || r.height > 240) continue;
    if (Math.abs(r.width - r.height) > Math.min(r.width, r.height) * 0.1) continue;
    const cs = getComputedStyle(e);
    if (parseFloat(cs.borderTopLeftRadius) < Math.min(r.width, r.height) * 0.4) continue;
    // A blurred disc is a glow (a card's sheen, a soft pool of light), not a frame.
    if (/blur\(/.test(cs.filter)) continue;
    const ground = rgba(cs.backgroundColor)[3] >= 0.05;
    const edge = ["Top", "Right", "Bottom", "Left"].some((side) => cs[`border${side}Style`] !== "none" && parseFloat(cs[`border${side}Width`]) > 0);
    if (!ground && !edge) continue;
    if (textOf(e) || e.getAttribute("aria-label")) continue;
    const pictured = (n) => {
      const c = getComputedStyle(n);
      if (c.backgroundImage && c.backgroundImage !== "none") return true;
      return ["::before", "::after"].some((pseudo) => {
        const q = getComputedStyle(n, pseudo);
        return (q.backgroundImage && q.backgroundImage !== "none") || (q.content && !/^(none|normal|""|'')$/.test(q.content));
      });
    };
    if (pictured(e)) continue;
    const inside = [...e.querySelectorAll("*")].some((n) => {
      const q = n.getBoundingClientRect();
      return q.width * q.height >= r.width * r.height * 0.1 && (n.matches(FILLED) || pictured(n) || textOf(n));
    });
    if (inside) continue;
    pictures.push({ name: nameOf(e), how: `an empty round frame, ${Math.round(r.width)}px across, with nothing in it`, allow: allowance(e, "picture") });
  }

  // A dashed placeholder box (build 93 note 4): a dashed or dotted edge on
  // three sides or more, or round it as an outline. A dashed rule under a
  // line is a divider, not a box.
  const dashedBoxes = [];
  for (const e of all) {
    if (!shown(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) continue;
    const cs = getComputedStyle(e);
    const sides = ["Top", "Right", "Bottom", "Left"].filter((side) => /dashed|dotted/.test(cs[`border${side}Style`]) && parseFloat(cs[`border${side}Width`]) > 0);
    const outline = /dashed|dotted/.test(cs.outlineStyle) && parseFloat(cs.outlineWidth) > 0;
    if (sides.length >= 3 || outline) dashedBoxes.push({ name: nameOf(e), how: outline ? "a dashed outline round it" : `a dashed edge on ${sides.length === 4 ? "every side" : "three sides"}`, allow: allowance(e, "dashed") });
  }

  // A keyboard hint where the pointer is a finger (build 93's list: "a
  // keyboard hint on a phone"): Esc, Ctrl, Cmd, a chord with Alt, Option or
  // Shift, the Mac's key signs, or a key drawn as <kbd>.
  const keyHints = [];
  if (matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches) {
    const KEY = /(?:^|[^\p{L}])(?:Esc|Ctrl|Cmd)(?![\p{L}])|(?:^|[^\p{L}])(?:Alt|Option|Shift)\s*\+|[\u2318\u2325\u21e7\u2303]/u;
    for (const k of root.querySelectorAll("kbd")) {
      if (shown(k)) keyHints.push({ name: nameOf(k), how: "a key drawn as <kbd>", allow: allowance(k, "keys") });
    }
    const keyWords = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = keyWords.nextNode(); t; t = keyWords.nextNode()) {
      const el = t.parentElement;
      if (!el || el.closest("kbd") || !KEY.test(t.textContent) || el.getClientRects().length === 0 || getComputedStyle(el).visibility === "hidden") continue;
      keyHints.push({ name: nameOf(el), how: `a keyboard hint in the words ("${t.textContent.trim().slice(0, 40)}")`, allow: allowance(el, "keys") });
    }
  }

  // A name cut short (the journal's walk with no Plus, 2026-11-11: More's four
  // tiles read "H...", "C...", "D...", "C..." as the Plus mark took their
  // room, and every rule passed them). A control's name is the first words it
  // holds that are drawn (a screen reader's own line, 1px across, is not
  // drawn); it is cut when the box it stands in, up to the control itself,
  // clips it: an ellipsis, a line clamp, or plain overflow. The words after
  // the name (a preview's second line) may be cut on purpose and are not
  // looked at, nor is a row of controls that scrolls. Readers' own words,
  // rightly cut in a list, say so on themselves: data-mock-allow="cut".
  const cuts = [];
  const NAMED = "button, a[href], summary, [role=button], [role=link], [role=tab], [role=menuitem], [role=option], [role=radio], [role=checkbox], [role=switch]";
  for (const c of root.querySelectorAll(NAMED)) {
    if (!shown(c) || c.closest("svg")) continue;
    // A screen reader's own line (a box kept 1px square and clipped, its words in a span of
    // their own size inside) is not drawn: the reading room's cover reads whole to the eye
    // (Fable Themes, 2026-11-11, "The Way of a Pilgrim").
    const unseen = (n) => {
      for (let q = n; q && q !== c.parentElement; q = q.parentElement) {
        const qs = getComputedStyle(q);
        const b = q.getBoundingClientRect();
        if ((qs.clip && qs.clip !== "auto") || (qs.overflowX !== "visible" && (b.width < 8 || b.height < 8))) return true;
      }
      return false;
    };
    const holder = [c, ...c.querySelectorAll("*")].find((n) => {
      if (n.closest("svg") || ![...n.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim())) return false;
      const r = n.getBoundingClientRect();
      return r.width > 2 && r.height > 2 && getComputedStyle(n).visibility !== "hidden" && !unseen(n);
    });
    if (!holder) continue;
    const range = document.createRange();
    range.selectNodeContents(holder);
    const w = range.getBoundingClientRect();
    // A word's box is as tall as its face, often taller than a tight line, so
    // a name stands a pixel or two past its box with nothing cut: across, a
    // pixel counts; down, half a line (a clamp hides whole lines); and an
    // ellipsis counts when the browser draws one.
    const hcs = getComputedStyle(holder);
    const line = parseFloat(hcs.lineHeight) || parseFloat(hcs.fontSize) * 1.25;
    for (let n = holder; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        const b = n.getBoundingClientRect();
        const across = Math.max(w.right - (b.right - parseFloat(cs.borderRightWidth)), b.left + parseFloat(cs.borderLeftWidth) - w.left);
        const down = Math.max(w.bottom - (b.bottom - parseFloat(cs.borderBottomWidth)), b.top + parseFloat(cs.borderTopWidth) - w.top);
        const drawn = cs.textOverflow === "ellipsis" ? n.scrollWidth > n.clientWidth : across > 1;
        if (drawn || down > line / 2) {
          const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== "none" ? cs.webkitLineClamp : null;
          const how = cs.textOverflow === "ellipsis" ? "ended by an ellipsis" : clamp ? `cut at ${clamp} line${clamp === "1" ? "" : "s"}` : "clipped by the box it stands in";
          cuts.push({ name: nameOf(c), how: `its name "${(holder.textContent || "").replace(/\s+/g, " ").trim().slice(0, 32)}" ${how}`, allow: allowance(holder, "cut") });
          break;
        }
      }
      if (n === c) break;
    }
  }

  return { words, placeholders, controls, paints, stripes, rays, sparkles, pictures, dashedBoxes, keyHints, cuts, emDash: labels.includes("\u2014") || dashes.some((d) => !d.allow), dashes: dashes.filter((d) => d.allow) };
}

/**
 * Every ground the contrast measure painted to read it (words on a gradient),
 * on the palette the page wears now: the words, the box that was read, in
 * the page's own coordinates, and the lightest and the darkest of it. For
 * the proof by the screen (scripts/painted-ground-check.mjs), which sets
 * each beside a photograph of the same box.
 */
export async function paintedGrounds(page, selector = "body") {
  const seen = await page.evaluate(look, selector);
  if (!seen) return null;
  return [...seen.words, ...seen.placeholders]
    .filter((w) => w.ground.painted)
    .map((w) => ({ text: w.text, box: w.ground.box, apart: w.ground.apart, pinned: w.ground.pinned, rows: w.ground.rows, word: w.ground.word, bare: w.ground.bare, lightest: w.ground.rgbs[1], darkest: w.ground.rgbs[2] }));
}

/**
 * The side stripes alone, in the part of the page a selector names, each with
 * its reason when it carries one (data-mock-allow="stripe" data-mock-why):
 * the measure checkMock's `stripe` uses, for the walk over every screen of
 * the export (scripts/stripe-walk.mjs; build 89 notes 1 and 5). Null when
 * nothing answers the selector.
 */
export async function stripesOn(page, selector = "body") {
  const seen = await page.evaluate(look, { selector, only: "stripe" });
  return seen ? seen.stripes : null;
}

/** Where each thing is across the part of the page, start to end, to compare in Arabic. */
/** The languages Tailwind's rtl: reads as right to left, as its compiled selector lists them. */
const RTL_LANGS = "^(ae|ar|arc|bcc|bqi|ckb|dv|fa|glk|he|ku|mzn|nqo|pnb|ps|sd|ug|ur|yi)(-|$)";

function boxes(selector) {
  const root = document.querySelector(selector);
  if (!root) return null;
  const R = root.getBoundingClientRect();
  const across = (r) => [Math.round((r.left - R.left) * 10) / 10, Math.round((r.right - R.left) * 10) / 10];
  const pinned = (n) => {
    // A piece that sets its own direction keeps it on purpose.
    for (let p = n; p && p !== root; p = p.parentElement) if (p.hasAttribute("dir")) return true;
    return false;
  };
  const allowed = (n) => {
    for (let p = n; p && p !== document.documentElement; p = p.parentElement) {
      const list = p.getAttribute("data-mock-allow");
      if (list && list.split(/[\s,]+/).includes("mirror")) return p.getAttribute("data-mock-why") || "(no reason given)";
    }
    return null;
  };
  const out = [];
  const index = new Map();
  // The nearest measured parent, so a child carried along by a misplaced
  // parent is not reported again.
  const parentOf = (n) => {
    for (let p = n.parentElement; p && p !== root; p = p.parentElement) if (index.has(p)) return index.get(p);
    return -1;
  };
  const els = [...root.querySelectorAll("*")].filter((e) => !(e.closest("svg") && e.tagName.toLowerCase() !== "svg"));
  // What is seen of a box, across: cut to every frame inside the part that
  // hides what spills out of it (overflow hidden or clip). A picture zoomed in
  // its frame around its own focus (lib/prayers/iconCrops.ts) spills past the
  // frame unevenly, by the picture's own subject, which stays where it is in
  // Arabic, as a picture should; the frame is what is placed, and it mirrors.
  // A scroller (overflow auto or scroll) is not a frame: what it scrolls out
  // of sight is still compared.
  const seen = (e, r) => {
    let left = r.left;
    let right = r.right;
    for (let p = e.parentElement; p && p !== root; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o !== "hidden" && o !== "clip") continue;
      const q = p.getBoundingClientRect();
      left = Math.max(left, q.left);
      right = Math.min(right, q.right);
    }
    return { left, right, width: right - left };
  };
  // What text flow places (a highlight inside a sentence, a link in a line)
  // is not layout: English inside an Arabic line keeps its own order, which
  // is right. Boxes are compared; words are not.
  const flowed = (e) => {
    const d = getComputedStyle(e).display;
    const parent = e.parentElement ? getComputedStyle(e.parentElement).display : "block";
    return d.startsWith("inline") && !/flex|grid/.test(parent);
  };
  for (const e of els) {
    const whole = e.getBoundingClientRect();
    const r = seen(e, whole);
    if (r.width < 1 || whole.height < 1 || pinned(e) || flowed(e)) continue;
    const words = (e.getAttribute("aria-label") || e.innerText || "").replace(/\s+/g, " ").trim();
    index.set(e, out.length);
    // Text set left or right, not start or end, stays put in Arabic.
    const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const align = getComputedStyle(e).textAlign;
    out.push({
      name: `${e.tagName.toLowerCase()}${words ? ` "${words.slice(0, 32)}"` : ""}`,
      x: across(r),
      parent: parentOf(e),
      allow: allowed(e),
      physicalAlign: hasText && (align === "left" || align === "right") ? align : null,
    });
  }
  return { width: Math.round(R.width * 10) / 10, out };
}

// ── In node ─────────────────────────────────────────────────────────────

const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** WCAG's contrast of `fg` at `alpha` laid over an opaque `ground`. */
export function contrast(fg, alpha, ground) {
  const shown = fg.slice(0, 3).map((v, i) => v * alpha + ground[i] * (1 - alpha));
  const [a, b] = [lum(shown), lum(ground)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const same = (a, b) => Boolean(a && b) && a.every((v, i) => Math.abs(v - b[i]) <= (i === 3 ? 0.02 : 2));
const gold = (c) => Boolean(c) && c[3] >= 0.25 && isGoldTone(oklchOf([c[0], c[1], c[2]]));
const settle = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

/**
 * Hold the part of the page `selector` names to the guardrails, on all five
 * palettes and in Arabic's direction, and put the page back as it was.
 * `allowGold`: only for a mockup of a Plus member's profile, the one place
 * gold is allowed (noGold.test.ts).
 */
export async function checkMock(page, selector, { allowGold = false, palettes = WORN, pixels = false } = {}) {
  const failures = [];
  const unmeasured = [];
  // With `pixels`, each word whose ground cannot be read from colours (a picture
  // under it or across it) is measured on the pixels under its letters, on each
  // palette, by scripts/words-on-pictures.mjs: a shortfall is a contrast fail like
  // any other, and only a word with no pixels to read stays "look". Each is kept
  // here by its mark: its words, why it was looked at, and its ratio on each palette.
  const looks = new Map();
  const allowed = new Set();
  const fail = (check, palette, what, detail) => failures.push({ check, palette, what, detail });
  const allow = (check, what, why) => allowed.add(`${check} on ${what}: ${why}`);

  const before = await page.evaluate(() => {
    const h = document.documentElement;
    // Marks a pixels pass left on an earlier measure of this page.
    for (const e of document.querySelectorAll("[data-mock-look]")) e.removeAttribute("data-mock-look");
    // Colours change in steps of their own (body has a 0.35s transition);
    // the measure wants where they end.
    const still = document.createElement("style");
    still.setAttribute("data-mock-check", "");
    // A scroll put back by the measure lands at once, not gliding (scroll-behavior: smooth).
    still.textContent = "*, *::before, *::after { transition: none !important; scroll-behavior: auto !important; }";
    document.head.appendChild(still);
    // So do entrances driven by the scroll (animation-timeline: view(), a
    // reading plan's rows rising in): a row resting at the screen's foot is
    // part way in, and its words read fainter than they end. Fable Themes'
    // find, 2026-11-11: /plans/john/ passed or failed by where a row fell.
    // Each such entrance ends at the element's own style, so it is measured
    // there, and put back after.
    for (const el of document.querySelectorAll("*")) {
      const t = getComputedStyle(el).animationTimeline;
      if (!t || t === "auto" || t === "none") continue;
      el.setAttribute("data-mock-was-animation", el.style.getPropertyValue("animation"));
      el.style.setProperty("animation", "none", "important");
    }
    return { mode: h.getAttribute("data-reading-mode"), look: h.getAttribute("data-look"), dir: h.getAttribute("dir"), lang: h.getAttribute("lang") };
  });
  const shots = {};
  try {
    for (const [palette, mode, worn] of palettes) {
      await wear(page, mode, worn);
      await settle(page);
      const s = await page.evaluate(look, pixels ? { selector, only: null, tag: true } : selector);
      if (!s) throw new Error(`nothing on the page answers ${selector}`);
      shots[palette] = s;
      const pending = [];
      for (const [check, list] of [["contrast", s.words], ["placeholder", s.placeholders]]) {
        for (const w of list) {
          if (w.disabled) continue;
          if (w.ground.unknown) {
            if (check === "contrast" && w.lookAt !== null && w.lookAt !== undefined) pending.push(w);
            else if (palette === "Dark") unmeasured.push(`"${w.text}": ${w.ground.unknown}`);
            continue;
          }
          const need = w.large ? 3 : 4.5;
          // A face drawn as a gradient counts by its worst stop, and a ground
          // painted to be read by its least kind pixel under the words.
          const r = Math.min(...(w.ground.rgbs ?? [w.ground.rgb]).map((g) => contrast(w.fg, w.alpha, g)));
          if (r + 1e-9 >= need) continue;
          if (w.allow) allow(check, `"${w.text}"`, w.allow);
          else fail(check, palette, `"${w.text}"`, `${r.toFixed(2)}:1${w.ground.painted ? " at its least on the gradient under it" : ""}, needs ${need}:1`);
        }
      }
      if (pending.length) {
        const { wordsOnPicture } = await import("./words-on-pictures.mjs");
        const order = await page.evaluate(() => [...document.querySelectorAll("[data-mock-look]")].map((e) => e.getAttribute("data-mock-look")));
        // The pass brings each word to the middle of the screen, a sideways row's too; every
        // scroll is put back after, or the Arabic pass below would compare a row scrolled one
        // way with itself scrolled the other.
        const win = await page.evaluate(() => {
          for (const e of document.querySelectorAll("*")) {
            if (e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight) e.setAttribute("data-mock-scroll", `${e.scrollLeft},${e.scrollTop}`);
          }
          return [scrollX, scrollY];
        });
        // Every picture in the part at rest first: one that loads only as it comes into sight would
        // be photographed as it arrives, half faded in, as the pass brings it to the middle (the
        // reading room's covers read 2.89:1 on Light that way, and 12.87:1 once arrived).
        await page.evaluate(async (sel) => {
          const root = document.querySelector(sel);
          const pictures = [...(root?.querySelectorAll("img") ?? [])];
          for (const i of pictures) if (i.loading === "lazy") i.loading = "eager";
          const loaded = pictures.map((i) => (i.complete ? null : new Promise((done) => (i.addEventListener("load", done, { once: true }), i.addEventListener("error", done, { once: true })))));
          await Promise.race([Promise.all(loaded), new Promise((done) => setTimeout(done, 8000))]);
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
          const arriving = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}));
          await Promise.race([Promise.all(arriving), new Promise((done) => setTimeout(done, 3000))]);
        }, selector);
        const read = new Map();
        try {
          for (const r of await wordsOnPicture(page, "[data-mock-look]", { palettes: [[palette, mode]] })) read.set(order[r.at], r);
        } finally {
          await page.evaluate((w) => {
            for (const e of document.querySelectorAll("[data-mock-scroll]")) {
              const [x, y] = e.getAttribute("data-mock-scroll").split(",").map(Number);
              e.scrollLeft = x;
              e.scrollTop = y;
              e.removeAttribute("data-mock-scroll");
            }
            scrollTo(w[0], w[1]);
          }, win);
        }
        for (const w of pending) {
          const key = `${w.lookAt}\u0000${w.text}`;
          const entry = looks.get(key) ?? { text: w.text, why: w.ground.unknown, at: w.lookAt, ratios: {}, need: null };
          looks.set(key, entry);
          const r = read.get(w.lookAt);
          entry.ratios[palette] = r ? Math.round(r.ratio * 100) / 100 : null;
          if (!r) continue;
          entry.need = r.need;
          if (r.ratio + 1e-9 >= r.need) continue;
          // The allowance as it stood when the pixels were photographed, as well as when the colours were read.
          if (w.allow || r.allow) allow("contrast", `"${w.text}"`, w.allow || r.allow);
          else fail("contrast", palette, `"${w.text}"`, `${r.ratio.toFixed(2)}:1 at its least on the pixels under it, needs ${r.need}:1`);
        }
      }
      if (!allowGold) {
        for (const p of s.paints) {
          if (!p) continue;
          for (const [part, c] of [["words", p.color], ["ground", p.bg], ["border", p.border]]) {
            if (!gold(c)) continue;
            if (p.allowGold) allow("gold", p.name, p.allowGold);
            else fail("gold", palette, p.name, `${part === "words" ? "its words are" : `its ${part} is`} gold, rgb(${c.slice(0, 3).join(", ")})`);
          }
        }
      }
    }

    // What does not change with the palette is read once, on Dark (or on the
    // first palette of a list that leaves Dark out).
    const dark = shots.Dark ?? Object.values(shots)[0];
    const light = shots.Light;
    for (const c of dark.controls) {
      const small = !c.inline && !c.hit44 && (c.w < 44 - 0.5 || c.h < 44 - 0.5);
      if (small) {
        if (c.allowTarget) allow("target", c.name, c.allowTarget);
        else fail("target", null, c.name, `${c.w} by ${c.h}px, needs 44 by 44`);
      }
      const glyph = c.face.length > 0 && (/^[^\p{L}\p{N}]+$/u.test(c.face) || /\p{Extended_Pictographic}/u.test(c.face));
      if (glyph) {
        if (c.allowGlyph) allow("glyph", c.name, c.allowGlyph);
        else fail("glyph", null, c.name, `"${c.face}" stands in for an icon; use components/ui/icons`);
      }
    }
    dark.paints.forEach((p, i) => {
      // A colour typed in shows by staying the same on Light; a list with no Light cannot say.
      const q = light?.paints[i];
      if (!p || !q) return;
      for (const part of ["color", "bg", "border"]) {
        if (!same(p[part], q[part])) continue;
        if (p.allowPalette) allow("palette", p.name, p.allowPalette);
        else if (p.red?.[part] || (part === "color" && p.onRed)) allow("palette", p.name, CRIMSON);
        else fail("palette", null, p.name, `${part === "color" ? "its words stay" : part === "bg" ? "its ground stays" : "its border stays"} rgb(${p[part].slice(0, 3).join(", ")}) on Light: a colour typed in, not a token`);
      }
    });
    for (const s of dark.stripes) {
      if (s.allow) allow("stripe", s.name, s.allow);
      else fail("stripe", null, s.name, s.how);
    }
    for (const r of dark.rays) {
      if (r.allow) allow("rays", r.name, r.allow);
      else fail("rays", null, r.name, "a burst of separate light rays (a repeating conic gradient): vibe-coded, the owner's word of 2026-11-08; light is a soft pool");
    }
    for (const sp of dark.sparkles) {
      if (sp.allow) allow("sparkle", sp.name, sp.allow);
      else fail("sparkle", null, sp.name, `${sp.how}: the four-point sparkle is AI slop, the owner's word of 2026-11-11; an icon from components/ui/icons that names what the place is`);
    }
    for (const p of dark.pictures) {
      if (p.allow) allow("picture", p.name, p.allow);
      else fail("picture", null, p.name, `${p.how}: every saint, work and face wears its picture (build 93 notes 1, 12 and 18)`);
    }
    for (const d of dark.dashedBoxes) {
      if (d.allow) allow("dashed", d.name, d.allow);
      else fail("dashed", null, d.name, `${d.how}: a dashed placeholder box (build 93 note 4); show the thing itself`);
    }
    for (const k of dark.keyHints) {
      if (k.allow) allow("keys", k.name, k.allow);
      else fail("keys", null, k.name, `${k.how}: a phone has no keyboard keys to press`);
    }
    for (const k of dark.cuts) {
      if (k.allow) allow("cut", k.name, k.allow);
      else fail("cut", null, k.name, `${k.how}: a control's name is read whole; give it the room it needs, or, for a reader's own words in a list, say so (data-mock-allow="cut")`);
    }
    if (dark.emDash) fail("emdash", null, "the words", "an em dash; use a comma, a colon or a full stop");
    for (const d of dark.dashes) allow("emdash", d.name, d.allow);

    // Arabic: everything is where it was, measured from the other side. The
    // page is measured from left to right whatever it was in, so a page
    // already in Arabic or Urdu is compared with itself turned round, not
    // with itself (2026-11-11: every row of the language sheet in Arabic
    // "stayed put", having been measured twice the same way round).
    //
    // Tailwind's rtl: is on for a right-to-left language as well as under
    // [dir=rtl] (it compiles to :where(:is(:lang(ar), :lang(ur), ...),
    // [dir=rtl], [dir=rtl] *)), so a page in Arabic turned round by dir alone
    // kept its rtl: rules on, and a bar filling from the right in Arabic, as
    // it should, read as placed with left or right (Updates' find,
    // 2026-11-11: FirstLiturgyGuide, PlusTry, ReaderDock, WalkProgress). Such
    // a page is measured left to right in English; a page in any other
    // language keeps it (German's headings break by its own hyphens).
    //
    // And measured left to right once more after Arabic: what changes while
    // it is measured (a clock that ticks, a count) moves between two
    // measures, and what stands beside it with it, so a box is where it
    // should be when it mirrors either measure the first way round (Updates'
    // find, 2026-11-11: Now Playing's countdown, "-2:02", read as placed
    // with left or right while a recording played, its outer edge matched
    // and its words 3.2px narrower in the second measure). One that moved
    // between the two measures the same way round, and mirrors neither, was
    // moving while it was measured: it is said, not failed, as nothing
    // could be compared.
    await wear(page, before.mode, before.look);
    const leftToRight = async () => {
      await page.evaluate((rtlLangs) => {
        const h = document.documentElement;
        h.setAttribute("dir", "ltr");
        if (new RegExp(rtlLangs, "i").test(h.getAttribute("lang") || "")) h.setAttribute("lang", "en");
      }, RTL_LANGS);
      await settle(page);
      return page.evaluate(boxes, selector);
    };
    const ltr = await leftToRight();
    await page.evaluate((lang) => {
      const h = document.documentElement;
      h.setAttribute("dir", "rtl");
      if (lang) h.setAttribute("lang", lang);
      else h.removeAttribute("lang");
    }, before.lang);
    await settle(page);
    const rtl = await page.evaluate(boxes, selector);
    const again = await leftToRight();
    if (ltr && rtl && ltr.out.length === rtl.out.length) {
      const twice = Boolean(again) && again.out.length === ltr.out.length;
      const mirrors = (a, b) => Math.abs(b.x[0] - (rtl.width - a.x[1])) <= 1.5 && Math.abs(b.x[1] - (rtl.width - a.x[0])) <= 1.5;
      // Where a parent is placed wrong, its children go with it: only the
      // parent is said.
      const wrong = new Set();
      ltr.out.forEach((a, i) => {
        const b = rtl.out[i];
        const c = twice ? again.out[i] : a;
        if (a.physicalAlign) {
          if (a.allow) allow("mirror", a.name, a.allow);
          else fail("mirror", null, a.name, `its text is set ${a.physicalAlign}, not start or end, so it stays ${a.physicalAlign} in Arabic`);
        }
        if (mirrors(a, b) || mirrors(c, b)) return;
        wrong.add(i);
        if (wrong.has(a.parent)) return;
        if (a.allow) allow("mirror", a.name, a.allow);
        else if (Math.abs(a.x[0] - c.x[0]) > 1.5 || Math.abs(a.x[1] - c.x[1]) > 1.5)
          unmeasured.push(`Arabic: ${a.name} moved while it was measured (at ${a.x[0]} to ${a.x[1]}px, then ${c.x[0]} to ${c.x[1]}px, the same way round), so its place was not compared`);
        else fail("mirror", null, a.name, `at ${a.x[0]} to ${a.x[1]}px, and in Arabic at ${b.x[0]} to ${b.x[1]}px of ${rtl.width}: placed with left or right, not start or end`);
      });
    } else {
      unmeasured.push("Arabic: the part of the page changed between the two directions, so it was not compared");
    }
  } finally {
    await wear(page, before.mode, before.look);
    await page.evaluate((b) => {
      const h = document.documentElement;
      if (b.dir) h.setAttribute("dir", b.dir);
      else h.removeAttribute("dir");
      if (b.lang) h.setAttribute("lang", b.lang);
      else h.removeAttribute("lang");
      document.querySelector("style[data-mock-check]")?.remove();
      document.querySelector("style[data-words-on-pictures]")?.remove();
      for (const el of document.querySelectorAll("[data-mock-was-animation]")) {
        const was = el.getAttribute("data-mock-was-animation");
        if (was) el.style.setProperty("animation", was);
        else el.style.removeProperty("animation");
        el.removeAttribute("data-mock-was-animation");
      }
    }, before);
    await settle(page);
  }
  const lookList = [...looks.values()].map((l) => ({ ...l, left: Object.values(l.ratios).some((v) => v === null) }));
  for (const l of lookList.filter((x) => x.left)) unmeasured.push(`"${l.text}": ${l.why}, and no pixels to read under it`);
  return { selector, failures, unmeasured, allowed: [...allowed], byEye: BY_EYE, looks: lookList };
}

/** Say what `checkMock` found. True when nothing failed. */
export function printMockCheck(result, label = result.selector) {
  const failed = new Set(result.failures.map((f) => f.check));
  console.log(`\nMock check: ${label} (${result.selector})`);
  console.log(`  ok   ${CHECKS.filter((c) => !failed.has(c)).join(", ") || "nothing"}`);
  const lines = new Map();
  for (const f of result.failures) {
    const key = `${f.check}\u0000${f.what}\u0000${f.detail}`;
    const line = lines.get(key) ?? { ...f, palettes: [] };
    if (f.palette) line.palettes.push(f.palette);
    lines.set(key, line);
  }
  for (const f of lines.values()) console.log(`  NO   ${f.check.padEnd(11)} ${f.palettes.length ? `${f.palettes.join(", ")}: ` : ""}${f.what}: ${f.detail}`);
  for (const u of result.unmeasured) console.log(`  ??   not measured, look: ${u}`);
  for (const a of result.allowed) console.log(`  --   allowed, ${a}`);
  console.log("  By eye, before it is sent:");
  for (const b of result.byEye) console.log(`    - ${b}`);
  return result.failures.length === 0;
}

// ── From the command line ───────────────────────────────────────────────

/**
 * A phone on the native export, as the walk opens one (for a mockup's own
 * script). `scale` 2 for a picture a person will see (1 to check); `set`
 * seeds localStorage before the app starts; `browser` reuses one already open.
 */
export async function openPhone({ scale = 1, set = {}, browser: given, motion } = {}) {
  const { chromium } = await import("playwright");
  const { NATIVE_UA, serveLikeTheShell } = await import("./lib/shell-server.mjs");
  // A walk that names its motion ("on", or "reduce" for the still path) has it pinned before the
  // first page opens and asserted on every screen it reaches (scripts/lib/motion.mjs, watchMotion;
  // cause 9 of the gate). Without it the phone opens as it always did.
  const m = motion ? await import("./lib/motion.mjs") : null;
  const OUT = path.resolve("out");
  if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first");
  // The cloud sessions carry their own Chromium (CLAUDE.md's environment); elsewhere Playwright's.
  const own = "/opt/pw-browsers/chromium";
  const browser = given ?? (await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {}));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...(m ? m.motionOptions(motion) : {}) });
  if (m) await m.pinMotion(ctx, motion);
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...set });
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  if (m) m.watchMotion(page, motion);
  return { browser, ctx, page };
}

// The first drawings' mistakes, each as it was drawn, and the same parts made
// from the house's own classes.
const FIXTURES = `
<div data-mock-fixture="bad" style="position:fixed;left:0;right:0;top:300px;z-index:301;background:#1c1c1f;padding:16px 16px 16px 20px;font-family:sans-serif">
  <div style="display:flex;align-items:center;gap:12px">
    <button type="button" style="width:34px;height:34px;border:0;border-radius:999px;background:#2a2a2e;color:#ffffff;font-size:18px">\u00d7</button>
    <p style="margin:0;color:rgba(255,255,255,0.42);font-size:13px">Kept with the verse \u2014 and in your journal</p>
  </div>
  <p style="margin:12px 0 0;border-left:2px solid rgba(255,255,255,0.35);padding-left:14px;color:#e8e8ea;font-size:16px">A sample note</p>
  <p style="margin:8px 0 0;color:#d4af37;font-size:13px">Plus</p>
  <div style="margin-top:8px;width:120px;height:120px;background:repeating-conic-gradient(from 3deg, rgba(255,240,214,.4) 0deg 3.5deg, rgba(255,240,214,0) 3.5deg 13deg)"></div>
  <p style="margin:8px 0 0;display:flex;align-items:center;gap:8px;color:#e8e8ea;font-size:13px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3.5c.7 4 2.5 5.8 6.5 6.5-4 .7-5.8 2.5-6.5 6.5-.7-4-2.5-5.8-6.5-6.5 4-.7 5.8-2.5 6.5-6.5z" /></svg>What's new \u2726</p>
  <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
    <span style="display:block;width:48px;height:48px;border-radius:999px;background:#2a2a2e"></span>
    <img alt="St Alexander" src="/__no-such-picture.png" style="width:48px;height:48px;border-radius:999px">
    <div style="width:120px;height:48px;border:1.5px dashed rgba(255,255,255,0.35);border-radius:12px"></div>
  </div>
  <p style="margin:8px 0 0;color:#e8e8ea;font-size:13px">Search <kbd>Ctrl</kbd> K, close with Esc</p>
  <a href="/history/" style="margin-top:8px;display:flex;align-items:center;gap:6px;width:64px;height:48px;color:#e8e8ea;font-size:13px;text-decoration:none"><span style="min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">History</span><span style="flex:none;width:36px;height:16px;border-radius:999px;background:#2a2a2e"></span></a>
  <a href="/saints/john-chrysostom/" style="margin-top:8px;display:flex;flex-direction:column;width:140px;color:#e8e8ea;text-decoration:none"><span style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden;font-size:13px;font-style:italic">&ldquo;Golden-mouthed, the preacher of Antioch&rdquo;</span><span style="font-size:19px;font-weight:600">John Chrysostom</span></a>
  <div style="margin-top:8px;padding:10px 12px;border-radius:14px;background:linear-gradient(180deg,#1c1c1f,#151518)"><p style="margin:0;color:rgba(255,255,255,0.3);font-size:13px">Faint on a tray</p></div>
  <div style="margin-top:8px;height:120px;display:flex;flex-direction:column;justify-content:flex-end;background-image:linear-gradient(var(--color-night),var(--color-paper))"><p class="text-paper" style="margin:0;font-size:13px">Ink at the ink end</p></div>
  <div style="margin-top:8px;padding:10px 0;border-radius:14px;background:linear-gradient(180deg,#1c1c1f,#151518)"><div style="display:flex;gap:8px;overflow-x:auto;padding:0 12px;scrollbar-width:none"><span style="flex:none;width:420px;height:18px"></span><p style="flex:none;margin:0;color:rgba(255,255,255,0.3);font-size:13px">Faint past its row</p></div></div>
</div>
<div data-mock-fixture="good" class="bg-night px-4 pb-4" style="position:fixed;left:0;right:0;top:0;z-index:301">
  <div class="flex items-center gap-2">
    <button type="button" class="tap-press inline-flex min-h-11 shrink-0 items-center rounded-pill px-3 font-sans text-ui text-paper/70">Close</button>
    <p class="min-w-0 flex-1 truncate text-center font-sans text-caption text-paper/70">Saturday, November 7</p>
    <button type="button" class="tap-press inline-flex h-11 shrink-0 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night">Done</button>
  </div>
  <div class="border-b border-paper/10 pb-4">
    <p class="font-serif text-body leading-[1.6] text-paper/85">Jesus saw Nathanael coming to him</p>
    <p class="mt-1.5 flex min-w-0 items-center gap-3 font-sans text-caption text-paper/70">
      <span class="min-w-0 truncate">John 1:47</span>
      <a href="/bible/john/1/#v47" class="ms-auto inline-flex min-h-11 shrink-0 items-center px-3 font-semibold text-paper/75 underline underline-offset-4">Open</a>
    </p>
  </div>
  <div role="radiogroup" aria-label="Calendar reckoning" class="set-track" style="--set-cols:2">
    <button type="button" role="radio" aria-checked="true" class="hit-44">New</button>
    <button type="button" role="radio" aria-checked="false" class="hit-44">Old (Julian)</button>
  </div>
  <span class="relative mt-3 block h-[72px] w-[72px] overflow-hidden rounded-[18px] bg-night-soft">
    <img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" class="absolute inset-0 h-full w-full object-cover" style="object-position:30% 40%;transform:scale(1.25);transform-origin:30% 40%">
  </span>
  <span aria-hidden="true" class="mt-3 flex items-center gap-3 text-paper/70">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8L12 3.8z" /></svg>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15.9 3.9l4.2 4.2-8.5 8.5-2.9.6-2-2 .7-2.8z" /><line x1="14.3" y1="5.5" x2="18.5" y2="9.7" /><line x1="4" y1="20.5" x2="11" y2="20.5" /></svg>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.6 3.5H11l9.5 9.5-7.5 7.5L3.5 11V4.6c0-.6.5-1.1 1.1-1.1z" /><circle cx="7.6" cy="7.6" r="1.3" /></svg>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="12" y1="2.5" x2="12" y2="21.5" /><line x1="8.5" y1="6" x2="15.5" y2="6" /><line x1="5.5" y1="9.5" x2="18.5" y2="9.5" /><line x1="8" y1="14" x2="16" y2="16.5" /></svg>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="5" width="14" height="14" rx="1" /><path d="M12 2.5l9.5 9.5-9.5 9.5-9.5-9.5z" /></svg>
  </span>
  <span class="mt-3 block h-12 w-12 overflow-hidden rounded-full bg-night-soft">
    <img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" class="h-full w-full object-cover">
  </span>
  <span class="mt-3 block h-12 w-12 animate-pulse rounded-full bg-paper/10"></span>
  <span class="relative mt-3 block h-14 w-14 overflow-hidden rounded-[18px] bg-night-soft"><span aria-hidden="true" class="pointer-events-none absolute -end-6 -top-8 h-32 w-32 rounded-full bg-paper/15 blur-2xl"></span></span>
  <div style="content-visibility:auto;contain-intrinsic-size:auto 80px;margin-top:2400px"><span class="flex h-10 w-10 items-center justify-center rounded-full bg-night-soft font-sans text-detail font-semibold text-paper">M</span><button type="button" class="mt-1 min-h-11 font-sans text-detail text-paper">Reader M</button></div>
  <a href="/prayers/" class="mt-3 flex min-h-11 flex-col justify-center font-sans"><span class="text-ui text-paper">The daily rule</span><span class="line-clamp-1 text-caption text-paper/70">Morning prayers, Midday prayers, Evening prayers, The Nicene Creed, the prayer for today, and more besides</span></a>
  <a href="/reading/the-way-of-a-pilgrim/" class="mt-1 flex min-h-11 flex-col font-sans"><span class="sr-only"><span>The Way of a Pilgrim, Anonymous</span></span><span aria-hidden="true" class="text-ui text-paper">The Way of a Pilgrim</span></a>
  <button type="button" data-mock-allow="cut" data-mock-why="a reader's own title, rightly cut in a list" class="mt-1 block min-h-11 w-40 truncate text-start font-sans text-ui text-paper">A long title a reader wrote for the wall</button>
  <blockquote lang="en" data-mock-allow="emdash" data-mock-why="a Father's own words, as his edition prints them" class="mt-3 font-serif text-body italic leading-[1.6] text-paper/85">Chapter I.\u2014Introduction. Reason for writing</blockquote>
  <div class="theology-tray mt-3 rounded-[18px] px-4 py-3"><p class="font-sans text-ui text-paper">A line on a tray</p><p class="font-sans text-caption text-paper/70">And a quieter one under it</p></div>
  <div class="mt-3" style="height:120px;background-image:linear-gradient(var(--color-night),var(--color-paper))"><p class="font-sans text-ui text-paper">Ink at the ground end</p></div>
  <div class="theology-tray mt-3 rounded-[18px] py-3">
    <div class="flex gap-2 overflow-x-auto px-4" style="scrollbar-width:none"><button type="button" class="min-h-11 shrink-0 px-3 font-sans text-ui text-paper">A door in its row</button><button type="button" class="min-h-11 shrink-0 px-3 font-sans text-ui text-paper">And the door beside it</button><button type="button" class="min-h-11 shrink-0 px-3 font-sans text-ui text-paper">One at the row's edge</button><button type="button" class="min-h-11 shrink-0 px-3 font-sans text-ui text-paper">A door out of its row</button></div>
    <div class="mt-2 h-12 overflow-y-auto px-4" style="scrollbar-width:none"><p class="font-sans text-ui text-paper">A line in its box</p><p class="mt-8 font-sans text-ui text-paper">A line under its fold</p></div>
  </div>
  <div class="mt-3" style="background-image:url(data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==)"><p class="font-sans text-ui text-paper">Words on a picture</p></div>
  <div class="relative mt-3 h-24 overflow-hidden rounded-[18px] bg-night-soft"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" class="absolute inset-0 h-full w-full object-cover"><p class="absolute inset-x-0 bottom-0 px-3 pb-2 pt-6 font-sans text-ui text-paper" style="background-image:linear-gradient(transparent,var(--color-night))">Words over a fade on a picture</p></div>
  <div class="relative mt-3 h-16 overflow-hidden rounded-[18px] bg-night-soft"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" class="absolute inset-0 h-full w-full object-cover"><p class="relative px-3 pt-3 font-sans text-ui text-paper">Words over a picture, on plain colours</p></div>
  <div class="mt-3 flex items-center gap-3"><span class="relative block h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-night-soft"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" class="absolute inset-0 h-full w-full object-cover"></span><p class="font-sans text-ui text-paper">Words beside a picture</p></div>
  <div style="height:60px"><img alt="" data-hero-picture="waiting" src="/__no-such-wide-picture.png" style="width:96px;height:54px;opacity:0"></div>
</div>`;

// An Arabic page's progress bar, as the app draws them (FirstLiturgyGuide,
// PlusTry, ReaderDock, WalkProgress): it fills from the start of its track,
// from the right in Arabic, by origin-left rtl:origin-right and the reader's
// place as a scale. A reader sees it right both ways round.
const ARABIC = `
<div data-mock-fixture="arabic" class="bg-night px-4 pb-4" style="position:fixed;left:0;right:0;bottom:0;z-index:302">
  <span class="mt-3 block h-1.5 w-40 overflow-hidden rounded-full bg-paper/10">
    <span class="block h-full w-full origin-left rounded-full bg-paper/80 rtl:origin-right" style="transform:scaleX(0.4)"></span>
  </span>
</div>`;

/**
 * The pixels pass's own proof: words on two pictures of one colour each, drawn as pictures (not colours). Its
 * quotes are single, inside a style written in double ones: written with double quotes, as it first was, the
 * style ended at "url(", no picture was drawn, and the pass read the app's own page and tab bar under the words
 * (the grey words read 2.33:1, not their own 1.30:1) until the measure learned to read only words a reader is
 * shown (7bd238108). So the fixture stands fixed at the top, over everything, and its pictures are drawn.
 */
const PICTURE = (hex) => `url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%228%22 height=%228%22%3E%3Crect width=%228%22 height=%228%22 fill=%22%23${hex}%22/%3E%3C/svg%3E')`;
const PIXELS = `<div data-mock-fixture="pixels" style="position:fixed;left:0;right:0;top:120px;z-index:400;padding:16px">
  <div style="background-image:${PICTURE("101010")};padding:12px"><p style="margin:0;color:#ffffff;font:16px sans-serif">Light words on a dark picture</p></div>
  <div style="margin-top:12px;background-image:${PICTURE("777777")};padding:12px"><p style="margin:0;color:#8a8a8a;font:16px sans-serif">Grey words on a grey picture</p></div>
  <div style="margin-top:12px;background-image:${PICTURE("f4efe6")};padding:12px"><p style="margin:0;color:#2b2317;font:16px sans-serif"><span aria-hidden="true" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2b2317;margin-inline-end:6px"></span>Dark words beside their own mark</p></div>
  <div style="position:fixed;inset-inline-start:2000px;top:120px;background-image:${PICTURE("101010")};padding:12px"><p style="margin:0;color:#ffffff;font:16px sans-serif">Words past the screen's edge</p></div>
</div>`;

/**
 * Words over light that moves forever (the gate's confirm run, 2026-11-12: a profile's falling specks and its
 * banner's breathing light read "@purify" at 2.55:1 by the pixels a speck crossed between the measure's two
 * photographs). The dot loops under the line, below the letters, which have no descender: on a held frame the
 * words are read on their own dark picture and pass; a measure that photographs it moving never holds still and
 * leaves them to the eye.
 */
const MOTION = `<div data-mock-fixture="motion" style="position:fixed;left:0;right:0;top:120px;z-index:400;padding:16px">
  <style>@keyframes mock-dot { from { transform: translateX(0); } to { transform: translateX(200px); } }</style>
  <div style="position:relative;background-image:${PICTURE("101010")};padding:12px"><span aria-hidden="true" style="position:absolute;left:12px;top:28px;width:6px;height:4px;border-radius:2px;background:#ffffff;animation:mock-dot 300ms linear infinite alternate"></span><p style="position:relative;margin:0;color:#ffffff;font:16px/22px sans-serif">Words in the room</p></div>
</div>`;

/**
 * Words broken at a soft hyphen over a picture (the gate's confirm run, 2026-11-12: "Chryso-gonus" on the saints'
 * webs at 320 read 4.07:1 where its letters stand on 7:1). Chrome gives the hyphen it draws a box of its own, and
 * with fewer than twelve pixels of letter that box was read by all its pixels: its corners, past the halo, are the
 * bare picture. The first word wears a close halo and is read on it, the hyphen with its line, and passes; the
 * second has none and fails on the grey, broken or not.
 */
const HYPHEN = `<div data-mock-fixture="hyphen" style="position:fixed;left:0;right:0;top:120px;z-index:400;padding:16px">
  <div style="background-image:${PICTURE("8c8c8c")};padding:12px"><p style="margin:0;width:64px;color:#ffffff;font:600 11.5px/14px sans-serif;text-shadow:0 0 1px #101010,0 0 2px #101010,0 0 2px #101010">Wonder&shy;worker</p></div>
  <div style="margin-top:12px;background-image:${PICTURE("8c8c8c")};padding:12px"><p style="margin:0;width:64px;color:#ffffff;font:600 11.5px/14px sans-serif">Thauma&shy;turgist</p></div>
</div>`;

/** The Church's red, by its token, beside a red typed in that is not it. */
const RED = `<div data-mock-fixture="red" style="padding:16px;display:flex;gap:12px">
  <button type="button" class="inline-flex min-h-11 items-center rounded-pill bg-crimson px-4 font-sans text-ui font-semibold text-white">Pray</button>
  <button type="button" style="display:inline-flex;min-height:44px;align-items:center;border-radius:999px;background:#b22222;color:#ffffff;padding:0 16px;font:600 16px sans-serif">Take it down</button>
</div>`;

/**
 * What changes while it is measured (Updates' find, 2026-11-11: Now Playing's countdown, "-2:02", read as placed
 * with left or right while a recording played; its outer edge matched and its words were 3.2px narrower in the
 * second measure, the clock having ticked between the two directions). The clock here ticks once, between the
 * two directions, and is where it should be both ways round: it passes. The bar under it grows every frame, so no
 * two measures of it agree: it cannot be compared, and is said, not failed.
 */
const CLOCK = `<div data-mock-fixture="clock" style="padding:16px;background:#101010;color:#ffffff;font:16px sans-serif">
  <div style="display:flex;align-items:center"><span>Now playing</span><span data-mock-clock style="margin-inline-start:auto">-2:02</span></div>
  <div style="margin-top:12px;height:6px"><span data-mock-grows style="display:block;height:6px;width:40px;background:#ffffff"></span></div>
</div>`;

// A feed's icons (Updates 25, 2026-11-13): the same two outlines drawn twenty-four times each, as fifty posts
// draw theirs, and a four-point sparkle drawn three times among them. Each outline is read once on the page, and
// every sparkle drawn is still caught.
const SHAPE_SQUARE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4L20 4L20 20L4 20Z" /></svg>`;
const SHAPE_KITE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12,2 20,10 12,22 4,10" /></svg>`;
const SHAPE_SPARKLE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3.5c.7 4 2.5 5.8 6.5 6.5-4 .7-5.8 2.5-6.5 6.5-.7-4-2.5-5.8-6.5-6.5 4-.7 5.8-2.5 6.5-6.5z" /></svg>`;
const SHAPES = `<div data-mock-fixture="shapes" style="padding:16px;background:#101010;color:#ffffff;display:flex;flex-wrap:wrap;gap:4px">${Array.from(
  { length: 24 },
  (_, i) => `${SHAPE_SQUARE}${SHAPE_KITE}${i % 8 === 3 ? SHAPE_SPARKLE : ""}`,
).join("")}</div>`;

async function selfTest() {
  // The lists wear every palette of the registry (2026-11-13): until then the two earned by reading were in none,
  // and no gate run measured them. The lists as they stand leave nothing out, and the lists as they stood (the
  // five, and the five with the looks) are caught leaving out both, by default and in every list.
  const gaps = paletteGaps();
  const oldGaps = paletteGaps({ worn: PALETTES, every: [...PALETTES, ...LOOKS] });
  const listsWhole = gaps.length === 0 && EARNED.length === 2 && oldGaps.length === 2 * EARNED.length;
  console.log(
    listsWhole
      ? `the lists wear every palette: ${PALETTES.length} palettes, ${EARNED.length} earned by reading (${EARNED.map(([n]) => n).join(", ")}), ${LOOKS.length} looks; the old lists are caught leaving out ${EARNED.map(([n]) => n).join(" and ")}`
      : `the lists: ${gaps.join("; ") || "none left out"}; the old lists caught: ${oldGaps.join("; ") || "nothing"}`,
  );
  const { go } = await import("./lib/shell-server.mjs");
  const { browser, page } = await openPhone();
  try {
    await go(page, "/");
    await page.waitForTimeout(1500);
    await page.evaluate((html) => document.body.insertAdjacentHTML("beforeend", html), FIXTURES);
    // The picture that cannot load has to have failed before it is measured.
    await page.waitForFunction(() => [...document.querySelectorAll("[data-mock-fixture] img")].every((i) => i.complete), null, { timeout: 5000 });
    await settle(page);
    const bad = await checkMock(page, "[data-mock-fixture=bad]");
    printMockCheck(bad, "the first drawings' mistakes");
    const good = await checkMock(page, "[data-mock-fixture=good]");
    printMockCheck(good, "the same parts from the house's classes");
    // The words whose ground was painted to be read, on the palette the page wears.
    const painted = (await paintedGrounds(page, "[data-mock-fixture=good]")).map((g) => g.text);
    // The page in Arabic, as the app sets it, and its bar.
    await page.evaluate((html) => {
      const h = document.documentElement;
      h.setAttribute("lang", "ar");
      h.setAttribute("dir", "rtl");
      document.body.insertAdjacentHTML("beforeend", html);
    }, ARABIC);
    await settle(page);
    const arabic = await checkMock(page, "[data-mock-fixture=arabic]");
    printMockCheck(arabic, "an Arabic page's bar, filling from its start");
    // The pixels pass (1.9, the gate's rule that no "look" stands unanswered): two words on pictures, light on a
    // dark one and grey on a grey one. Without the pass both are said; with it neither is, the first passes on its
    // pixels and the second fails on them.
    // The pass reads only what a reader is shown (scripts/words-on-pictures.mjs, 7bd238108): the fixtures measured
    // above stand fixed over the page and would cover these words, so they are put away first.
    await page.evaluate((html) => {
      for (const f of document.querySelectorAll("[data-mock-fixture]")) f.style.display = "none";
      document.body.insertAdjacentHTML("beforeend", html);
    }, PIXELS);
    await settle(page);
    const lookOnly = await checkMock(page, "[data-mock-fixture=pixels]", { palettes: [["Dark", null]] });
    const byPixels = await checkMock(page, "[data-mock-fixture=pixels]", { palettes: [["Dark", null]], pixels: true });
    printMockCheck(byPixels, "words on pictures, measured on their pixels");
    // Words over light that moves forever: measured on a held frame, and passed.
    await page.evaluate((html) => {
      for (const f of document.querySelectorAll("[data-mock-fixture]")) f.style.display = "none";
      document.body.insertAdjacentHTML("beforeend", html);
    }, MOTION);
    await settle(page);
    const moving = await checkMock(page, "[data-mock-fixture=motion]", { palettes: [["Dark", null]], pixels: true });
    printMockCheck(moving, "words over light that moves forever");
    // (The dot itself moves while the mirror is measured, and is said for that: the pass's own business, not this one.)
    const motionLook = moving.looks.find((l) => l.text === "Words in the room");
    const motionRead = moving.failures.length === 0 && motionLook?.left === false && (motionLook?.ratios?.Dark ?? 0) >= 4.5;
    await page.evaluate(() => document.querySelector("[data-mock-fixture=motion]")?.remove());
    // Words broken at a soft hyphen: each line read whole, the hyphen with its letters. The words must break, or
    // this proves nothing: the hyphen's own box is the third a range gives of each.
    await page.evaluate((html) => document.body.insertAdjacentHTML("beforeend", html), HYPHEN);
    await settle(page);
    const brokenAt = await page.evaluate(() =>
      [...document.querySelectorAll("[data-mock-fixture=hyphen] p")].map((p) => {
        const range = document.createRange();
        range.selectNodeContents(p.firstChild);
        return range.getClientRects().length;
      }),
    );
    const hyphens = await checkMock(page, "[data-mock-fixture=hyphen]", { palettes: [["Dark", null]], pixels: true });
    printMockCheck(hyphens, "words broken at a soft hyphen, over a picture");
    const plain = (s) => s.replace(/­/g, "");
    const haloed = hyphens.looks.find((l) => plain(l.text) === "Wonderworker");
    const hyphenRead =
      brokenAt.length === 2 &&
      brokenAt.every((n) => n >= 3) &&
      haloed?.left === false &&
      (haloed?.ratios?.Dark ?? 0) >= 4.5 &&
      !hyphens.failures.some((f) => plain(f.what) === '"Wonderworker"') &&
      hyphens.failures.some((f) => f.check === "contrast" && plain(f.what) === '"Thaumaturgist"' && f.detail.includes("on the pixels under it"));
    await page.evaluate(() => document.querySelector("[data-mock-fixture=hyphen]")?.remove());
    // The Church's red and white on it are allowed by name; a red typed in that is not it still fails.
    await page.evaluate((html) => document.body.insertAdjacentHTML("beforeend", html), RED);
    await settle(page);
    const red = await checkMock(page, "[data-mock-fixture=red]");
    printMockCheck(red, "the Church's red, and a red typed in");
    // A clock that ticks once while it is measured, and a bar that grows every frame.
    await page.evaluate((html) => {
      document.body.insertAdjacentHTML("beforeend", html);
      const clock = document.querySelector("[data-mock-clock]");
      let ticked = false;
      new MutationObserver(() => {
        if (ticked || document.documentElement.getAttribute("dir") !== "rtl") return;
        ticked = true;
        clock.textContent = "-12:02";
      }).observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
      const bar = document.querySelector("[data-mock-grows]");
      let width = 40;
      const grow = () => {
        width = width >= 300 ? 40 : width + 3;
        bar.style.width = `${width}px`;
        requestAnimationFrame(grow);
      };
      requestAnimationFrame(grow);
    }, CLOCK);
    await settle(page);
    const clocks = await checkMock(page, "[data-mock-fixture=clock]", { palettes: [["Dark", null]] });
    printMockCheck(clocks, "a clock that ticks while it is measured, and a bar that grows");
    // A feed's icons: every point read along an outline is counted, over two palettes. Each of the three outlines
    // is read once (240 points each, at the most 720), where the measure once read every drawn path on every
    // palette (51 paths and polygons, twice: 24,480); and the three sparkles drawn are each caught.
    await page.evaluate((html) => {
      for (const f of document.querySelectorAll("[data-mock-fixture]")) f.style.display = "none";
      document.body.insertAdjacentHTML("beforeend", html);
      window.__mockPointsRead = 0;
      const own = SVGGeometryElement.prototype.getPointAtLength;
      SVGGeometryElement.prototype.getPointAtLength = function (...at) {
        window.__mockPointsRead++;
        return own.apply(this, at);
      };
    }, SHAPES);
    await settle(page);
    const shapes = await checkMock(page, "[data-mock-fixture=shapes]", { palettes: PALETTES.slice(0, 2) });
    const pointsRead = await page.evaluate(() => window.__mockPointsRead);
    const shapeSparkles = shapes.failures.filter((f) => f.check === "sparkle").length;
    const shapesOnce = pointsRead <= 3 * 240 && shapeSparkles === 3;
    console.log(`\na feed's icons over two palettes: ${pointsRead} points read along the outlines (at the most 720: each outline once), ${shapeSparkles} of 3 sparkles caught`);
    await page.evaluate(() => document.querySelector("[data-mock-fixture=shapes]")?.remove());
    const clockRight =
      clocks.failures.length === 0 && clocks.unmeasured.length === 1 && clocks.unmeasured[0].startsWith("Arabic: span moved while it was measured");
    const redRight =
      !red.failures.some((f) => f.check === "palette" && f.what === 'button "Pray"') &&
      red.allowed.some((a) => a.startsWith(`palette on button "Pray": the Church's red`)) &&
      red.failures.some((f) => f.check === "palette" && f.what === 'button "Take it down"' && f.detail.startsWith("its ground stays rgb(178, 34, 34)")) &&
      red.failures.some((f) => f.check === "palette" && f.what === 'button "Take it down"' && f.detail.startsWith("its words stay rgb(255, 255, 255)"));
    const lookSaid = lookOnly.unmeasured.length === 4 && lookOnly.failures.length === 0;
    // The third stands past the screen's edge, where no pixel shows it: left "look", for a still and an eye.
    const pastEdge = byPixels.looks.find((l) => l.text === "Words past the screen's edge");
    // Dark words on a light picture beside their own dark mark (a lit point, Updates' find on Prayers' Hours
    // tile): the mark is not the ground under them, so they pass; the measure once read its box as a line.
    const markRead = byPixels.looks.find((l) => l.text === "Dark words beside their own mark");
    const pixelsRead =
      byPixels.looks.length === 4 &&
      markRead?.left === false &&
      !byPixels.failures.some((f) => f.what === '"Dark words beside their own mark"') &&
      byPixels.failures.some((f) => f.check === "contrast" && f.what === '"Grey words on a grey picture"' && f.detail.includes("on the pixels under it")) &&
      !byPixels.failures.some((f) => f.what === '"Light words on a dark picture"') &&
      byPixels.looks.find((l) => l.text === "Light words on a dark picture")?.left === false &&
      pastEdge?.left === true &&
      byPixels.unmeasured.length === 1 &&
      byPixels.unmeasured[0].startsWith(`"Words past the screen's edge": `);
    const caught = new Set(bad.failures.map((f) => f.check));
    const missed = ["contrast", "target", "glyph", "palette", "gold", "stripe", "mirror", "emdash", "rays", "sparkle", "picture", "dashed", "keys", "cut"].filter((c) => !caught.has(c));
    // A Father's own words keep their edition's dash, and a reader's own title its cut, by name; each allowance is said in the report.
    const named = good.allowed.some((a) => a.startsWith("emdash on ")) && good.allowed.some((a) => a.startsWith("cut on "));
    // Both names cut: the tile's, and the card's first line (the saints' byname, the arbiter's word of 2026-11-11).
    const bothCut = bad.failures.filter((f) => f.check === "cut").length >= 2;
    // Words on a gradient (1.9, T4). Caught where they fail: faint words on a tray, and ink at the ink end of a fade
    // from the page's ground to its ink. Passed where they pass, and measured, not skipped: a line on a house tray,
    // and the same ink at the ground end of the same fade, which no measure by the gradient's stops could pass.
    // And still said, never vouched for: words on a picture, words on a fade with a picture laid under it, and
    // words on plain colours with a picture laid behind them by something that is not their parent. Words beside
    // a picture are measured as ever: nothing else in the house's fixture is said.
    const onGradient = (what) => bad.failures.some((f) => f.check === "contrast" && f.what === `"${what}"` && f.detail.includes("on the gradient under it"));
    const fadesCaught = onGradient("Faint on a tray") && onGradient("Ink at the ink end");
    const fadesRead = ["A line on a tray", "And a quieter one under it", "Ink at the ground end"].every((t) => painted.includes(t));
    // Words scrolled out of their row, on a ground that does not scroll with them (2026-11-11, the Search sheet's
    // doors): read at the middle of their row, on the tray behind the row. They stood, by their numbers, past
    // the tray, and were read on the painting's bare paper: the house's two failed at 1.00:1, and the faint one
    // was caught at 1.00:1, which is no measure of it.
    const rowsRead = ["A door in its row", "A door out of its row", "A line in its box", "A line under its fold"].every((t) => painted.includes(t));
    const pastRow = bad.failures.filter((f) => f.check === "contrast" && f.what === '"Faint past its row"');
    const rowsCaught = pastRow.length > 0 && pastRow.every((f) => f.detail.includes("on the gradient under it") && parseFloat(f.detail) > 2 && parseFloat(f.detail) < 4);
    const said = (what, why) => good.unmeasured.includes(`"${what}": ${why}`);
    const picturesSaid =
      said("Words on a picture", "div has a picture") &&
      said("Words over a fade on a picture", "a picture is drawn across it (img)") &&
      said("Words over a picture, on plain colours", "a picture is drawn across it (img)") &&
      good.unmeasured.length === 3;
    const ok = listsWhole && missed.length === 0 && good.failures.length === 0 && named && bothCut && fadesCaught && fadesRead && rowsRead && rowsCaught && picturesSaid && arabic.failures.length === 0 && lookSaid && pixelsRead && redRight && clockRight && motionRead && hyphenRead && shapesOnce;
    console.log(
      ok
        ? "\nself-test: every mistake caught, and the house's own parts pass"
        : `\nself-test FAILED: ${listsWhole ? "" : "a palette of the registry is left out of the lists, or the old lists were not caught; "}${missed.length ? `missed ${missed.join(", ")}` : ""}${good.failures.length ? ` the house's parts failed ${good.failures.length} times` : ""}${named ? "" : " an em dash or a cut allowed by name was not listed"}${bothCut ? "" : " a card's clamped first line was not caught"}${fadesCaught ? "" : " words that fail on a gradient were not caught by it"}${fadesRead ? "" : " words on a gradient were not measured"}${rowsRead && rowsCaught ? "" : " words scrolled out of their row were not read on the ground behind the row"}${picturesSaid ? "" : " words on a picture were not said, or others were said with them"}${arabic.failures.length ? " an Arabic page's bar, right both ways round, was failed" : ""}${lookSaid ? "" : " words on pictures were not said without the pixels pass"}${pixelsRead ? "" : " the pixels pass did not pass the light words, fail the grey ones and leave the words past the edge to the eye"}${redRight ? "" : " the Church's red was failed, or a red typed in was passed"}${clockRight ? "" : " a clock that ticked while it was measured was failed, or a bar that moved was not said"}${motionRead ? "" : " words over light that moves forever were not measured on a held frame and passed"}${hyphenRead ? "" : " words broken at a soft hyphen were not read a line at a time, or the faint ones passed"}${shapesOnce ? "" : " an outline drawn many times was read more than once, or a sparkle drawn among them was not caught"}`,
    );
    return ok;
  } finally {
    await browser.close();
  }
}

async function main(args) {
  if (args[0] === "--self-test") return selfTest();
  // --looks: the fourteen looks as well as the five palettes and the two earned by reading.
  const looks = args.includes("--looks");
  const [where, selector] = args.filter((a) => a !== "--looks");
  if (!where || !selector) {
    console.log('Use: node scripts/mock-check.mjs <path in the app> "<selector>" [--looks]   or   --self-test');
    return false;
  }
  const { go } = await import("./lib/shell-server.mjs");
  const { browser, page } = await openPhone();
  try {
    await go(page, where);
    await page.waitForTimeout(2000);
    return printMockCheck(await checkMock(page, selector, looks ? { palettes: EVERY } : {}), `${where} ${selector}`);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (ok) => process.exit(ok ? 0 : 1),
    (e) => {
      console.error(String(e?.stack ?? e));
      process.exit(1);
    },
  );
}
