// Nothing on a reader's page moves after it arrives (Gate 3c, groups 5 and 8;
// docs/handoffs/updates-84.md). Each case fails on the code before the mend.
import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { GLIDE_MS, gliding, goToReadingPlace } from "../readingPlace";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const LINES = ["components/bible/ChapterVerseStatus.tsx", "components/saints/MobileWorkPill.tsx"];

/** A window that scrolls where it is told, at once or later (a glide). */
function stubWindow(motion: "on" | "reduce") {
  const win = {
    scrollY: 0,
    innerHeight: 844,
    asked: [] as ScrollToOptions[],
    scrollTo(o: ScrollToOptions) {
      win.asked.push(o);
      if (o.behavior !== "smooth") win.scrollY = o.top ?? 0;
    },
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    documentElement: { scrollHeight: 20000, dataset: { motion: motion === "reduce" ? "reduce" : "" }, classList: { contains: () => false } },
    querySelector: () => null,
    querySelectorAll: () => [],
  });
  return win;
}
const verseAt = (top: number) => ({ getBoundingClientRect: () => ({ top, bottom: top + 40, left: 0, right: 390, width: 390, height: 40 }) }) as unknown as Element;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("a glide to the reading place is known while it runs", () => {
  it("a smooth trip is gliding until the page lands, then not", () => {
    const win = stubWindow("on");
    const top = goToReadingPlace(verseAt(3000), { band: { top: 0, bottom: 760 } });
    expect(win.asked.at(-1)?.behavior).toBe("smooth");
    expect(gliding()).toBe(true);
    win.scrollY = (top ?? 0) / 2;
    expect(gliding()).toBe(true);
    win.scrollY = top ?? 0;
    expect(gliding()).toBe(false);
  });

  it("a glide the reader stops short is let go after GLIDE_MS", () => {
    vi.useFakeTimers();
    stubWindow("on");
    goToReadingPlace(verseAt(3000), { band: { top: 0, bottom: 760 } });
    expect(gliding()).toBe(true);
    vi.advanceTimersByTime(GLIDE_MS + 1);
    expect(gliding()).toBe(false);
  });

  it("a trip made at once (motion reduced, or asked so) glides nowhere", () => {
    const win = stubWindow("reduce");
    goToReadingPlace(verseAt(3000), { smooth: false, band: { top: 0, bottom: 760 } });
    expect(win.asked.at(-1)?.behavior).toBe("auto");
    expect(gliding()).toBe(false);
  });
});

describe("a running line is drawn with the page, never a frame behind it", () => {
  for (const file of LINES) {
    const src = read(file);
    it(`${file}: opens from a read in the frame the page moved, not from an observer`, () => {
      expect(src).not.toMatch(/new IntersectionObserver/);
      expect(src).toMatch(/requestAnimationFrame\(\(\) => settle\(flushSync\)\)/);
      expect(src).toMatch(/import \{ flushSync \} from "react-dom"/);
    });
    it(`${file}: reads its place before the first paint`, () => {
      expect(src).toMatch(/useIsoLayoutEffect\(\(\) => \{/);
      expect(src).toMatch(/settle\(\(set\) => set\(\)\)/);
    });
    it(`${file}: a shut line waits out a glide and opens once`, () => {
      expect(src).toMatch(/if \(!open && gliding\(\)\) return;/);
    });
  }
});

describe("a page within a section is not drawn under the way back it left (reduced motion)", () => {
  it("with no fade to carry, the template's wrapper is no box", () => {
    const css = read("app/globals.css");
    const rule = css.match(/:where\(\[data-motion="reduce"\]\) \.route-fade \{([^}]*)\}/);
    expect(rule?.[1]).toMatch(/animation: none;/);
    expect(rule?.[1]).toMatch(/display: contents;/);
  });
});
