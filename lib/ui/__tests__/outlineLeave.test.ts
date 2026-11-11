// A page takes its outline's place without a cut (1.9; lib/ui/outlineLeave.ts
// has the why, and the standard is CLAUDE.md's "every page switch is a
// transition").
//
// What a reader would notice if this broke: on a slow connection, grey boxes
// and then the page with nothing between, which is the cut this was built to
// end. Or, the other ways it can go wrong: the boxes left hanging over a page
// they do not belong to; boxes that jump brighter for an instant before they
// fade; a page whose rows wait a quarter of a second behind an outline that
// has already gone.
//
// It cannot watch the dissolve (vitest runs with no browser here). The check
// that does is scripts/route-motion.mjs, on the export: "a page that is slow
// to come".

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AFTER_ATTR, AFTER_MS, DISSOLVE_MS, GHOST_ATTR, HOUSE_EASE, around, inSight, outlineLeft, outlinesForgotten, resetOutlineLeaveForTests, showingThrough } from "../outlineLeave";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

type Box = { top: number; left: number; right: number; bottom: number };
type Fade = { frames: { opacity: number }[]; options: { duration: number; easing: string; fill: string }; finish: () => void };

/** As much of an element as the module touches. */
class Fake {
  attrs = new Map<string, string>();
  style: Record<string, string> = {};
  classes: string[] = [];
  children: Fake[] = [];
  parentElement: Fake | null = null;
  isConnected = true;
  box: Box = { top: 0, left: 0, right: 0, bottom: 0 };
  /** What the browser would compute for it now. */
  opacity = "1";
  /** In motion: it has an animation running. */
  moving = false;
  fades: Fade[] = [];
  removed = false;

  constructor(init: Partial<Pick<Fake, "box" | "opacity" | "moving" | "classes">> = {}) {
    Object.assign(this, init);
  }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }
  hasAttribute(name: string) {
    return this.attrs.has(name);
  }
  removeAttribute(name: string) {
    this.attrs.delete(name);
  }
  appendChild(child: Fake) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  add(...children: Fake[]) {
    for (const child of children) this.appendChild(child);
    return this;
  }
  all(): Fake[] {
    return this.children.flatMap((c) => [c, ...c.all()]);
  }
  cloneNode(): Fake {
    const copy = new Fake({ box: this.box, classes: [...this.classes] });
    for (const [k, v] of this.attrs) copy.attrs.set(k, v);
    copy.style = { ...this.style };
    for (const child of this.children) copy.appendChild(child.cloneNode());
    return copy;
  }
  getBoundingClientRect() {
    return this.box;
  }
  getAnimations() {
    return this.all()
      .filter((el) => el.moving)
      .map((el) => ({ effect: { target: el } }));
  }
  querySelectorAll(selector: string) {
    const attr = /^\[(.+)\]$/.exec(selector)?.[1] ?? "";
    return this.all().filter((el) => el.attrs.has(attr));
  }
  closest(selector: string): Fake | null {
    const cls = selector.replace(/^\./, "");
    if (this.classes.includes(cls)) return this;
    return this.parentElement?.closest(selector) ?? null;
  }
  animate(frames: { opacity: number }[], options: Fade["options"]) {
    let finish: () => void = () => {};
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    this.fades.push({ frames, options, finish });
    return { finished };
  }
  remove() {
    this.removed = true;
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
    this.parentElement = null;
  }
}

/** A page with a route's wrapper in it, an outline inside that, and a screen 844 tall. */
function stubPage(options: { motion?: string; wrapperOpacity?: string; mainOpacity?: string; top?: number; wrapped?: boolean } = {}) {
  const html = new Fake();
  const body = new Fake();
  const main = new Fake({ opacity: options.mainOpacity ?? "1" });
  const wrapper = new Fake({ opacity: options.wrapperOpacity ?? "1", classes: options.wrapped === false ? [] : ["route-fade"] });
  const outline = new Fake();
  const top = options.top ?? 112;
  // The outline's two parts, as a loading.tsx draws them: a head, and a list whose rows come in one by one.
  const head = new Fake({ box: { top, left: 0, right: 390, bottom: top + 180 } });
  const rowIn = new Fake({ opacity: "1" });
  const rowHalf = new Fake({ opacity: "0.4", moving: true });
  const rowWaiting = new Fake({ opacity: "0", moving: true });
  const list = new Fake({ box: { top: top + 180, left: 20, right: 370, bottom: top + 900 } }).add(rowIn, rowHalf, rowWaiting);
  html.add(body.add(main.add(wrapper.add(outline.add(head, list)))));
  const dataset: Record<string, string> = {};
  if (options.motion) dataset.motion = options.motion;
  const g = globalThis as Record<string, unknown>;
  g.document = {
    documentElement: Object.assign(html, { dataset }),
    body,
    createElement: () => new Fake(),
  };
  g.window = { innerHeight: 844, scrollY: 300, scrollX: 0 };
  g.getComputedStyle = (el: Fake) => ({ opacity: el.opacity });
  const ghosts = () => body.children.filter((c) => c.attrs.has(GHOST_ATTR));
  /** React takes the outline out, as it does after the cleanup has run. */
  const takeOut = () => {
    outline.isConnected = false;
    outline.remove();
  };
  return { body, wrapper, outline, head, list, ghosts, takeOut };
}

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

beforeEach(() => {
  resetOutlineLeaveForTests();
});
afterEach(() => {
  vi.useRealTimers();
  const g = globalThis as Record<string, unknown>;
  delete g.document;
  delete g.window;
  delete g.getComputedStyle;
});

describe("the box an outline stands in", () => {
  it("holds every part of it", () => {
    expect(around([{ top: 112, left: 0, right: 390, bottom: 292 }, { top: 292, left: 20, right: 370, bottom: 1012 }])).toEqual({ top: 112, left: 0, right: 390, bottom: 1012, width: 390, height: 900 });
  });

  it("is not stretched by a part that draws nothing, and is nothing when no part draws", () => {
    expect(around([{ top: 112, left: 0, right: 390, bottom: 292 }, { top: 0, left: 0, right: 0, bottom: 0 }])?.top).toBe(112);
    expect(around([{ top: 0, left: 0, right: 0, bottom: 0 }])).toBeNull();
    expect(around([])).toBeNull();
  });

  it("is in sight when any of it is on the screen", () => {
    expect(inSight({ top: 112, left: 0, right: 390, bottom: 1012 }, 844)).toBe(true);
    expect(inSight({ top: -600, left: 0, right: 390, bottom: 40 }, 844)).toBe(true);
    expect(inSight({ top: -900, left: 0, right: 390, bottom: -10 }, 844)).toBe(false);
    expect(inSight({ top: 900, left: 0, right: 390, bottom: 1800 }, 844)).toBe(false);
  });
});

describe("how much of an outline was showing", () => {
  it("is every wrapper's own share, multiplied", () => {
    expect(showingThrough([1, 1, 1])).toBe(1);
    expect(showingThrough([0.5, 1, 0.4])).toBeCloseTo(0.2);
    expect(showingThrough([])).toBe(1);
  });

  it("never more than all of it, never less than none, and a share that cannot be read is taken as whole", () => {
    expect(showingThrough([1.4])).toBe(1);
    expect(showingThrough([-1])).toBe(0);
    expect(showingThrough([Number.NaN, 0.5])).toBe(0.5);
  });
});

describe("an outline taken out", () => {
  it("is left over its page as a copy that fades, where the outline stood on the screen", async () => {
    const page = stubPage();
    outlineLeft(page.outline as unknown as HTMLElement);
    // Copied while it stood; nothing is put in the page until React has finished.
    expect(page.ghosts()).toHaveLength(0);
    page.takeOut();
    await tick();
    const [ghost] = page.ghosts();
    expect(ghost).toBeDefined();
    expect(ghost.attrs.get("aria-hidden")).toBe("true");
    expect(ghost.attrs.has("inert")).toBe(true);
    // Held to the screen, not to the page (which is 300 down here): a page
    // that goes to the reader's own place as it arrives would take a copy
    // placed in the page off the screen with it, and that is a cut again.
    expect(ghost.style).toMatchObject({ position: "fixed", top: "112px", left: "0px", width: "390px", height: "900px", overflow: "clip", pointerEvents: "none" });
    // Both parts of the outline, copied.
    expect(ghost.children).toHaveLength(2);
    const [fade] = ghost.fades;
    expect(fade.frames).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(fade.options).toEqual({ duration: DISSOLVE_MS, easing: HOUSE_EASE, fill: "forwards" });
  });

  it("and is gone when the fade is over", async () => {
    const page = stubPage();
    outlineLeft(page.outline as unknown as HTMLElement);
    page.takeOut();
    await tick();
    const [ghost] = page.ghosts();
    ghost.fades[0].finish();
    await tick();
    await tick();
    expect(ghost.removed).toBe(true);
    expect(page.ghosts()).toHaveLength(0);
  });

  it("does not outstay its fade even if the browser never says the fade is over", async () => {
    vi.useFakeTimers();
    const page = stubPage();
    outlineLeft(page.outline as unknown as HTMLElement);
    page.takeOut();
    await vi.advanceTimersByTimeAsync(0);
    const [ghost] = page.ghosts();
    expect(ghost.removed).toBe(false);
    await vi.advanceTimersByTimeAsync(DISSOLVE_MS + 121);
    expect(ghost.removed).toBe(true);
  });

  it("a part still on its way in is copied as far in as it had come, and the outline itself is left as it was", async () => {
    const page = stubPage();
    outlineLeft(page.outline as unknown as HTMLElement);
    page.takeOut();
    await tick();
    const rows = page.ghosts()[0].children[1].children;
    // In already, half in, not yet begun.
    expect(rows.map((r) => r.style.opacity ?? "")).toEqual(["", "0.4", "0"]);
    // No mark of the copying is left on either.
    expect(rows.every((r) => !r.attrs.has("data-ghost-part"))).toBe(true);
    expect(page.list.children.every((r) => !r.attrs.has("data-ghost-part"))).toBe(true);
  });

  it("begins no brighter than the outline stood: a wrapper still fading in is counted", async () => {
    const page = stubPage({ wrapperOpacity: "0.5", mainOpacity: "0.8" });
    outlineLeft(page.outline as unknown as HTMLElement);
    page.takeOut();
    await tick();
    const [ghost] = page.ghosts();
    expect(Number(ghost.style.opacity)).toBeCloseTo(0.4);
    expect(ghost.fades[0].frames[0].opacity).toBeCloseTo(0.4);
  });

  it("an outline that could not be seen leaves no copy: one all but unseen, or one the reader has scrolled away from", async () => {
    const dim = stubPage({ wrapperOpacity: "0.01" });
    outlineLeft(dim.outline as unknown as HTMLElement);
    dim.takeOut();
    await tick();
    expect(dim.ghosts()).toHaveLength(0);

    const away = stubPage({ top: -1200 });
    outlineLeft(away.outline as unknown as HTMLElement);
    away.takeOut();
    await tick();
    expect(away.ghosts()).toHaveLength(0);
  });

  it("the route's wrapper is told at once, so the page's rows never begin by waiting, and untold when they are in", async () => {
    vi.useFakeTimers();
    const page = stubPage();
    outlineLeft(page.outline as unknown as HTMLElement);
    // Told in the cleanup itself: before React has put the page's rows in.
    expect(page.wrapper.attrs.has(AFTER_ATTR)).toBe(true);
    page.takeOut();
    await vi.advanceTimersByTimeAsync(AFTER_MS - 1);
    expect(page.wrapper.attrs.has(AFTER_ATTR)).toBe(true);
    await vi.advanceTimersByTimeAsync(2);
    expect(page.wrapper.attrs.has(AFTER_ATTR)).toBe(false);
  });

  it("a page with no route wrapper (Today) is told nothing, and its outline still dissolves", async () => {
    const page = stubPage({ wrapped: false });
    outlineLeft(page.outline as unknown as HTMLElement);
    page.takeOut();
    await tick();
    expect(page.wrapper.attrs.has(AFTER_ATTR)).toBe(false);
    expect(page.ghosts()).toHaveLength(1);
  });
});

describe("what is not an outline leaving", () => {
  it("React taking an effect down and putting it back, as it does in development: the outline still stands, so nothing is left and nothing is told", async () => {
    const page = stubPage();
    outlineLeft(page.outline as unknown as HTMLElement);
    await tick();
    expect(page.ghosts()).toHaveLength(0);
    expect(page.wrapper.attrs.has(AFTER_ATTR)).toBe(false);
  });

  it("a change of page: the outline left with its page, in the page switch's own picture, and no copy is left over the next one", async () => {
    const page = stubPage();
    outlineLeft(page.outline as unknown as HTMLElement);
    page.takeOut();
    // The bridge's layout effect, which runs after every cleanup and before anything else.
    outlinesForgotten();
    await tick();
    expect(page.ghosts()).toHaveLength(0);
    expect(page.wrapper.attrs.has(AFTER_ATTR)).toBe(false);
  });

  it("a change of page while a copy is still fading takes the copy with it", async () => {
    const page = stubPage();
    outlineLeft(page.outline as unknown as HTMLElement);
    page.takeOut();
    await tick();
    const [ghost] = page.ghosts();
    outlinesForgotten();
    expect(ghost.removed).toBe(true);
    expect(page.wrapper.attrs.has(AFTER_ATTR)).toBe(false);
  });

  it("with motion reduced nothing is copied and nothing is told: the page is simply there", async () => {
    const page = stubPage({ motion: "reduce" });
    outlineLeft(page.outline as unknown as HTMLElement);
    page.takeOut();
    await tick();
    expect(page.ghosts()).toHaveLength(0);
    expect(page.wrapper.attrs.has(AFTER_ATTR)).toBe(false);
  });

  it("an outline already out of the page, and no page at all (the server)", async () => {
    const page = stubPage();
    page.takeOut();
    outlineLeft(page.outline as unknown as HTMLElement);
    await tick();
    expect(page.ghosts()).toHaveLength(0);
    const g = globalThis as Record<string, unknown>;
    delete g.document;
    delete g.window;
    expect(() => outlineLeft(page.outline as unknown as HTMLElement)).not.toThrow();
    expect(() => outlinesForgotten()).not.toThrow();
  });
});

describe("the stylesheet", () => {
  const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

  it("nothing in the copy moves: its rows' own entrance would begin again from nothing in it", () => {
    expect(css).toMatch(/\[data-outline-ghost\],\s*\[data-outline-ghost\] \* \{\s*animation: none !important;\s*transition: none !important;\s*\}/);
  });

  it("a page's rows wait for the wrapper's fade as a rule, and come in at once behind an outline that is going", () => {
    expect(css).toMatch(/\.route-fade \.cascade > \* \{\s*--cascade-start: var\(--duration-route-enter\);\s*\}/);
    const after = css.indexOf(".route-fade[data-after-outline] .cascade > * {");
    expect(after).toBeGreaterThan(css.indexOf(".route-fade .cascade > * {"));
    expect(css.slice(after, css.indexOf("}", after))).toContain("--cascade-start: 0ms;");
  });

  it("an outline that came in a picture is whole in it, as a page that has returned is: its rows are not held back for a fade that is not playing", () => {
    expect(css).toMatch(/\.route-fade\[data-carried\] \[data-route-loading\] \.cascade > \* \{\s*animation-delay: -1s;\s*\}/);
    // The mark it is found by is the one the outline's wrapper wears.
    expect(read("components/ui/AfterAMoment.tsx")).toContain('data-route-loading=""');
  });

  it("the names the stylesheet matches are the ones the module writes", () => {
    expect(GHOST_ATTR).toBe("data-outline-ghost");
    expect(AFTER_ATTR).toBe("data-after-outline");
    // And the fade is on the house curve, as the stylesheet has it.
    expect(read("app/globals.css")).toContain(`--ease-house: ${HOUSE_EASE};`);
  });

  it("the check that watches it on the export waits for the same fade", () => {
    expect(read("scripts/route-motion.mjs")).toContain(`const DISSOLVE_MS = ${DISSOLVE_MS};`);
  });

  it("the wrapper is told for longer than its rows take to come in: thirteen steps, then one fade", () => {
    const ms = (name: string) => {
      const found = new RegExp(`${name}:\\s*(\\d+)ms`).exec(css);
      expect(found, name).not.toBeNull();
      return Number(found![1]);
    };
    expect(AFTER_MS).toBeGreaterThan(13 * ms("--stagger-step") + ms("--duration-base"));
  });
});
