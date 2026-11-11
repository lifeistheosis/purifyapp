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
//                palettes (WCAG AA: 4.5:1, or 3:1 for large text)
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
// The same, held on the seventeen looks as well as the five palettes (1.9):
//   node scripts/mock-check.mjs /journal/ main --looks
// Its own proof, the first drawings' mistakes caught and a house piece passed:
//   node scripts/mock-check.mjs --self-test

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
 * The looks (1.9): the seventeen Plus themes of the registry, each worn as
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

export const CHECKS = ["contrast", "placeholder", "target", "glyph", "palette", "gold", "stripe", "mirror", "emdash", "rays", "sparkle", "picture", "dashed", "keys"];

/** What a measure cannot see. */
export const BY_EYE = [
  "Built from the app's own component for the job, rendered from the export; only the proposed change is new.",
  "Icons from components/ui/icons. Plus shown with its mark, and never promised to every reader.",
  "Sample words plain: no reading of Scripture or of a Father written for the picture.",
  "Existing words (i18n keys) first; a new line in the house voice (docs/brand/voice.md).",
];

// ── In the page ─────────────────────────────────────────────────────────

/** What the part of the page named by `selector` shows, on the palette it wears now. */
function look(arg) {
  // A selector, or { selector, only: "stripe" } for the stripe measure alone.
  const { selector, only } = typeof arg === "string" ? { selector: arg, only: null } : arg;
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
  // The ground a thing sits on: a face drawn behind its words, or its own
  // and its parents' backgrounds, laid one over another down to the first
  // that is opaque.
  const groundOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      if (!layers.length) {
        const face = faceOf(n);
        if (face) return face;
      }
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { unknown: `${n.tagName.toLowerCase()} has a picture or a gradient` };
      const c = rgba(cs.backgroundColor);
      if (c[3] > 0) {
        layers.push(c);
        if (c[3] >= 0.999) break;
      }
    }
    let g = [255, 255, 255];
    for (const c of layers.reverse()) g = g.map((v, i) => c[i] * c[3] + v * (1 - c[3]));
    return { rgb: g };
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
  if (only === "stripe") return { words: [], placeholders: [], controls: [], paints: [], stripes, rays: [], sparkles: [], pictures: [], dashedBoxes: [], keyHints: [], emDash: false, dashes: [] };

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
      ground: groundOf(el),
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
      return { text: f.placeholder.slice(0, 48), fg, alpha: fg[3] * opacityOf(f), ground: groundOf(f), large: largeText(getComputedStyle(f)), allow: allowance(f, "placeholder") };
    });

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
  for (const g of root.querySelectorAll("path, polygon")) {
    if (g.getClientRects().length === 0 || !fourPoints(g)) continue;
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
    if (!shown(img) || loading(img)) continue;
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

  return { words, placeholders, controls, paints, stripes, rays, sparkles, pictures, dashedBoxes, keyHints, emDash: labels.includes("\u2014") || dashes.some((d) => !d.allow), dashes: dashes.filter((d) => d.allow) };
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
export async function checkMock(page, selector, { allowGold = false, palettes = PALETTES } = {}) {
  const failures = [];
  const unmeasured = [];
  const allowed = new Set();
  const fail = (check, palette, what, detail) => failures.push({ check, palette, what, detail });
  const allow = (check, what, why) => allowed.add(`${check} on ${what}: ${why}`);

  const before = await page.evaluate(() => {
    const h = document.documentElement;
    // Colours change in steps of their own (body has a 0.35s transition);
    // the measure wants where they end.
    const still = document.createElement("style");
    still.setAttribute("data-mock-check", "");
    still.textContent = "*, *::before, *::after { transition: none !important; }";
    document.head.appendChild(still);
    return { mode: h.getAttribute("data-reading-mode"), look: h.getAttribute("data-look"), dir: h.getAttribute("dir") };
  });
  const shots = {};
  try {
    for (const [palette, mode, worn] of palettes) {
      await wear(page, mode, worn);
      await settle(page);
      const s = await page.evaluate(look, selector);
      if (!s) throw new Error(`nothing on the page answers ${selector}`);
      shots[palette] = s;
      for (const [check, list] of [["contrast", s.words], ["placeholder", s.placeholders]]) {
        for (const w of list) {
          if (w.disabled) continue;
          if (w.ground.unknown) {
            if (palette === "Dark") unmeasured.push(`"${w.text}": ${w.ground.unknown}`);
            continue;
          }
          const need = w.large ? 3 : 4.5;
          // A face drawn as a gradient counts by its worst stop.
          const r = Math.min(...(w.ground.rgbs ?? [w.ground.rgb]).map((g) => contrast(w.fg, w.alpha, g)));
          if (r + 1e-9 >= need) continue;
          if (w.allow) allow(check, `"${w.text}"`, w.allow);
          else fail(check, palette, `"${w.text}"`, `${r.toFixed(2)}:1, needs ${need}:1`);
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
    if (dark.emDash) fail("emdash", null, "the words", "an em dash; use a comma, a colon or a full stop");
    for (const d of dark.dashes) allow("emdash", d.name, d.allow);

    // Arabic: everything is where it was, measured from the other side. The
    // page is measured from left to right whatever it was in, so a page
    // already in Arabic or Urdu is compared with itself turned round, not
    // with itself (2026-11-11: every row of the language sheet in Arabic
    // "stayed put", having been measured twice the same way round).
    await wear(page, before.mode, before.look);
    await page.evaluate(() => document.documentElement.setAttribute("dir", "ltr"));
    await settle(page);
    const ltr = await page.evaluate(boxes, selector);
    await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
    await settle(page);
    const rtl = await page.evaluate(boxes, selector);
    if (ltr && rtl && ltr.out.length === rtl.out.length) {
      // Where a parent is placed wrong, its children go with it: only the
      // parent is said.
      const wrong = new Set();
      ltr.out.forEach((a, i) => {
        const b = rtl.out[i];
        if (a.physicalAlign) {
          if (a.allow) allow("mirror", a.name, a.allow);
          else fail("mirror", null, a.name, `its text is set ${a.physicalAlign}, not start or end, so it stays ${a.physicalAlign} in Arabic`);
        }
        const mirrored = Math.abs(b.x[0] - (rtl.width - a.x[1])) <= 1.5 && Math.abs(b.x[1] - (rtl.width - a.x[0])) <= 1.5;
        if (mirrored) return;
        wrong.add(i);
        if (wrong.has(a.parent)) return;
        if (a.allow) allow("mirror", a.name, a.allow);
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
      document.querySelector("style[data-mock-check]")?.remove();
    }, before);
    await settle(page);
  }
  return { selector, failures, unmeasured, allowed: [...allowed], byEye: BY_EYE };
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
export async function openPhone({ scale = 1, set = {}, browser: given } = {}) {
  const { chromium } = await import("playwright");
  const { NATIVE_UA, serveLikeTheShell } = await import("./lib/shell-server.mjs");
  const OUT = path.resolve("out");
  if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first");
  // The cloud sessions carry their own Chromium (CLAUDE.md's environment); elsewhere Playwright's.
  const own = "/opt/pw-browsers/chromium";
  const browser = given ?? (await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {}));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...set });
  await serveLikeTheShell(ctx, OUT, {});
  return { browser, ctx, page: await ctx.newPage() };
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
  <blockquote lang="en" data-mock-allow="emdash" data-mock-why="a Father's own words, as his edition prints them" class="mt-3 font-serif text-body italic leading-[1.6] text-paper/85">Chapter I.\u2014Introduction. Reason for writing</blockquote>
</div>`;

async function selfTest() {
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
    const caught = new Set(bad.failures.map((f) => f.check));
    const missed = ["contrast", "target", "glyph", "palette", "gold", "stripe", "mirror", "emdash", "rays", "sparkle", "picture", "dashed", "keys"].filter((c) => !caught.has(c));
    // A Father's own words keep their edition's dash, by name; the allowance is said in the report.
    const named = good.allowed.some((a) => a.startsWith("emdash on "));
    const ok = missed.length === 0 && good.failures.length === 0 && named;
    console.log(
      ok
        ? "\nself-test: every mistake caught, and the house's own parts pass"
        : `\nself-test FAILED: ${missed.length ? `missed ${missed.join(", ")}` : ""}${good.failures.length ? ` the house's parts failed ${good.failures.length} times` : ""}${named ? "" : " an em dash allowed by name was not listed"}`,
    );
    return ok;
  } finally {
    await browser.close();
  }
}

async function main(args) {
  if (args[0] === "--self-test") return selfTest();
  // --looks: the seventeen looks as well as the five palettes.
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
    return printMockCheck(await checkMock(page, selector, looks ? { palettes: [...PALETTES, ...LOOKS] } : {}), `${where} ${selector}`);
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
