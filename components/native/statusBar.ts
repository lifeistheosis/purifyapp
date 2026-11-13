// The phone's status bar follows the page: the strip behind it, and the
// colour of the clock and battery marks on it. NativeBridge starts this once
// the status bar plugin has loaded. The rule is lib/reader/statusBarColor.ts,
// which says why; this file only asks the page and the phone the questions
// that rule needs, and tells the phone the answer.
//
// What is asked, and when:
//
//   - The strip is painted the page colour of the palette the app is WEARING
//     (a look the gate has put down, or Candlelight at Vespers over a
//     reader's own palette, is not what is stored), whenever the root's two
//     palette attributes change. Only Android 14 and older shows it.
//   - The phone is then asked what colour its strip is. If it took the
//     colour, the strip is the app's own and the marks suit it. That is all
//     an Android 14 phone ever needs.
//   - Otherwise the page may lie under the bar (the iPhone, newer Android).
//     Then the marks suit what the page shows at the bar's place, and that
//     is looked at again when it could have changed: the page's parts come
//     and go, a sheet slides in, the app comes back to the front. Only while
//     a light palette is worn: on a dark one the marks are light, as they
//     have always been, and nothing is watched.
//
// A reader on a dark palette pays for none of the watching, and neither does
// any phone whose strip is the app's own.

import { BAR_NIGHT, barPlace, behindTheBar, groundOf, statusBarColor, statusBarMarks, type BarLayer, type BarMarks, type BarPlace } from "@/lib/reader/statusBarColor";
import { SWITCH_ATTR, barStep } from "@/lib/reader/themeSwitch";

/** The three things the status bar plugin is asked for. */
export type BarPhone = {
  platform: "android" | "ios";
  /** Paint the strip (Android 14 and older; elsewhere it draws nothing). */
  paintStrip: (color: string) => Promise<void>;
  /** The strip's colour as the phone gives it, where it gives one. */
  stripNow: () => Promise<string | null>;
  /** Draw the marks light or dark. */
  drawMarks: (marks: BarMarks) => Promise<void>;
};

/** How long the page is left to settle before the bar's place is looked at again. */
const SETTLE_MS = 250;

/** Any colour the browser writes (rgb, oklab, color-mix's own form) as red, green, blue and how solid it is. */
function colourReader(): (css: string) => [number, number, number, number] | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return (css) => {
    if (!ctx) return null;
    ctx.clearRect(0, 0, 1, 1);
    // A colour the canvas cannot read leaves the fill as it was: the clear one set first.
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
}

const PICTURE = /^(img|picture|video|canvas|svg|iframe|object|embed)$/i;
const COLOUR_IN_GRADIENT = /(?:rgba?|hsla?|oklab|oklch|lab|lch|color)\([^()]*\)|#[0-9a-f]{3,8}\b/gi;

/**
 * What the page stacks at a point, topmost first, as the rule reads it (groundOf).
 *
 * The browser's own stack at a point leaves out what a tap passes through.
 * One such thing matters here: a surface that is dark on every palette and
 * still drawn while it lets taps through, as the launch frame is for the
 * half second it fades over the first screen. Where one of those covers the
 * point it is put first: nothing says what it lies over, and the night is
 * the answer that keeps the marks light.
 */
export function layersAt(x: number, y: number): BarLayer[] {
  const read = colourReader();
  const opacityOf = (el: Element) => {
    let opacity = 1;
    for (let p: Element | null = el; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity);
    return Number.isFinite(opacity) ? opacity : 1;
  };
  const passedThrough: BarLayer[] = [];
  for (const el of document.querySelectorAll(".dark-island")) {
    const box = el.getBoundingClientRect();
    if (box.left > x || box.right < x || box.top > y || box.bottom < y) continue;
    const cs = getComputedStyle(el);
    if (cs.pointerEvents !== "none" || cs.visibility === "hidden") continue;
    passedThrough.push({ island: true, opacity: opacityOf(el) });
  }
  return passedThrough.concat(document.elementsFromPoint(x, y).map((el): BarLayer => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden") return { opacity: 0 };
    const opacity = opacityOf(el);
    if (el.closest(".dark-island")) return { island: true, opacity };
    if (PICTURE.test(el.tagName) || el.closest("svg")) return { picture: true, opacity };
    const image = cs.backgroundImage;
    // A background that is a file is a picture; a gradient is its colours.
    if (image.includes("url(")) return { picture: true, opacity };
    const gradient = image === "none" ? [] : (image.match(COLOUR_IN_GRADIENT) ?? []).map(read).filter((c): c is [number, number, number, number] => c !== null);
    return { color: read(cs.backgroundColor), gradient, opacity };
  }));
}

/** The room the page is given under the status bar, in px, kept current by an element that is exactly that tall. */
function insetProbe(): HTMLElement {
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.setAttribute("data-bar-inset", "");
  probe.style.cssText = "position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top, 0px);visibility:hidden;pointer-events:none;z-index:-1";
  document.body.appendChild(probe);
  return probe;
}

/**
 * Keep the status bar with the page. Returns the way to stop.
 */
export function followStatusBar(phone: BarPhone): () => void {
  const root = document.documentElement;
  const probe = insetProbe();
  let stopped = false;
  // Each asking has a number, and an answer that comes back after a newer asking is dropped.
  let turn = 0;
  // What the phone was last told, and what is known of it: light marks, as the app starts.
  let drawn: BarMarks = "light";
  let place: BarPlace = "unknown";
  let asked = BAR_NIGHT;
  let settle: ReturnType<typeof setTimeout> | null = null;

  const inset = () => probe.getBoundingClientRect().height;
  let room = inset();
  const lightWorn = () => root.getAttribute("data-reading-mode") === "parchment";

  /** What the page shows at the middle of the bar's place. */
  const under = (): string | null => {
    const tall = inset();
    if (!(tall > 0)) return null;
    try {
      return groundOf(layersAt(Math.round(window.innerWidth / 2), Math.max(1, Math.round(tall / 2))));
    } catch {
      return null;
    }
  };

  /** The marks for what is known now. The page is asked only where it lies under the bar, and only on a light palette. */
  const marks = (): BarMarks => statusBarMarks(behindTheBar(place, asked, place !== "page" ? null : lightWorn() ? under() : BAR_NIGHT));

  const draw = async (next: BarMarks) => {
    if (next === drawn) return;
    drawn = next;
    await phone.drawMarks(next).catch(() => {});
  };

  /** The whole question: paint the strip, ask the phone what it is, and draw the marks that suit what is behind them. */
  const paint = async () => {
    const mine = ++turn;
    const want = statusBarColor(getComputedStyle(root).getPropertyValue("--color-night"));
    await phone.paintStrip(want).catch(() => {});
    if (stopped || mine !== turn) return;
    const strip = await phone.stripNow().catch(() => null);
    if (stopped || mine !== turn) return;
    asked = want;
    place = barPlace({ platform: phone.platform, asked, strip, inset: inset() });
    await draw(marks());
  };

  /** Only the marks, when the page under the bar may have changed and nothing else has. */
  const look = () => {
    settle = null;
    if (stopped || place !== "page") return;
    void draw(marks());
  };
  const lookSoon = () => {
    if (stopped || settle !== null || place !== "page" || !lightWorn()) return;
    settle = setTimeout(look, SETTLE_MS);
  };

  void paint();
  // A palette picked, Candlelight put on at sunset, a look put down by the gate: each lands on these two attributes.
  // One the page is cross-fading into is painted when the new picture is half in, with the page and not
  // before it (build 95 note 26): AppThemeController says so on the third (lib/reader/themeSwitch.ts).
  let pending = false;
  const worn = new MutationObserver((changes) => {
    const step = barStep(pending, { palette: changes.some((c) => c.attributeName !== SWITCH_ATTR), switching: root.getAttribute(SWITCH_ATTR) });
    pending = step.pending;
    if (step.paint) void paint();
  });
  worn.observe(root, { attributes: true, attributeFilter: ["data-reading-mode", "data-look", SWITCH_ATTR] });
  // The room under the bar arrives a moment after the page on some phones, and changes when a tablet turns.
  const roomWatch =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          const now = inset();
          if (now === room) return;
          room = now;
          void paint();
        });
  roomWatch?.observe(probe);
  // The page's parts coming and going (a sheet, the launch frame lifting, another screen), and a slide or a fade ending.
  const parts = new MutationObserver(lookSoon);
  parts.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("transitionend", lookSoon, true);
  document.addEventListener("animationend", lookSoon, true);
  document.addEventListener("visibilitychange", lookSoon);

  return () => {
    stopped = true;
    worn.disconnect();
    roomWatch?.disconnect();
    parts.disconnect();
    document.removeEventListener("transitionend", lookSoon, true);
    document.removeEventListener("animationend", lookSoon, true);
    document.removeEventListener("visibilitychange", lookSoon);
    if (settle !== null) clearTimeout(settle);
    probe.remove();
  };
}
