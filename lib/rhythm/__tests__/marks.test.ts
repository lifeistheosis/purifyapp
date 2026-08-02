// Marks ride the existing `purify.prayers.<id>.dates` ledger. These tests pin
// the three properties that make that safe to build on: idempotence, the cap,
// and the fact that a mark fires the same event the sync bridge already
// listens for. Without that last one a strand would be written locally and
// never pushed, which is exactly the bug this whole release is fixing.

import { beforeEach, describe, expect, it } from "vitest";

import { startOfDayLocal } from "@/lib/calendar/orthodox";
import { PRAYER_EVENT } from "@/lib/prayers/storage";
import { isKept, markKept, rhythm, strandKey, unmark } from "../marks";

/** Minimal localStorage + event target, since vitest runs in node here. */
function installDom() {
  const store = new Map<string, string>();
  const listeners = new Map<string, ((e: Event) => void)[]>();
  const win = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    },
    dispatchEvent: (e: Event) => {
      for (const fn of listeners.get(e.type) ?? []) fn(e);
      return true;
    },
    addEventListener: (t: string, fn: (e: Event) => void) => {
      listeners.set(t, [...(listeners.get(t) ?? []), fn]);
    },
  };
  (globalThis as { window?: unknown }).window = win;
  if (!("CustomEvent" in globalThis)) {
    (globalThis as { CustomEvent?: unknown }).CustomEvent = class {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    };
  }
  return { store, win };
}

const DAY = startOfDayLocal(new Date("2026-08-02T12:00:00Z"));
const KEY = "2026-08-02";

let dom: ReturnType<typeof installDom>;

beforeEach(() => {
  dom = installDom();
});

describe("day marks", () => {
  it("namespaces strands so they cannot collide with a real rule", () => {
    expect(strandKey("gospel")).toBe("day:gospel");
    // No rule id in lib/prayers/rules.ts contains a colon; that is the
    // guarantee the namespace rests on.
    expect(strandKey("saint")).toContain(":");
  });

  it("marks and reads back under the civil day", () => {
    markKept("day:gospel", KEY);
    expect(isKept("day:gospel", KEY)).toBe(true);
    expect(dom.store.get("purify.prayers.day:gospel.dates")).toBe(
      JSON.stringify([KEY]),
    );
  });

  it("is idempotent, so a call site that fires repeatedly is harmless", () => {
    markKept("day:saint", KEY);
    markKept("day:saint", KEY);
    markKept("day:saint", KEY);
    expect(JSON.parse(dom.store.get("purify.prayers.day:saint.dates")!)).toEqual(
      [KEY],
    );
  });

  it("fires the event the sync bridge listens for", () => {
    const seen: string[] = [];
    dom.win.addEventListener(PRAYER_EVENT, () => seen.push("fired"));
    markKept("day:reading", KEY);
    expect(seen).toHaveLength(1);
    // A no-op mark must not fire, or the debounced push thrashes.
    markKept("day:reading", KEY);
    expect(seen).toHaveLength(1);
  });

  it("undo removes the mark", () => {
    markKept("day:teaching", KEY);
    unmark("day:teaching", KEY);
    expect(isKept("day:teaching", KEY)).toBe(false);
  });

  it("keeps the newest 30 days and keeps them sorted", () => {
    for (let i = 0; i < 40; i++) {
      const d = new Date(Date.UTC(2026, 5, 1 + i, 12));
      markKept("day:gospel", d.toISOString().slice(0, 10));
    }
    const dates = JSON.parse(
      dom.store.get("purify.prayers.day:gospel.dates")!,
    ) as string[];
    expect(dates).toHaveLength(30);
    expect(dates).toEqual([...dates].sort());
    expect(dates.at(-1)).toBe("2026-07-10");
  });

  it("builds a 14-day window ending on the given day", () => {
    markKept("day:gospel", "2026-08-02");
    markKept("day:gospel", "2026-07-28");
    const row = rhythm("day:gospel", DAY, 14);
    expect(row).toHaveLength(14);
    expect(row.at(-1)).toEqual({ date: "2026-08-02", kept: true });
    expect(row.find((r) => r.date === "2026-07-28")?.kept).toBe(true);
    expect(row.find((r) => r.date === "2026-07-29")?.kept).toBe(false);
  });

  it("never throws when storage is unavailable", () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        key: () => null,
        length: 0,
      },
      dispatchEvent: () => true,
    };
    expect(() => markKept("day:gospel", KEY)).not.toThrow();
    expect(() => isKept("day:gospel", KEY)).not.toThrow();
  });
});
