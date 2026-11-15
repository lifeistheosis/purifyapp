import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Build 98, the dock's "1x" jump (Updates 98a): with a chapter read aloud,
// the reading that ends rolls on into the next chapter, and the page opens a
// moment before its reading begins (ReadAloudFollow takes the ask once the
// page is drawn; the voice and the timings are found before anything plays).
// For that moment the dock on the new chapter read it as not loaded and
// offered Listen in Speed's place, then Speed: the one button jumped 52px
// (measured on the export by Updates 98g: Listen for 54ms on John 11 as
// John 10 ended). The reading on its way now counts as loaded, from the ask
// until it has begun or could not.
//
// Fails on 78c5297e1: rollOn.ts has no mark of a reading on its way, and the
// pill decides by the loaded address alone.

const root = join(__dirname, "..", "..", "..");
const code = (file: string) => readFileSync(join(root, file), "utf8");

class Session {
  private items = new Map<string, string>();
  getItem(k: string) {
    return this.items.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.items.set(k, String(v));
  }
  removeItem(k: string) {
    this.items.delete(k);
  }
}

const g = globalThis as unknown as { window?: { sessionStorage: Session } };

describe("a chapter's reading on its way", () => {
  beforeEach(() => {
    g.window = { sessionStorage: new Session() };
  });
  afterEach(() => {
    delete g.window;
  });

  it("is on its way from the ask until it has begun, and only for its chapter", async () => {
    const roll = await import("../rollOn");
    roll.forgetComing();
    expect(roll.readingComing("john", 11)).toBe(false);
    expect(roll.askToListenAt("john", 11)).toBe(true);
    expect(roll.readingComing("john", 11)).toBe(true);
    expect(roll.readingComing("john", 10)).toBe(false);
    // The page takes the ask as it opens: still on its way, until the reading begins.
    expect(roll.takeListenAsk("john", 11)).toBe(true);
    expect(roll.readingComing("john", 11)).toBe(true);
    // Taken once: a second effect run does not start it again.
    expect(roll.takeListenAsk("john", 11)).toBe(false);
    roll.readingCame("john", 11);
    expect(roll.readingComing("john", 11)).toBe(false);
  });

  it("survives a reload, which keeps the ask in the session and forgets the rest", async () => {
    const roll = await import("../rollOn");
    roll.forgetComing();
    roll.askToListenAt("romans", 2);
    roll.forgetComing();
    expect(roll.readingComing("romans", 2)).toBe(true);
    expect(roll.takeListenAsk("romans", 2)).toBe(true);
    expect(roll.readingComing("romans", 2)).toBe(true);
    // Another chapter's reading coming to an end changes nothing here.
    roll.readingCame("romans", 3);
    expect(roll.readingComing("romans", 2)).toBe(true);
    roll.readingCame("romans", 2);
    expect(roll.readingComing("romans", 2)).toBe(false);
  });

  it("tells the pill as it changes", async () => {
    const roll = await import("../rollOn");
    roll.forgetComing();
    const rollCode = code("lib/readAloud/rollOn.ts");
    expect(rollCode).toMatch(/export function useReadingComing\(book: string, chapter: number\): boolean \{\s*return useSyncExternalStore\(subscribe, \(\) => readingComing\(book, chapter\), \(\) => false\);/);
    for (const fn of ["askToListenAt", "takeListenAsk", "readingCame"]) {
      const body = rollCode.slice(rollCode.indexOf(`export function ${fn}(`));
      expect(body.slice(0, body.indexOf("\n}\n")), fn).toContain("tell();");
    }
  });
});

describe("the dock arriving on a chapter whose reading is on its way", () => {
  it("offers Speed from its first frame, not Listen", () => {
    const pill = code("components/bible/MobileChapterPill.tsx");
    expect(pill).toContain('import { useReadingComing } from "@/lib/readAloud/rollOn";');
    expect(pill).toMatch(/const coming = useReadingComing\(slug, chapter\);\s*const hereLoaded =\s*coming \|\|/);
    expect(pill).toContain("const listenHere = reads && !hereLoaded;");
  });

  it("is on its way until the page's reading has begun or could not", () => {
    const follow = code("components/bible/ReadAloud.tsx");
    expect(follow).toMatch(
      /if \(!available \|\| !takeListenAsk\(book, chapter\)\) return;[\s\S]{0,200}void listenToChapter\(\{[^\n]*\}\)\.finally\(\(\) => readingCame\(book, chapter\)\);/,
    );
  });
});
