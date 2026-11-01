// A patron saved in the app reaches the widget and Today at once (note 85).
// The widget's side is held in lib/widget/__tests__/sync.test.ts; this holds
// the announcement and Today's name day card, which is a component and so is
// read from its source, as the sync is.

import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { readPatronAnswer } from "@/lib/widget/state";

import { PATRON_EVENT, TODAY_PATRON_KEY, announcePatron } from "../patronEvent";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A file's source with its comments taken out, so prose cannot pass for code. */
const code = (file: string) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("announcing a saved patron", () => {
  it("forgets Today's kept answer, then tells the app the saint the server saved", () => {
    const order: string[] = [];
    const removeItem = vi.fn((key: string) => void order.push(`forget ${key}`));
    const dispatchEvent = vi.fn((event: Event) => {
      order.push(`tell ${event.type}`);
      return true;
    });
    vi.stubGlobal("window", { localStorage: { removeItem }, dispatchEvent });

    announcePatron("apostle-paul");
    expect(order).toEqual([`forget ${TODAY_PATRON_KEY}`, `tell ${PATRON_EVENT}`]);
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent<unknown>;
    // In the shape the server answers a read with, so it is read the same way.
    expect(event.detail).toEqual({ slug: "apostle-paul" });
    expect(readPatronAnswer(200, event.detail)).toEqual({ kind: "saint", slug: "apostle-paul" });

    announcePatron(null);
    const cleared = dispatchEvent.mock.calls[1][0] as CustomEvent<unknown>;
    expect(cleared.detail).toEqual({ slug: null });
    expect(readPatronAnswer(200, cleared.detail)).toEqual({ kind: "none" });
  });

  it("still tells the app when the phone keeps no storage, and never throws without a window", () => {
    const dispatchEvent = vi.fn(() => true);
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
      dispatchEvent,
    });
    expect(() => announcePatron("apostle-paul")).not.toThrow();
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    expect(() => announcePatron(null)).not.toThrow();
  });
});

describe("Today's name day card", () => {
  const card = code("components/today/NameDayCard.tsx");

  it("keeps its answer where an announcement forgets it", () => {
    expect(card).toContain("window.localStorage.getItem(TODAY_PATRON_KEY)");
    expect(card).toContain("window.localStorage.setItem(TODAY_PATRON_KEY,");
    expect(card).not.toMatch(/"purify:nameday\.patron"/);
  });

  it("reads a 401 as the widget does: signed in, it is not 'no saint'", () => {
    expect(card).toContain("readPatronAnswer(res.status, body, true)");
  });

  it("follows a patron saved while it is on the screen, over an answer asked for before", () => {
    expect(card).toMatch(/window\.addEventListener\(PATRON_EVENT, onPatron\)/);
    expect(card).toMatch(/window\.removeEventListener\(PATRON_EVENT, onPatron\)/);
    expect(card).toContain("readPatronAnswer(200, saved)");
    expect(card).toMatch(/saves \+= 1;/);
    expect(card).toMatch(/if \(asked !== saves\) return;/);
  });
});
