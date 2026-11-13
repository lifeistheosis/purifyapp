// Discover's doors held and moved, as the screen wires them (1.9, build 95 note 9).
//
// The rules are tested in ./doorOrder.test.ts and ./holdToMove.test.ts. This
// holds what plain node cannot run: that Discover draws its doors through the
// list that moves them, that the list keeps the phone's own ways (a tap opens,
// a swipe scrolls, the clicks follow Settings, reduced motion stays still),
// that a door moves without a drag too and the move is said, that the way
// back to the original order is there, and that every word is in every
// language. Read as text, as ./gallery.test.ts reads Discover, because the
// components are React and this suite runs in node.

import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { keepOrder, moveDoor, readOrder } from "@/lib/discover/doorOrder";
import { getMessages, t } from "@/lib/i18n";

const ROOT = path.resolve(__dirname, "..", "..", "..");
/** A file's text, or nothing when it is not there: each assertion then says what is missing. */
const read = (...parts: string[]) => {
  const file = path.join(ROOT, ...parts);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
};
/** Code without its comments, so prose about a rule cannot pass for the rule. */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const DISCOVER = read("components", "mobile", "DiscoverMobile.tsx");
const PAGE = read("app", "(app)", "discover", "page.tsx");
const LIST = code(read("components", "discover", "DoorOrder.tsx"));
const SHEET = code(read("components", "discover", "ArrangeSheet.tsx"));
const CSS = read("app", "globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

const KEYS = ["discover.arrange", "discover.arrangeHint", "discover.moved", "discover.restore", "discover.restored"];

describe("Discover's doors", () => {
  it("are drawn through the list that moves them, each by its address and its name", () => {
    expect(DISCOVER).toMatch(/<DoorOrder\s+doors=\{entries\.map\(\(e, i\) => \(\{\s*id: e\.href,\s*nameKey: nameKeyOf\(e\.label\),\s*band: \(\s*<GalleryBand/);
    // No list of its own any more: the doors are only in the list that moves them.
    expect(DISCOVER).not.toMatch(/<ul className="flex flex-col gap-2\.5">/);
  });

  it("lay the reader's order on the page before it is drawn, with the website's nonce", () => {
    expect(DISCOVER).toMatch(/<script nonce=\{nonce\} suppressHydrationWarning dangerouslySetInnerHTML=\{\{ __html: orderPrepaint\(entries\.map\(\(e\) => e\.href\)\) \}\} \/>\s*<DoorOrder/);
    expect(PAGE).toMatch(/const nonce = IS_STATIC_EXPORT \? undefined : \(\(await headers\(\)\)\.get\(NONCE_HEADER\) \?\? undefined\);/);
    expect(PAGE).toContain("<DiscoverMobile nonce={nonce} />");
    // And the list takes the pre-paint's style out once it draws the same order itself.
    expect(LIST).toMatch(/if \(orderKey === readOrder\(first\)\.join\("\\n"\)\) dropPrepaint\(\);/);
    expect(LIST).toMatch(/useSyncExternalStore\(\s*subscribeOrder,\s*\(\) => readOrder\(first\)\.join\("\\n"\),\s*\(\) => firstKey,\s*\)/);
  });
});

describe("a finger on a door, on the screen", () => {
  it("can stop the page under a held door, and only a held one", () => {
    expect(LIST).toContain('list.addEventListener("touchmove", onMove, { passive: false });');
    expect(LIST).toContain('list.addEventListener("touchstart", onStart, { passive: true });');
    expect(LIST).toMatch(/if \(state\.phase === "held" && e\.cancelable\) e\.preventDefault\(\);/);
  });

  it("lets go of a finger the web view lost, so the next touch is a touch of its own", () => {
    expect(LIST).toMatch(/if \(finger !== null\) \{\s*if \(ours\(e\.touches\)\) \{[\s\S]*?return;\s*\}\s*finger = null;\s*run\(\{ type: "cancel" \}\);\s*\}/);
  });

  it("lets a tap open the door: a click is stopped only while a door is held, landing, or just let go", () => {
    expect(LIST).toMatch(
      /const onClick = \(e: MouseEvent\) => \{\s*if \(state\.phase === "held" \|\| state\.phase === "landing" \|\| performance\.now\(\) < quietUntil\) \{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);/,
    );
    // quietUntil starts at nothing, and is set only when a held door is let go.
    expect(LIST).toContain("let quietUntil = 0;");
    expect(LIST.match(/(?<!let )quietUntil = /g)).toHaveLength(1);
    expect(LIST).toMatch(/if \(state\.phase === "held"\) \{\s*quietUntil = performance\.now\(\) \+ LIFT_MS;/);
    // The gesture's tap is left alone.
    expect(LIST).toMatch(/case "tap":\s*return;/);
  });

  it("ticks once at the lift, and clicks at each change of place, as Settings' Clicks as you scroll allows", () => {
    expect(LIST).toMatch(/case "lift":[\s\S]*?if \(clicksOn\(\)\) softTick\(\);\s*ticks = handTicks\(\);/);
    expect(LIST).toMatch(/case "place": \{[\s\S]*?ticks\?\.tick\(\);/);
    expect(LIST).toMatch(/case "land": \{[\s\S]*?ticks\?\.end\(\);/);
    // handTicks reads the switch itself (lib/ui/scrollTicks.ts), and softTick is the apps' alone.
    expect(read("lib", "ui", "scrollTicks.ts")).toMatch(/if \(!isNativeClient\(\) \|\| !clicksOn\(\)\) return \{ tick: \(\) => \{\}, end: \(\) => \{\} \};/);
    expect(LIST.match(/softTick\(\)/g)).toHaveLength(1);
  });

  it("measures once, as the door lifts, and moves by transform alone", () => {
    expect(LIST).toMatch(/clock = setTimeout\(\(\) => \{\s*rows = measure\(\);\s*run\(\{ type: "hold", rows, pageY: y \+ window\.scrollY \}\);\s*\}, HOLD_MS\);/);
    expect(LIST.match(/getBoundingClientRect\(\)/g)?.length).toBe(3);
    expect(LIST).not.toMatch(/style\.(top|left|height|width|margin)/);
  });

  it("goes into place at once under reduced motion, and on the house curve otherwise", () => {
    expect(LIST).toMatch(/delete li\.dataset\.lifted;\s*if \(prefersReducedMotion\(\)\) \{\s*settle\(from, to\);/);
    expect(LIST).toContain("li.style.transition = `transform ${LAND_MS}ms var(--ease-house)`;");
    expect(LIST).toContain('const FLIP = { durationMs: LAND_MS, easing: "var(--ease-house)" };');
  });

  it("keeps the order and draws it in the same frame the transforms go, so nothing slides back", () => {
    expect(LIST).toMatch(/if \(to !== from\) flushSync\(\(\) => keepOrder\(next, first\)\);\s*for \(const li of items\) \{\s*li\.style\.transition = "none";\s*li\.style\.transform = "";/);
  });
});

describe("a door moved without a drag", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("has Move up and Move down in Your rule's words, off at the ends", () => {
    expect(SHEET).toMatch(/data-move="up"\s*disabled=\{i === 0\}\s*aria-label=\{t\("prayers\.mine\.moveUp"\)\}\s*onClick=\{\(\) => onMove\(i, -1\)\}/);
    expect(SHEET).toMatch(/data-move="down"\s*disabled=\{i === rows\.length - 1\}\s*aria-label=\{t\("prayers\.mine\.moveDown"\)\}\s*onClick=\{\(\) => onMove\(i, 1\)\}/);
    // Each row a group named by its door, so a screen reader says which door a button moves.
    expect(SHEET).toMatch(/role="group"\s*aria-labelledby=\{name\}/);
    // Opened from Discover by a button that says so.
    expect(LIST).toMatch(/aria-haspopup="dialog"\s*onClick=\{\(\) => setArranging\(true\)\}[\s\S]*?\{t\("discover\.arrange"\)\}/);
  });

  it("is kept, felt as one click, and said aloud with the door's new place", () => {
    expect(LIST).toMatch(/const moveBy = \(from: number, by: -1 \| 1\) => \{[\s\S]*?flushSync\(\(\) => keepOrder\(next, first\)\);[\s\S]*?const click = handTicks\(\);\s*click\.tick\(\);\s*click\.end\(\);\s*sayMoved\(next, id\);/);
    expect(LIST).toMatch(/<p role="status" className="sr-only">\s*\{said\}\s*<\/p>/);
    // Two moves up for Chants, as two taps on its Move up would make them.
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) },
      dispatchEvent: () => true,
    });
    const first = ["/saints", "/reading", "/history", "/councils", "/theology", "/chants"];
    let order = readOrder(first);
    for (let i = 0; i < 2; i++) {
      const at = order.indexOf("/chants");
      keepOrder(moveDoor(order, at, at - 1), first);
      order = readOrder(first);
    }
    expect(order).toEqual(["/saints", "/reading", "/history", "/chants", "/councils", "/theology"]);
    const en = getMessages("en");
    expect(t(en, "discover.moved", { name: t(en, "chants.title"), place: order.indexOf("/chants") + 1, total: order.length })).toBe("Chants, now 4 of 6");
  });

  it("keeps the keyboard on the door it moved", () => {
    expect(LIST).toMatch(/\(same && !same\.disabled \? same : other\)\?\.focus\(\{ preventScroll: true \}\);/);
  });

  it("offers the original order back once the order is the reader's own, and only then", () => {
    expect(SHEET).toMatch(/foot=\{\s*atFirst \? undefined : \(/);
    expect(SHEET).toContain('{t("discover.restore")}');
    expect(LIST).toMatch(/const restore = \(\) => \{\s*if \(sameOrder\(order, first\)\) return;[\s\S]*?flushSync\(\(\) => keepOrder\(first, first\)\);[\s\S]*?setSaid\(t\("discover\.restored"\)\);/);
    expect(LIST).toContain("const atFirst = orderKey === firstKey;");
  });
});

describe("the look of a held door", () => {
  it("rises and casts its shadow by transform and opacity alone, with an escape for reduced motion", () => {
    expect(CSS).toMatch(/\[data-door-list\] > li\[data-lifted\] \[data-door-face\] \{\s*transform: scale\(1\.03\);\s*\}/);
    expect(CSS).toMatch(/\[data-door-face\]::after \{[^}]*box-shadow: var\(--shadow-pop\);[^}]*opacity: 0;[^}]*transition: opacity var\(--duration-fast\) var\(--ease-house\);/);
    expect(CSS).toMatch(/\[data-door-list\]\[data-moving\] > li:not\(\[data-lifted\]\) \{\s*transition: transform var\(--duration-fast\) var\(--ease-house\);\s*\}/);
    expect(CSS).toMatch(/:where\(\[data-motion="reduce"\]\) \[data-door-face\],\s*:where\(\[data-motion="reduce"\]\) \[data-door-face\]::after,\s*:where\(\[data-motion="reduce"\]\) \[data-door-list\]\[data-moving\] > li:not\(\[data-lifted\]\) \{\s*transition: none;\s*\}/);
    expect(CSS).toMatch(/:where\(\[data-motion="reduce"\]\) \[data-door-list\] > li\[data-lifted\] \[data-door-face\] \{\s*transform: none;\s*\}/);
    // Every transition in the block moves a transform or an opacity, nothing a phone lays out or paints again.
    const block = CSS.slice(CSS.indexOf("[data-door-list] > li {"), CSS.indexOf(':where([data-motion="reduce"]) [data-door-list] > li[data-lifted]'));
    for (const [, what] of block.matchAll(/transition: (\w[\w-]*)/g)) expect(["transform", "opacity", "none"]).toContain(what);
  });

  it("keeps the phone's own hold off a door: no callout, no selection, no drag of the link", () => {
    expect(CSS).toMatch(/\[data-door-list\] > li \{\s*-webkit-touch-callout: none;\s*-webkit-user-select: none;\s*user-select: none;\s*\}/);
    expect(CSS).toMatch(/\[data-door-list\] :is\(a, img\) \{\s*-webkit-user-drag: none;\s*\}/);
  });
});

describe("the words", () => {
  it("are in every language, with their places to fill and no em dash", () => {
    const dir = path.join(ROOT, "lib", "i18n", "messages");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(21);
    for (const file of files) {
      const words = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Record<string, string>;
      for (const key of KEYS) {
        expect(words[key], `${file} ${key}`).toBeTruthy();
        expect(words[key], `${file} ${key}`).not.toContain(String.fromCharCode(0x2014));
      }
      for (const place of ["{name}", "{place}", "{total}"]) expect(words["discover.moved"], `${file} ${place}`).toContain(place);
      // Your rule's Move up and Move down, which the sheet reuses.
      expect(words["prayers.mine.moveUp"], file).toBeTruthy();
      expect(words["prayers.mine.moveDown"], file).toBeTruthy();
    }
  });
});
