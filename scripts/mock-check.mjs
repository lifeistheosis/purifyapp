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
//   emdash       no em dash in a word, a label or a placeholder
// What no measure can see is printed after it, to be answered by eye.
//
// A piece meant to break one of these says so on itself, with its reason,
// and the report lists every such allowance:
//   data-mock-allow="stripe" data-mock-why="the reading progress bar"
//
// Use, from a mockup's own script (it leaves the page as it found it):
//   import { checkMock, printMockCheck } from "./mock-check.mjs";
//   const ok = printMockCheck(await checkMock(page, "[data-journal-composer]"), "the note sheet");
// On a page of the native export (npm run build:android first), as it loads:
//   node scripts/mock-check.mjs /journal/ main
// Its own proof, the first drawings' mistakes caught and a house piece passed:
//   node scripts/mock-check.mjs --self-test

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { isGoldTone, oklchOf } from "../lib/ui/goldTone.ts";

/** The five palettes, as AppThemeController wears them on <html>. */
export const PALETTES = [
  ["Dark", null],
  ["Light", "parchment"],
  ["Black", "black"],
  ["Candlelight", "candlelight"],
  ["Monastery", "monastery"],
];

export const CHECKS = ["contrast", "placeholder", "target", "glyph", "palette", "gold", "stripe", "mirror", "emdash"];

/** What a measure cannot see. */
export const BY_EYE = [
  "Built from the app's own component for the job, rendered from the export; only the proposed change is new.",
  "Icons from components/ui/icons. Plus shown with its mark, and never promised to every reader.",
  "Sample words plain: no reading of Scripture or of a Father written for the picture.",
  "Existing words (i18n keys) first; a new line in the house voice (docs/brand/voice.md).",
];

// ── In the page ─────────────────────────────────────────────────────────

/** What the part of the page named by `selector` shows, on the palette it wears now. */
function look(selector) {
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
    }
    return null;
  };
  const nameOf = (el) => {
    const words = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim();
    return `${el.tagName.toLowerCase()}${words ? ` "${words.slice(0, 32)}"` : ""}`;
  };
  const opacityOf = (el) => {
    let o = 1;
    for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  // The ground a thing sits on: its own and its parents' backgrounds, laid
  // one over another down to the first that is opaque.
  const groundOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
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
    if (hasText || e.tagName.toLowerCase() === "svg") p.color = rgba(cs.color);
    const bg = rgba(cs.backgroundColor);
    if (bg[3] >= 0.25) p.bg = bg;
    const border = ["Top", "Right", "Bottom", "Left"]
      .filter((s) => cs[`border${s}Style`] !== "none" && parseFloat(cs[`border${s}Width`]) > 0)
      .map((s) => rgba(cs[`border${s}Color`]))
      .find((c) => c[3] >= 0.25);
    if (border) p.border = border;
    return p;
  });

  const stripes = [];
  for (const e of all) {
    if (!shown(e)) continue;
    const cs = getComputedStyle(e);
    const width = (s) => (cs[`border${s}Style`] === "none" ? 0 : parseFloat(cs[`border${s}Width`]));
    const [top, right, bottom, left] = ["Top", "Right", "Bottom", "Left"].map(width);
    const oneSide = (left > 0) !== (right > 0) && top === 0 && bottom === 0 && (e.innerText || "").trim().length > 0;
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

  const said = [root.innerText, ...[root, ...root.querySelectorAll("[aria-label], [placeholder], [title], [alt]")].flatMap((e) => ["aria-label", "placeholder", "title", "alt"].map((a) => e.getAttribute(a) || ""))].join("\n");

  return { words, placeholders, controls, paints, stripes, emDash: said.includes("\u2014") };
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
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || pinned(e)) continue;
    const words = (e.getAttribute("aria-label") || e.innerText || "").replace(/\s+/g, " ").trim();
    index.set(e, out.length);
    out.push({ name: `${e.tagName.toLowerCase()}${words ? ` "${words.slice(0, 32)}"` : ""}`, x: across(r), parent: parentOf(e), allow: allowed(e) });
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.textContent.replace(/\s+/g, " ").trim();
    if (!text || !t.parentElement || t.parentElement.closest("svg") || pinned(t.parentElement)) continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    out.push({ name: `the words "${text.slice(0, 32)}"`, x: across(r), parent: index.get(t.parentElement) ?? parentOf(t.parentElement), allow: allowed(t.parentElement) });
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
export async function checkMock(page, selector, { allowGold = false } = {}) {
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
    return { mode: h.getAttribute("data-reading-mode"), dir: h.getAttribute("dir") };
  });
  const shots = {};
  try {
    for (const [palette, mode] of PALETTES) {
      await page.evaluate((m) => {
        const h = document.documentElement;
        if (m) h.setAttribute("data-reading-mode", m);
        else h.removeAttribute("data-reading-mode");
      }, mode);
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
          const r = contrast(w.fg, w.alpha, w.ground.rgb);
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

    const dark = shots.Dark;
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
      const q = light.paints[i];
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
    if (dark.emDash) fail("emdash", null, "the words", "an em dash; use a comma, a colon or a full stop");

    // Arabic: everything is where it was, measured from the other side.
    await page.evaluate((m) => {
      const h = document.documentElement;
      if (m) h.setAttribute("data-reading-mode", m);
      else h.removeAttribute("data-reading-mode");
    }, before.mode);
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
    await page.evaluate((b) => {
      const h = document.documentElement;
      if (b.mode) h.setAttribute("data-reading-mode", b.mode);
      else h.removeAttribute("data-reading-mode");
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

/** A phone on the native export, as the walk opens one (for a mockup's own script). */
export async function openPhone() {
  const { chromium } = await import("playwright");
  const { NATIVE_UA, serveLikeTheShell } = await import("./lib/shell-server.mjs");
  const OUT = path.resolve("out");
  if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first");
  // The cloud sessions carry their own Chromium (CLAUDE.md's environment); elsewhere Playwright's.
  const own = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript(() => {
    localStorage.setItem("purify:onboarded", "3");
    localStorage.setItem("purify:whatsNewSeen", "99");
  });
  await serveLikeTheShell(ctx, OUT, {});
  return { browser, page: await ctx.newPage() };
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
</div>`;

async function selfTest() {
  const { go } = await import("./lib/shell-server.mjs");
  const { browser, page } = await openPhone();
  try {
    await go(page, "/");
    await page.waitForTimeout(1500);
    await page.evaluate((html) => document.body.insertAdjacentHTML("beforeend", html), FIXTURES);
    await settle(page);
    const bad = await checkMock(page, "[data-mock-fixture=bad]");
    printMockCheck(bad, "the first drawings' mistakes");
    const good = await checkMock(page, "[data-mock-fixture=good]");
    printMockCheck(good, "the same parts from the house's classes");
    const caught = new Set(bad.failures.map((f) => f.check));
    const missed = ["contrast", "target", "glyph", "palette", "gold", "stripe", "mirror", "emdash"].filter((c) => !caught.has(c));
    const ok = missed.length === 0 && good.failures.length === 0;
    console.log(
      ok
        ? "\nself-test: every mistake caught, and the house's own parts pass"
        : `\nself-test FAILED: ${missed.length ? `missed ${missed.join(", ")}` : ""}${good.failures.length ? ` the house's parts failed ${good.failures.length} times` : ""}`,
    );
    return ok;
  } finally {
    await browser.close();
  }
}

async function main(args) {
  if (args[0] === "--self-test") return selfTest();
  const [where, selector] = args;
  if (!where || !selector) {
    console.log('Use: node scripts/mock-check.mjs <path in the app> "<selector>"   or   --self-test');
    return false;
  }
  const { go } = await import("./lib/shell-server.mjs");
  const { browser, page } = await openPhone();
  try {
    await go(page, where);
    await page.waitForTimeout(2000);
    return printMockCheck(await checkMock(page, selector), `${where} ${selector}`);
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
