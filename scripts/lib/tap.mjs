// How a walk taps a phone's screen, shared by the tap walk (scripts/tap-walk.mjs)
// and the motion walk (scripts/motion-walk.mjs), so the two find the same
// controls, reach them the same way and touch them with the same finger. Moved
// here unchanged from the tap walk (2026-11-13), where each was learned: the
// first touch before the scroll, the control found again when the page redraws
// it, the aim at a wrapped link's own words, the screen as it first stands for
// every tap.

import { go } from "./shell-server.mjs";

/** Mark the controls a finger can tap on this screen, in reading order, and say what each is. */
export function markControls(max) {
  const CONTROL =
    "button, a[href], [role=button], [role=link], [role=tab], [role=radio], [role=checkbox], [role=switch], [role=menuitem], [role=option], summary, input[type=checkbox], input[type=radio]";
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // checkVisibility: not inside something shut (a closed details draws nothing, though its
    // links still answer for a place on the page).
    if (!(r.width >= 8 && r.height >= 8 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05 && el.checkVisibility?.() !== false)) return false;
    // A screen reader's own words (a heading kept 1px square, clipped): a link inside one
    // reads 18 by 467 on its own as its words wrap, and no finger meets it (Fable Themes,
    // 2026-11-11, the reading room's featured work).
    for (let q = el; q && q !== document.body; q = q.parentElement) {
      const qs = getComputedStyle(q);
      const b = q.getBoundingClientRect();
      if ((qs.clip && qs.clip !== "auto") || ((qs.overflowX === "hidden" || qs.overflowX === "clip") && (b.width < 8 || b.height < 8))) return false;
    }
    return true;
  };
  const out = [];
  for (const el of document.querySelectorAll("[data-tapwalk]")) el.removeAttribute("data-tapwalk");
  const seen = new Set();
  for (const el of document.querySelectorAll(CONTROL)) {
    if (seen.has(el) || !shown(el)) continue;
    if (el.closest("[inert], [aria-hidden='true']")) continue;
    if (el.matches(":disabled, [aria-disabled='true']")) continue;
    // A control inside another is the outer one's to tap.
    if (el.parentElement?.closest(CONTROL)) continue;
    const href = el.getAttribute("href") || "";
    if (el.tagName === "A") {
      if (/^(mailto:|tel:|sms:|javascript:)/i.test(href)) continue;
      if (el.hasAttribute("download")) continue;
      if (/^https?:\/\//i.test(href) && !href.startsWith(location.origin)) continue;
      if (el.getAttribute("target") === "_blank") continue;
    }
    seen.add(el);
    // innerText is empty for what the browser has not drawn yet (content-visibility: auto), so textContent then.
    const words = (el.getAttribute("aria-label") || el.innerText.trim() || el.textContent || el.getAttribute("title") || "").replace(/\s+/g, " ").trim();
    out.push({ el, name: `${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[${el.getAttribute("role")}]` : ""}${words ? ` "${words.slice(0, 40)}"` : ""}`, href });
  }
  // Every control is counted, the first `max` in reading order are walked: the record says how many were left.
  const walked = out.slice(0, max);
  walked.forEach((c, i) => c.el.setAttribute("data-tapwalk", String(i)));
  return { found: out.length, controls: walked.map(({ name, href }, i) => ({ i, name, href })) };
}

export async function tapAt(cdp, x, y) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await new Promise((r) => setTimeout(r, 60));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/**
 * Where a finger goes on a control: the middle of its largest piece. A link that wraps across two
 * lines has a box whose middle lies on the sentence's other words (About's "Support page",
 * 2026-11-11); a reader taps the link's own words.
 */
export async function aimOf(handle, box) {
  const aim = await handle
    .evaluate((el) => {
      const pieces = [...el.getClientRects()].filter((r) => r.width >= 1 && r.height >= 1);
      if (pieces.length < 2) return null;
      const big = pieces.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
      return { x: big.left + big.width / 2, y: big.top + big.height / 2 };
    })
    .catch(() => null);
  return aim ?? { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * The screen as it first stands, for every tap: what the device keeps put back as it was
 * when the app first opened, a new document from the front door, and the app's own way to
 * the screen. A soft trip alone left the last tap's sheet or menu open over the next one,
 * which no reader meets: they close it, or it closes as they go.
 */
export async function fresh(page, at, kept) {
  await page
    .evaluate((k) => {
      try {
        localStorage.clear();
        for (const [key, value] of k) localStorage.setItem(key, value);
        sessionStorage.clear();
      } catch {}
    }, kept)
    .catch(() => {});
  await page.goto("about:blank");
  await go(page, at, { timeout: 15000 });
  await page.waitForTimeout(1200);
}

/**
 * A first touch, then quiet: no change for 450ms, up to 3s. The touch goes where no control,
 * label or field stands within 48px: a browser carries a touch beside a control onto it (its
 * touch adjustment), and the first walk's edge touch ticked Sign up's agreement box that way.
 * Where no such place is on the screen, the page is told of a touch without one (the events a
 * first touch sends), which is all its first-touch work listens for.
 */
export async function firstTouch(page, cdp) {
  const spot = await page.evaluate((controls) => {
    const near = [...document.querySelectorAll(controls)]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0 && r.bottom > -48 && r.top < innerHeight + 48);
    const clear = (x, y) => near.every((r) => x < r.left - 48 || x > r.right + 48 || y < r.top - 48 || y > r.bottom + 48);
    for (const f of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
      for (const x of [3, innerWidth - 3, Math.round(innerWidth / 2)]) {
        const y = Math.round(innerHeight * f);
        const hit = document.elementFromPoint(x, y);
        if (hit && !hit.closest(controls) && !hit.closest("[role=dialog], [data-screen-edge]") && clear(x, y)) return { x, y };
      }
    }
    return null;
  }, "button, a[href], summary, label, input, textarea, select, [contenteditable], [role=button], [role=link], [role=tab], [role=radio], [role=checkbox], [role=switch], [role=menuitem], [role=option], [tabindex]:not([tabindex='-1'])");
  if (spot) await tapAt(cdp, spot.x, spot.y);
  else {
    await page.evaluate(() => {
      const at = document.body;
      for (const type of ["pointerdown", "pointerup"]) at.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: "touch", isPrimary: true }));
      try {
        const t = new Touch({ identifier: 1, target: at, clientX: 1, clientY: 1 });
        at.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [t], changedTouches: [t] }));
        at.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [t] }));
      } catch {}
    });
  }
  await page.evaluate(async () => {
    let n = 0;
    const seen = new MutationObserver((list) => (n += list.length));
    seen.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    const t0 = performance.now();
    let last = -1;
    let quiet = 0;
    while (performance.now() - t0 < 3000 && quiet < 3) {
      await new Promise((r) => setTimeout(r, 150));
      quiet = n === last ? quiet + 1 : 0;
      last = n;
    }
    seen.disconnect();
  });
}

/**
 * Scroll a control into reach and wait until it stands still (two looks 100ms apart within a
 * pixel, up to two seconds). A control whose node the page replaced as it was reached (the same
 * name at the same place in the order, marked again) is found again; "redrawn" when it never
 * stays.
 */
export async function reach(page, c, max) {
  let last = null;
  let still = 0;
  for (let t = 0; t < 20; t++) {
    const now = await page.evaluate((i) => {
      const el = document.querySelector(`[data-tapwalk="${i}"]`);
      if (!el) return null;
      if (!el.dataset.tapwalkReached) {
        el.dataset.tapwalkReached = "1";
        el.scrollIntoView({ block: "center", inline: "center" });
      }
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y };
    }, c.i);
    if (!now) {
      const again = (await page.evaluate(markControls, max)).controls;
      if (!again[c.i] || again[c.i].name !== c.name) return "redrawn";
      last = null;
      still = 0;
    } else {
      still = last && Math.abs(now.x - last.x) <= 1 && Math.abs(now.y - last.y) <= 1 ? still + 1 : 0;
      if (still >= 2) return "still";
      last = now;
    }
    await page.waitForTimeout(100);
  }
  return (await page.$(`[data-tapwalk="${c.i}"]`)) ? "moving" : "redrawn";
}
