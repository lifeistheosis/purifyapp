// A change inside a page moves as a page switch does (the owner's ruling of
// 2026-11-13, relayed by Arbiter 2; lib/ui/inPageMove.ts). This holds the
// rules and the places that use them, since nothing else would say so if a
// piece went missing: a question would open at once again, a calendar day's
// fast would land sideways a frame late, a history event's parts would cut.
//
// What a reader would notice if this broke: an answer that appears at once,
// what is below it jumping down; a step under reduced motion that moves; a
// change never made at all.
//
// It cannot watch a transition (vitest runs with no browser). The check that
// does is the gate's motion walk (scripts/motion-walk.mjs) on the export.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

type Held = { update: () => unknown; finish: () => void };

function stubDocument({ motion = "full", transitions = true }: { motion?: string; transitions?: boolean } = {}) {
  const attrs = new Map<string, string>();
  const started: Held[] = [];
  const doc: Record<string, unknown> = {
    documentElement: {
      dataset: { motion },
      setAttribute: (k: string, v: string) => attrs.set(k, v),
      removeAttribute: (k: string) => attrs.delete(k),
      getAttribute: (k: string) => attrs.get(k) ?? null,
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  if (transitions) {
    doc.startViewTransition = (update: () => unknown) => {
      let finish = () => {};
      const finished = new Promise<void>((resolve) => {
        finish = resolve;
      });
      started.push({ update, finish });
      return { finished, ready: Promise.resolve(), skipTransition: () => {} };
    };
  }
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", { innerHeight: 844 });
  return { attrs, started };
}

const part = () => ({ style: { viewTransitionName: "" } }) as unknown as HTMLElement;

let mod: typeof import("../inPageMove");

beforeEach(async () => {
  vi.resetModules();
  mod = await import("../inPageMove");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a change inside a page", () => {
  it("is made at once where there are no View Transitions", () => {
    const { started } = stubDocument({ transitions: false });
    const update = vi.fn();
    mod.movePage(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(started).toEqual([]);
  });

  it("is made at once, and still, under reduced motion", () => {
    const { started } = stubDocument({ motion: "reduce" });
    const update = vi.fn();
    mod.movePage(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(started).toEqual([]);
  });

  it("is pictured: made inside the transition, never before it, exactly once", async () => {
    const { started, attrs } = stubDocument();
    const update = vi.fn();
    const grows = part();
    const glides = [part(), part()];
    mod.movePage(update, { grows: [grows], glides });
    expect(update).not.toHaveBeenCalled();
    expect(started).toHaveLength(1);
    // While it moves: the root says so, the part that opens is clipped by its name, what follows glides by its own.
    expect(attrs.has(mod.IN_PAGE_ATTR)).toBe(true);
    expect(grows.style.viewTransitionName).toBe(mod.GROWS[0]);
    expect(glides.map((g) => g.style.viewTransitionName)).toEqual([`${mod.GLIDES}1`, `${mod.GLIDES}2`]);
    expect(mod.isMovingInPage()).toBe(true);
    started[0].update();
    started[0].update();
    expect(update).toHaveBeenCalledTimes(1);
    // A second change while one moves is made at once, so the first is not cut short.
    const second = vi.fn();
    mod.movePage(second);
    expect(second).toHaveBeenCalledTimes(1);
    expect(started).toHaveLength(1);
    started[0].finish();
    await new Promise((r) => setTimeout(r, 0));
    expect(attrs.has(mod.IN_PAGE_ATTR)).toBe(false);
    expect(grows.style.viewTransitionName).toBe("");
    expect(glides.map((g) => g.style.viewTransitionName)).toEqual(["", ""]);
    expect(mod.isMovingInPage()).toBe(false);
  });

  it("a change that comes later holds the picture until it has come, and takes its step once", async () => {
    const { started } = stubDocument();
    const step = vi.fn();
    const ready = mod.awaitArrival("t");
    mod.movePageUntil(step, ready, { glides: [] });
    expect(step).not.toHaveBeenCalled();
    let held = false;
    void Promise.resolve(started[0].update()).then(() => {
      held = true;
    });
    expect(step).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(held).toBe(false);
    mod.arrive("t");
    await new Promise((r) => setTimeout(r, 0));
    expect(held).toBe(true);
  });

  it("a change that never says it has come is let go after HOLD_MS", async () => {
    vi.useFakeTimers();
    try {
      const { started } = stubDocument();
      mod.movePageUntil(() => {}, new Promise(() => {}), { glides: [] });
      let held = false;
      void Promise.resolve(started[0].update()).then(() => {
        held = true;
      });
      await vi.advanceTimersByTimeAsync(mod.HOLD_MS + 1);
      expect(held).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the places that move", () => {
  it("every question that opens in place, from one listener at the root", () => {
    expect(read("components/ui/MotionRoot.tsx")).toContain("useEffect(() => moveQuestions(), []);");
    const src = read("lib/ui/inPageMove.ts");
    expect(src).toMatch(/m\.preventDefault\(\);\s*const d = details as HTMLDetailsElement;\s*movePage\(\(\) => \{\s*d\.open = !d\.open;\s*\}, \{ grows: \[d\] \}\);/);
  });

  it("the calendar's days and months: the address changes inside the move, held until the day has drawn", () => {
    const cal = read("components/calendar/PhoneCalendar.tsx");
    expect(cal).toContain('movePageUntil(() => window.history.replaceState(null, "", href), awaitArrival(DAY_ARRIVED));');
    expect(cal).toMatch(/shownDay\.current = selectedIso;\s*arrive\(DAY_ARRIVED\);/);
    expect(cal).toMatch(/shownMonth\.current = monthKey;\s*arrive\(DAY_ARRIVED\);/);
    expect(cal).toContain("(step: 1 | -1) => turnTo(step === 1 ? nextHref : prevHref),");
    expect(cal).not.toMatch(/function stayInPlace[\s\S]{0,300}window\.history\.replaceState\(null, "", href\);\s*\}/);
  });

  it("a history event's parts glide to their place", () => {
    expect(read("components/history/EventPartsNav.tsx")).toMatch(/rowHeight: row\.getBoundingClientRect\(\)\.height,\s*\}\),\s*behavior: scrollBehavior\(\),/);
  });

  it("what opens is followed once the move is over, not under its picture", () => {
    expect(read("lib/ui/showOpened.ts")).toMatch(/if \(isMovingInPage\(\)\) \{\s*arrived = at;\s*last = at;\s*frame = window\.requestAnimationFrame\(look\);\s*return;\s*\}/);
  });

  it("the stylesheet times the move on the house curve and clips what opens", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/:root\[data-in-page\]::view-transition-group\(\*\),\s*:root\[data-in-page\]::view-transition-old\(\*\),\s*:root\[data-in-page\]::view-transition-new\(\*\) \{\s*animation-duration: var\(--duration-base\);\s*animation-timing-function: var\(--ease-house\);/);
    expect(css).toMatch(/::view-transition-group\(in-page-grows-1\),\s*::view-transition-group\(in-page-grows-2\) \{\s*overflow: clip;/);
  });
});
