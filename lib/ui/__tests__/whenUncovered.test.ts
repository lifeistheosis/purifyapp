// One question at a time (1.9, build 95 note 23). Purify's own ask before the
// phone's notification prompt rises at a reader's first download; a Bible in
// another language is chosen as its download begins, and the app's language
// offer asks at that same moment. Note 23's walk on the export found the two
// standing together (scripts/gate/downloads.mjs). So the ask waits until
// nothing else covers the screen (lib/ui/overlay.ts, whenUncovered), and rises
// as the cover lifts.
//
// What a reader would notice if this broke: two pop-ups at once, one over the
// other, at their first download.

import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

/** A body whose dataset the overlay counters write, and observers told of each change, as a browser tells them. */
const observers = new Set<{ cb: () => void; on: boolean }>();
const body = { dataset: {} as Record<string, string> };
Object.assign(globalThis, {
  document: { body },
  MutationObserver: class {
    private me: { cb: () => void; on: boolean };
    constructor(cb: () => void) {
      this.me = { cb, on: false };
      observers.add(this.me);
    }
    observe() {
      this.me.on = true;
    }
    disconnect() {
      this.me.on = false;
      observers.delete(this.me);
    }
  },
});
const changed = () => {
  for (const o of [...observers]) if (o.on) o.cb();
};

const { setOverlayOpen, whenUncovered } = await import("@/lib/ui/overlay");

afterEach(() => {
  while (body.dataset.overlayOpen) setOverlayOpen(false);
  observers.clear();
});

describe("whenUncovered", () => {
  it("runs at once when nothing covers the screen", () => {
    let ran = 0;
    whenUncovered(() => (ran += 1));
    expect(ran).toBe(1);
  });

  it("waits while something covers the screen, and runs once as the cover lifts", () => {
    setOverlayOpen(true); // the language offer
    let ran = 0;
    whenUncovered(() => (ran += 1));
    changed();
    expect(ran).toBe(0);
    setOverlayOpen(false); // answered
    changed();
    expect(ran).toBe(1);
    setOverlayOpen(true);
    changed();
    setOverlayOpen(false);
    changed();
    expect(ran).toBe(1);
  });

  it("waits for every cover, one over another", () => {
    setOverlayOpen(true); // the Translation sheet
    setOverlayOpen(true); // the language offer over it
    let ran = 0;
    whenUncovered(() => (ran += 1));
    setOverlayOpen(false);
    changed();
    expect(ran).toBe(0);
    setOverlayOpen(false);
    changed();
    expect(ran).toBe(1);
  });

  it("is how the downloads' ask rises", () => {
    const bridge = readFileSync(path.join(__dirname, "..", "..", "..", "components", "native", "DownloadsBridge.tsx"), "utf8");
    expect(bridge).toMatch(/onAskToNotify\(\(\) => new Promise<boolean>\(\(resolve\) => void whenUncovered\(\(\) => setAnswer\(\(\) => resolve\)\)\)\)/);
  });
});
