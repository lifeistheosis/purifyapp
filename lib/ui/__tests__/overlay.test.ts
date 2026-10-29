// The counted page-scroll lock. Pins the exact interleave that made the
// Bible reader look frozen: two overlays on one page (the reader has four),
// each doing its own save/restore, leaving `overflow: hidden` stuck on with
// nothing open. See lib/ui/overlay.ts for the failure trace.
//
// And where the lock goes (build 80, the owner's note 2): on <html>, never on
// <body>. app/globals.css clips the root's width on phones and in the apps,
// and a root that is not `visible` keeps the body's overflow from reaching
// the viewport, so a body lock let the page scroll under every sheet and
// turned the body into a scroll container that pinned the sticky top bars
// off the screen.
//
// The suite runs on the `node` environment for startup speed (vitest.config),
// so rather than pull in jsdom for one file we stub the only things the
// module touches: the two elements' style.overflow and document.body.dataset.

import { describe, it, expect, beforeEach } from "vitest";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";

type Stub = {
  documentElement: { style: { overflow: string } };
  body: { style: { overflow: string }; dataset: Record<string, string> };
};

function installDocumentStub() {
  (globalThis as unknown as { document: Stub }).document = {
    documentElement: { style: { overflow: "" } },
    body: { style: { overflow: "" }, dataset: {} },
  };
}

function doc(): Stub {
  return (globalThis as unknown as { document: Stub }).document;
}

function overflow(): string {
  return doc().documentElement.style.overflow;
}

function setOverflow(v: string) {
  doc().documentElement.style.overflow = v;
}

beforeEach(() => {
  installDocumentStub();
  // Drain any depth left by a previous test, then start from a clean root.
  for (let i = 0; i < 10; i++) unlockBodyScroll();
  setOverflow("");
});

describe("counted page scroll lock", () => {
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

  it("locks the root, and never the body", () => {
    lockBodyScroll();
    expect(doc().documentElement.style.overflow).toBe("hidden");
    // A body with `overflow: hidden` under a clipped root is a scroll
    // container of its own: the page scrolls on, and the sticky bars leave.
    expect(doc().body.style.overflow).toBe("");
    unlockBodyScroll();
    expect(doc().body.style.overflow).toBe("");
  });
});
