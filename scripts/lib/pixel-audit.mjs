// The pixels behind every word.
//
// scripts/mock-check.mjs measures a word against the background colours of
// the boxes it sits in, which is right for the app as it was: its grounds
// were flat. A look lays a picture under the page (1.9), Candlelight a pool
// of light, the prayer page a pool of its own, and a Settings panel a grain:
// something under the words that no box's colour says. On those the checker
// measures nothing and passes. The names under Settings' small pages stood at
// 3.81:1 on Light for that reason until they were measured this way
// (docs/1.9-build/notes/themes-fable.md, section 30).
//
// So this takes the screen twice, once as it is and once with the words taken
// out, and holds each word's own colour to what is really drawn behind it.
//
// The ground a word is held to is the least kind hundredth of its own box:
// the lightest pixels behind light words, the darkest behind dark ones, with
// the outermost one percent left out (a star is a point or two, smaller than
// a letter's stroke, and is not a ground).
//
// What is not a word being read, and is left out:
//  - a word under a bar or a button (the last lines under the reader's dock),
//    and the part of a line that has gone under the bar at the head of the
//    screen or under something floating over the page (the prayer page's
//    "Pray with chant"): its rim is not that line's ground. (Until this was
//    said, a prayer's name with that chip's rim across its last rows was
//    held to the rim and read 4.48:1 where it stands at 5.25:1.)
//  - a line a scroller has scrolled out of its window's sight, or of which
//    less than half is left in sight;
//  - a line in the fade at the foot of the screen (the tab bar's, the
//    reader's dock's), in the foot a look says is its own, or in the fade at
//    the foot of a Plus preview's window: on its way out on every palette;
//  - a small page of Settings (a picture of a page, named by the word under
//    it), and anything marked data-audit-skip;
//  - a word still coming in or going out: inside something whose strength or
//    colour is changing at this moment, once and not for ever (the prayer
//    page's chip as it appears, the chant's question as it is put away). It
//    is measured where it rests. (The first whole walk caught "Pray with
//    chant" a fifth of the way in, at 1.76:1.)
//  - a word taken away or moved while it was being measured. The screen is
//    pictured twice, and something that leaves between the two pictures (the
//    chant's question puts itself away after fifteen seconds) would be held
//    to the page it left behind: "Choose", dark on its white button, read
//    1.24:1 against the dark page where the button had been. Each word's
//    place is asked again after the second picture.
//
// A look's foot, said exactly. The foot is the look's picture again, drawn
// OVER the page's last lines by an eased share: nothing at --foot-clear from
// the screen's foot, a quarter by 72 percent of that, whole at --foot-solid
// (app/globals.css, "A foot"). A line inside it is veiled, and this measure
// cannot see a veil over the ink (it holds the word's own colour to the
// pixels behind it), so it would overstate such a line. Two shares say where
// a line is held:
//  - fadeShare, where the foot begins: a line under it that the page can
//    still bring up clear of the foot is on its way out, and is left out;
//  - footShare, where the foot is a quarter drawn: a line under it is left
//    out wherever the page stands.
// So a line that RESTS in the foot's first quarter, at a page's end, is
// still held, and a line passing through it is not. With no fadeShare the
// quarter line is the only one, as it was.
//
// Used by scripts/prayer-ground-walk.mjs. It needs a built export and a
// browser, so it is a walk's tool, not a unit test's.

import sharp from "sharp";

const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

function words([footShare, within, fadeShare]) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (c) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = "rgba(0, 0, 0, 0)";
    cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const opacityOf = (el) => {
    let o = 1;
    for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  const out = [];
  // Each word's element and where it stood, kept on the page so its place can be asked again
  // once the screen has been pictured (stillThere, below).
  window.__auditSeen = [];
  // The foot of the screen, where the app itself fades a page out under its
  // bars (the reader's dock and its fade, the tab bar): words there are on
  // their way off the screen on every palette.
  const fade = document.querySelector(".pill-fade")?.getBoundingClientRect();
  const bar = document.querySelector("[data-tab-bar]")?.getBoundingClientRect();
  // A palette whose own foot takes the page's last lines (its flames, its
  // sunrise, its flowers) says from where: words below that are giving way.
  const footFrom = Math.min(fade ? fade.top + Math.min(fade.height, 176) * 0.35 : Infinity, bar ? bar.top - 6 : Infinity, footShare ? innerHeight * footShare : Infinity);
  // Where a look's foot begins, and how much further the page can still rise.
  const fadeFrom = fadeShare ? innerHeight * fadeShare : Infinity;
  const rise = Math.max(0, document.documentElement.scrollHeight - innerHeight - scrollY);
  // The bar pinned to the head of the screen: what has gone under it is not on the screen.
  const heads = [];
  for (const hit of document.elementsFromPoint(innerWidth / 2, 2)) {
    for (let p = hit; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const position = getComputedStyle(p).position;
      if (position !== "fixed" && position !== "sticky") continue;
      const r = p.getBoundingClientRect();
      if (r.top <= 1 && r.width >= innerWidth * 0.8 && r.height < innerHeight / 3 && !heads.includes(p)) heads.push(p);
    }
  }
  const headFoot = Math.max(0, ...heads.map((p) => p.getBoundingClientRect().bottom));
  // What is changing its strength or its colour right now, once (not a thing that pulses for ever).
  const turning = document
    .getAnimations()
    .filter((a) => {
      if (a.playState !== "running" || !(a.effect instanceof KeyframeEffect) || !a.effect.target) return false;
      if (a.effect.getComputedTiming().iterations === Infinity) return false;
      return a.effect.getKeyframes().some((k) => "opacity" in k || "color" in k || "visibility" in k);
    })
    .map((a) => a.effect.target);
  /** Does it keep its place while the page scrolls (a bar, a chip over the page)? */
  const pinned = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const position = getComputedStyle(p).position;
      if (position === "fixed" || position === "sticky") return true;
    }
    return false;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.textContent.replace(/\s+/g, " ").trim();
    const el = t.parentElement;
    if (!text || !el || el.closest(".sr-only, svg, [hidden], style, script, .set-mode-page, [data-audit-skip]")) continue;
    if (within && !el.closest(within)) continue;
    if (turning.some((moving) => moving.contains(el))) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden") continue;
    const fg = rgba(cs.color);
    const alpha = fg[3] * opacityOf(el);
    if (alpha < 0.05) continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    const disabled = Boolean(el.closest(":disabled, [aria-disabled='true']"));
    // A line at a time, so a word is held to the ground of its own line.
    // What a frame or a scroller above the word shows of it: a line scrolled out of a window's
    // sight is not on the screen, and must not be held to whatever is drawn where it would be.
    const frames = [];
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (o.overflowX !== "visible" || o.overflowY !== "visible") frames.push(p.getBoundingClientRect());
    }
    const underHead = headFoot > 0 && !heads.some((p) => p.contains(el));
    const moves = fadeFrom < Infinity && !pinned(el);
    for (const r of range.getClientRects()) {
      let x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(innerWidth, r.right), y1 = Math.min(innerHeight, r.bottom);
      for (const f of frames) {
        x0 = Math.max(x0, f.left); y0 = Math.max(y0, f.top); x1 = Math.min(x1, f.right); y1 = Math.min(y1, f.bottom);
      }
      if (underHead) y0 = Math.max(y0, headFoot);
      if (x1 - x0 < 2 || y1 - y0 < 2) continue;
      // Something standing over part of the line (a chip floating over the page): the rows it
      // crosses are not the line's ground. Asked at three places along the line, from each edge in.
      const own = (x, y) => {
        const top = document.elementFromPoint(x, y);
        return !top || top === el || el.contains(top) || top.contains(el);
      };
      const along = [0.25, 0.5, 0.75].map((k) => x0 + (x1 - x0) * k);
      const open = (y) => along.every((x) => own(x, y));
      const middle = (y0 + y1) / 2;
      if (!open(middle)) continue;
      if (!open(y1 - 1)) {
        let [lo, hi] = [middle, y1 - 1];
        while (hi - lo > 1) {
          const at = (lo + hi) / 2;
          if (open(at)) lo = at;
          else hi = at;
        }
        y1 = Math.floor(lo);
      }
      if (!open(y0 + 1)) {
        let [lo, hi] = [y0 + 1, middle];
        while (hi - lo > 1) {
          const at = (lo + hi) / 2;
          if (open(at)) hi = at;
          else lo = at;
        }
        y0 = Math.ceil(hi);
      }
      if (x1 - x0 < 2 || y1 - y0 < 2) continue;
      // Less than half a line left in sight is a line on its way out, not one being read.
      if (y1 - y0 < (r.bottom - r.top) * 0.5) continue;
      // A preview window fades its page out at its own foot (the paywall's TryWindow), as the
      // screen does under its bars: a line in that fade is on its way out on every palette, and
      // the window's rounded corner there shows the sheet behind it, which is not the line's ground.
      const win = el.closest("[data-plus-try-window]");
      const winFade = win?.querySelector(":scope > span[class*='bg-gradient-to-b']")?.getBoundingClientRect();
      if (winFade && y0 > winFade.top + winFade.height * 0.35) continue;
      // A word with a bar or a button standing over it is not on the screen
      // (the last lines under the reader's dock): nothing to read there.
      const top = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
      if (top && top !== el && !el.contains(top) && !top.contains(el)) continue;
      if (y1 > footFrom && !el.closest("[data-tab-bar], .reader-dock, [data-reader-dock]")) continue;
      // In a look's foot, above its quarter: on its way out if the page can still bring it up clear.
      if (moves && y1 > fadeFrom && y1 - rise <= fadeFrom) continue;
      const box = el.getBoundingClientRect();
      window.__auditSeen.push([el, box.left, box.top]);
      out.push({ text: text.slice(0, 40), fg: fg.slice(0, 3), alpha, large, disabled, x0, y0, x1, y1 });
    }
  }
  return out;
}

/** For each word listed: is its element still on the page, drawn, and where it stood? Runs in the page. */
function stillThere() {
  const seen = window.__auditSeen ?? [];
  delete window.__auditSeen;
  return seen.map(([el, left, top]) => {
    if (!el.isConnected || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const box = el.getBoundingClientRect();
    return Math.abs(box.left - left) < 1.5 && Math.abs(box.top - top) < 1.5;
  });
}

/**
 * Every word on the screen against the pixels behind it.
 *
 * @param page       a Playwright page, as scripts/mock-check.mjs's openPhone gives it
 * @param footShare  where a look's own foot begins to take the page's last lines, as a share of the
 *                   screen's height (scripts/scene-check.mjs); words below it are giving way
 * @param fadeShare  where that foot begins, as a share of the screen's height: a line between the two
 *                   that the page can still bring up clear of the foot is left out (see the head note)
 * @param every      also return each word measured, as { text, ratio, large }
 * @param within     a selector: only words inside it are measured
 * @returns { words, lowest, lowestText, small, large, short, all }: how many were measured, the lowest
 *          ratio and its words, the lowest of the small type (floor 4.5:1) and of the large (floor 3:1)
 *          each as { ratio, text }, and those under their floor with where and on what
 */
export async function audit(page, { footShare = null, fadeShare = null, every = false, within = null } = {}) {
  const all = [];
  const small = { ratio: Infinity, text: "" };
  const largest = { ratio: Infinity, text: "" };
  const list = await page.evaluate(words, [footShare, within, fadeShare]);
  const seen = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const hide = await page.addStyleTag({
    content: "*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; transition: none !important; }",
  });
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  const shot = await page.screenshot();
  const stayed = await page.evaluate(stillThere);
  await hide.evaluate((n) => n.remove());
  const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const scale = info.width / (await page.evaluate(() => innerWidth));
  const short = [];
  let lowest = Infinity;
  let lowestText = "";
  let measured = 0;
  for (const [i, w] of list.entries()) {
    if (w.disabled || !stayed[i]) continue;
    const X0 = Math.floor(w.x0 * scale), X1 = Math.min(info.width, Math.ceil(w.x1 * scale));
    const Y0 = Math.floor(w.y0 * scale), Y1 = Math.min(info.height, Math.ceil(w.y1 * scale));
    const px = [];
    for (let y = Y0; y < Y1; y++) {
      for (let x = X0; x < X1; x++) {
        const i = (y * info.width + x) * info.channels;
        px.push([lum(data[i], data[i + 1], data[i + 2]), data[i], data[i + 1], data[i + 2]]);
      }
    }
    if (px.length < 4) continue;
    // Drawn at all? The same box with its words in: if nothing differs, the
    // word is under something and is not on the screen.
    let differs = 0;
    for (let y = Y0; y < Y1 && differs < 40; y++) {
      for (let x = X0; x < X1; x++) {
        const i = (y * info.width + x) * info.channels;
        if (Math.abs(seen.data[i] - data[i]) + Math.abs(seen.data[i + 1] - data[i + 1]) + Math.abs(seen.data[i + 2] - data[i + 2]) > 36) differs++;
      }
    }
    if (differs < 3) continue;
    px.sort((a, b) => a[0] - b[0]);
    const mean = px.reduce((s, p) => s + p[0], 0) / px.length;
    // The word's colour over a ground: it is lighter than the ground or darker.
    const over = (g) => w.fg.map((v, i) => v * w.alpha + g[i] * (1 - w.alpha));
    const mid = px[Math.floor(px.length / 2)];
    const shownMid = over(mid.slice(1));
    const lightWords = lum(...shownMid) >= mean;
    const worst = lightWords ? px[Math.min(px.length - 1, Math.floor(px.length * 0.99))] : px[Math.floor(px.length * 0.01)];
    const shown = over(worst.slice(1));
    const [a, b] = [lum(...shown), worst[0]];
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    measured++;
    if (ratio < lowest) {
      lowest = ratio;
      lowestText = w.text;
    }
    const kind = w.large ? largest : small;
    if (ratio < kind.ratio) {
      kind.ratio = ratio;
      kind.text = w.text;
    }
    if (every) all.push({ text: w.text, ratio, large: w.large });
    const need = w.large ? 3 : 4.5;
    if (ratio + 1e-9 < need) short.push({ text: w.text, ratio, need, at: [Math.round(w.x0), Math.round(w.y0)], ground: worst.slice(1), fg: w.fg, alpha: Number(w.alpha.toFixed(3)) });
  }
  return { words: measured, lowest, lowestText, small, large: largest, short, all };
}
