// The counted body-scroll lock. Pins the exact interleave that made the
// Bible reader look frozen: two overlays on one page (the reader has four),
// each doing its own save/restore, leaving `overflow: hidden` stuck on with
// nothing open. See lib/ui/overlay.ts for the failure trace.
//
// The suite runs on the `node` environment for startup speed (vitest.config),
// so rather than pull in jsdom for one file we stub the only two things the
// module touches: document.body.style.overflow and document.body.dataset.

import { describe, it, expect, beforeEach } from "vitest";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";

function installDocumentStub() {
  (globalThis as unknown as { document: unknown }).document = {
    body: { style: { overflow: "" }, dataset: {} as Record<string, string> },
  };
}

function overflow(): string {
  return (
    globalThis as unknown as { document: { body: { style: { overflow: string } } } }
  ).document.body.style.overflow;
}

function setOverflow(v: string) {
  (
    globalThis as unknown as { document: { body: { style: { overflow: string } } } }
  ).document.body.style.overflow = v;
}

beforeEach(() => {
  installDocumentStub();
  // Drain any depth left by a previous test, then start from a clean body.
  for (let i = 0; i < 10; i++) unlockBodyScroll();
  setOverflow("");
});

describe("counted body scroll lock", () => {
  it("locks and unlocks for a single overlay", () => {
    lockBodyScroll();
    expect(overflow()).toBe("hidden");
    unlockBodyScroll();
    expect(overflow()).toBe("");
  });

  it("stays locked until the LAST overlay closes", () => {
    lockBodyScroll(); // sheet A
    lockBodyScroll(); // sheet B opens while A is still animating out
    unlockBodyScroll(); // A unmounts
    expect(overflow()).toBe("hidden"); // B still open
    unlockBodyScroll(); // B closes
    expect(overflow()).toBe("");
  });

  it("does not strand the page locked when overlays close out of order", () => {
    // The exact reader sequence: chapter sheet open, settings sheet opens
    // during its 220ms exit, chapter sheet unmounts, settings sheet closes.
    // Under the old per-component save/restore this ended as "hidden".
    lockBodyScroll();
    lockBodyScroll();
    unlockBodyScroll();
    unlockBodyScroll();
    expect(overflow()).toBe("");
  });

  it("preserves a pre-existing overflow value set by the page", () => {
    setOverflow("clip");
    lockBodyScroll();
    lockBodyScroll();
    unlockBodyScroll();
    unlockBodyScroll();
    expect(overflow()).toBe("clip");
  });

  it("ignores unbalanced unlocks rather than going negative", () => {
    unlockBodyScroll();
    unlockBodyScroll();
    lockBodyScroll();
    expect(overflow()).toBe("hidden");
    unlockBodyScroll();
    expect(overflow()).toBe("");
  });
});
