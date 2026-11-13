// What floats at the foot steps aside for a toast (build 95 note 7).
//
// His word, 2026-11-13 07:29 UTC, on build 96, with a screenshot of John 1:5
// just after highlighting a verse: "ui overlalping". Reproduced on the export
// at 390 with touch and motion on: a double tap on the verse put the
// Highlighted toast (components/ui/UndoBar.tsx, z-55, standing directly over
// the tab bar) over the chapter pill (z-40, 12px over the tab bar): the toast
// at 699 to 758, the pill at 661 to 746, its rounded top and its Listen
// button showing above the toast. The works reader's pill, the reader's dock
// and the day's readings bar stand in the same band.
//
// The suite runs on node (vitest.config.ts), so the helper is driven against
// a stubbed document, as overlay.test.ts does; the stylesheet and the
// components are read as text. scripts/toast-walk.mjs watches the built app.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TOAST_RETURN_MS, toastRises } from "@/lib/ui/overlay";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (selector: string) => {
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    if (m[1].split(",").map((s) => s.trim()).includes(selector)) out.push(m[2]);
  }
  return out.join("\n");
};

/** Everything at the foot but the two the toast stands above. */
const BAND = '[data-screen-edge="bottom"]:not([data-tab-bar]):not([data-mini-player])';

type Stub = { body: { dataset: Record<string, string> } };
const body = () => (globalThis as unknown as { document: Stub }).document.body;

describe("a toast at the foot (build 95 note 7)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as unknown as { document: Stub }).document = { body: { dataset: {} } };
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as unknown as { document?: Stub }).document;
  });

  it("marks the page while it shows, for as long as any toast shows", () => {
    const one = toastRises();
    expect(body().dataset.toastUp).toBe("1");
    const two = toastRises();
    one();
    one();
    expect(body().dataset.toastUp).toBe("1");
    two();
    expect(body().dataset.toastUp).toBeUndefined();
  });

  it("times the return of what stepped aside, then lets it be", () => {
    const end = toastRises();
    end();
    expect(body().dataset.toastLeaving).toBe("1");
    vi.advanceTimersByTime(TOAST_RETURN_MS - 1);
    expect(body().dataset.toastLeaving).toBe("1");
    vi.advanceTimersByTime(1);
    expect(body().dataset.toastLeaving).toBeUndefined();
  });

  it("shown again as what stepped aside comes back, it goes again at once", () => {
    toastRises()();
    expect(body().dataset.toastLeaving).toBe("1");
    const again = toastRises();
    expect(body().dataset.toastUp).toBe("1");
    expect(body().dataset.toastLeaving).toBeUndefined();
    vi.advanceTimersByTime(TOAST_RETURN_MS * 2);
    expect(body().dataset.toastUp).toBe("1");
    again();
  });
});

describe("what steps aside for a toast (build 95 note 7)", () => {
  it("the Undo bar marks its band before its first frame, and comes 40ms after what it meets begins to go", () => {
    const bar = read("components/ui/UndoBar.tsx");
    expect(bar).toMatch(/useLayoutEffect\(\(\) => \{\s*if \(!showing\) return;\s*return toastRises\(\);\s*\}, \[showing\]\);/);
    expect(bar).toContain("motion-safe:animate-[undo-in_220ms_cubic-bezier(0.22,1,0.36,1)_40ms_backwards]");
  });

  it("everything at the foot but the tab bar and the mini player goes, out of reach, in the time a page takes to leave", () => {
    const up = rule(`body[data-toast-up] ${BAND}`);
    expect(up).toMatch(/opacity:\s*0 !important;/);
    expect(up).toMatch(/visibility:\s*hidden !important;/);
    expect(up).toMatch(/opacity var\(--duration-route-exit\) var\(--ease-house\),\s*visibility 0s linear var\(--duration-route-exit\) !important;/);
  });

  it("and comes back as the toast goes, in the time a page takes to arrive", () => {
    expect(rule(`body[data-toast-leaving]:not([data-toast-up]) ${BAND}`)).toMatch(/opacity var\(--duration-route-enter\) var\(--ease-house\),\s*visibility 0s !important;/);
  });

  it("goes and comes at once under the motion switch", () => {
    expect(rule(`:where([data-motion="reduce"]) body[data-toast-up] ${BAND}`)).toMatch(/transition:\s*none !important;/);
    expect(rule(`:where([data-motion="reduce"]) body[data-toast-leaving]:not([data-toast-up]) ${BAND}`)).toMatch(/transition:\s*none !important;/);
    // After the rules it quiets, which weigh the same.
    expect(css.indexOf(`:where([data-motion="reduce"]) body[data-toast-up] ${BAND}`)).toBeGreaterThan(css.indexOf(`\nbody[data-toast-leaving]:not([data-toast-up]) ${BAND}`));
  });

  it("reaches every bar that floats in the toast's band, and leaves the two it stands above", () => {
    // In the band: the chapter pill, the reader's dock, a work's pill, the
    // day's readings bar, a verse's tools. Each says it stands at the foot.
    for (const file of [
      "components/bible/MobileChapterPill.tsx",
      "components/bible/ReaderDock.tsx",
      "components/saints/MobileWorkPill.tsx",
      "components/flow/FlowBarShell.tsx",
      "components/bible/MobileVerseToolbar.tsx",
    ]) {
      expect(read(file), file).toContain('data-screen-edge="bottom"');
    }
    // Under it, and stood above: the tab bar and the mini player.
    expect(read("components/nav/MobileTabBar.tsx")).toMatch(/data-tab-bar\s/);
    expect(read("components/prayers/NowPlayingBar.tsx")).toContain('data-mini-player=""');
    // The toast itself is not one of them.
    expect(read("components/ui/UndoBar.tsx")).not.toContain("data-screen-edge");
  });
});
