// A screen held for its language is drawn once the language is settled, not when
// some unrelated update happens to come (Updates 88, 1.9).
//
// What a reader would notice if this broke: in the apps, a screen opened before the
// reader's language was on the screen (Saints, opened cold in Arabic) held under the
// launch slate 1.7 to 1.9 s after its language had settled, measured on the export
// at 390x844 with the processor slowed four times: React had marked the held move
// suspended again when another update landed, and only a later, unrelated update
// started it (docs/handoffs/updates-87.md, updates-88.md).

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import {
  HELD_SCREEN_WAKES,
  HELD_SCREEN_WAKE_GAP_MS,
  attachHeldScreenWake,
  forgetHeldScreenWakeForTests,
  heldScreenDrawn,
  heldScreenHeld,
  wakeHeldScreen,
} from "../heldScreenWake";

/** A clock the test turns by hand: what was asked for later, and when. */
function clock() {
  const queue: { fn: () => void; ms: number }[] = [];
  return {
    later: (fn: () => void, ms: number) => void queue.push({ fn, ms }),
    queue,
    run() {
      const next = queue.shift();
      next?.fn();
      return next?.ms;
    },
  };
}

describe("the held screen's wake", () => {
  beforeEach(() => forgetHeldScreenWakeForTests());

  it("wakes a held screen once the language is settled, in a later task, not in the settling one", () => {
    let woken = 0;
    attachHeldScreenWake(() => (woken += 1));
    heldScreenHeld();
    const c = clock();
    wakeHeldScreen(c.later);
    expect(woken).toBe(0);
    expect(c.run()).toBe(0);
    expect(woken).toBe(1);
  });

  it("wakes it again while it is not drawn, a few times at most, then leaves it to React", () => {
    let woken = 0;
    attachHeldScreenWake(() => (woken += 1));
    heldScreenHeld();
    const c = clock();
    wakeHeldScreen(c.later);
    const gaps: (number | undefined)[] = [];
    for (let i = 0; i < 10 && c.queue.length; i++) gaps.push(c.run());
    expect(woken).toBe(HELD_SCREEN_WAKES);
    expect(gaps.slice(1, HELD_SCREEN_WAKES)).toEqual(Array(HELD_SCREEN_WAKES - 1).fill(HELD_SCREEN_WAKE_GAP_MS));
    expect(c.queue.length).toBe(0);
  });

  it("stops as soon as the screen is drawn", () => {
    let woken = 0;
    attachHeldScreenWake(() => (woken += 1));
    heldScreenHeld();
    const c = clock();
    wakeHeldScreen(c.later);
    c.run();
    heldScreenDrawn();
    while (c.queue.length) c.run();
    expect(woken).toBe(1);
  });

  it("wakes nothing when no screen was held, or when it was drawn before the language settled", () => {
    let woken = 0;
    attachHeldScreenWake(() => (woken += 1));
    const c = clock();
    wakeHeldScreen(c.later);
    expect(c.queue.length).toBe(0);
    heldScreenHeld();
    heldScreenDrawn();
    wakeHeldScreen(c.later);
    expect(c.queue.length).toBe(0);
    expect(woken).toBe(0);
  });

  it("starts once, however many times the language is said to be settled", () => {
    let woken = 0;
    attachHeldScreenWake(() => (woken += 1));
    heldScreenHeld();
    const c = clock();
    wakeHeldScreen(c.later);
    wakeHeldScreen(c.later);
    expect(c.queue.length).toBe(1);
    while (c.queue.length) c.run();
    expect(woken).toBe(HELD_SCREEN_WAKES);
  });
});

describe("the hold wakes its held screen (components/i18n/LaunchLanguageGate.tsx)", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "components/i18n/LaunchLanguageGate.tsx"), "utf8");
  const hold = src.slice(src.indexOf("function HoldInTheApps"));

  it("says a screen was held before it suspends on the language", () => {
    expect(hold).toMatch(/heldScreenHeld\(\);\s*use\(languageSettledPromise\(\)\);/);
  });

  it("wakes with an update of its own, as a transition, so the screen's own render is never interrupted", () => {
    expect(hold).toMatch(/attachHeldScreenWake\(\(\) => startTransition\(nudge\)\)/);
    expect(hold).toMatch(/subscribeLanguageSettled\(\(\) => wakeHeldScreen\(\)\)/);
  });

  it("says the screen is drawn from the commit that draws it", () => {
    expect(hold).toMatch(/useLayoutEffect\(\(\) => \{\s*if \(onAScreen\) heldScreenDrawn\(\);/);
  });
});
