import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestQuoteFocus, takeQuoteFocus, takeQuoteLanding } from "@/lib/reading/quoteFocus";

/**
 * Updates 94 (1.9): Gate 4's two cuts, held.
 *
 * "Read it in Purify" on /prayers/bows/ (Canon XC of Trullo, #s91) opened the
 * page, then went to the place the address names, then to the section's top
 * (useLanding), then to the quoted words (QuoteFocus, two frames or 120ms
 * later): three steps on the screen, 54% of the change in one frame. Now the
 * words are looked for in the change that draws them, and the section's top
 * yields to them, so the page opens at the words in one step.
 *
 * "See all" on /reading/ was the router's soft visit to the same page, and the
 * room turned into its list in one frame (51% at 195ms). Now it opens in
 * place through the house's in-page move (lib/ui/inPageMove.ts).
 */
const ROOT = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("a page opened to light a quotation lands once", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("the page whose request was taken makes its first landing the quotation's, once", () => {
    requestQuoteFocus("/councils/third-constantinople/the-canons-of-trullo#s91", ["We have received"]);
    expect(takeQuoteLanding("/councils/third-constantinople/the-canons-of-trullo/")).toBe(false); // not taken yet
    expect(takeQuoteFocus("/councils/third-constantinople/the-canons-of-trullo/")).toEqual(["We have received"]);
    expect(takeQuoteLanding("/councils/first-nicaea/the-twenty-canons/")).toBe(false); // another page: and asking clears it
    requestQuoteFocus("/councils/third-constantinople/the-canons-of-trullo#s91", ["We have received"]);
    takeQuoteFocus("/councils/third-constantinople/the-canons-of-trullo");
    expect(takeQuoteLanding("/councils/third-constantinople/the-canons-of-trullo")).toBe(true);
    expect(takeQuoteLanding("/councils/third-constantinople/the-canons-of-trullo")).toBe(false); // the reader's next landing is its own
  });

  it("QuoteFocus looks for the words in the change that draws them, not frames later", () => {
    const src = read("components/reading/QuoteFocus.tsx");
    expect(src).toMatch(/useIsoLayoutEffect\(\(\) => \{\s*const texts = takeQuoteFocus\(pathname\);/);
    // The first look at once, before the frames' second look.
    expect(src).toMatch(/\n\s*search\(\);\n[\s\S]*?frame = requestAnimationFrame\(\(\) => \{\s*frame = requestAnimationFrame\(search\);/);
    // Words still to come are looked for as they are drawn, until they have been brought up.
    expect(src).toMatch(/if \(coming && !scrolled\) search\(\);\s*else queued = setTimeout\(search, 120\);/);
  });

  it("the reader's first landing at a section's top yields to the quotation", () => {
    const src = read("components/saints/useWorkPlace.ts");
    expect(src).toMatch(/if \(takeQuoteLanding\(window\.location\.pathname\)\) return;\s*window\.scrollTo\(\{ top: 0, behavior: "instant" \}\);/);
  });
});

describe("See all opens the room's list in place", () => {
  const src = read("components/reading/CoverRow.tsx");

  it("a See all that is a query on the room moves in place, held until the list is drawn", () => {
    expect(src).toContain("onClick={(e) => openListInPlace(e, seeAll)}");
    const fn = src.slice(src.indexOf("export function openListInPlace"), src.indexOf("/** Whether a row is about to be seen"));
    expect(fn).toMatch(/if \(!href\.startsWith\("\?"\) \|\| e\.defaultPrevented \|\| e\.button > 0 \|\| e\.metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey\) return;/);
    expect(fn).toContain("e.preventDefault();");
    // A state of null, so the router hears the address and the room reads it.
    expect(fn).toContain('movePageUntil(() => window.history.pushState(null, "", href), awaitArrival(SEE_ALL_ARRIVED));');
  });

  it("the rows say the list has come as they leave, in the change that draws it", () => {
    expect(src).toContain("useLayoutEffect(() => () => arrive(SEE_ALL_ARRIVED), []);");
    // And the room does draw its list in the rows' place (components/reading/ReadingRoom.tsx).
    expect(read("components/reading/ReadingRoom.tsx")).toMatch(/\{open \? \(\s*<ReadingSearch [^>]*\/>\s*\) : \(\s*<div data-reading-home="">/);
  });
});
