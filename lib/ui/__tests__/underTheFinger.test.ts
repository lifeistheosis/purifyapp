import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HOLD_MS, scrollToHold } from "@/lib/ui/useHeldPlace";

/**
 * Nothing moves under the finger (his build 93 note 16 kind, "a page that
 * jumps under the finger"; the pre-build gate's first rule for a tap). The
 * places a fresh pair of eyes and the gate's tap walk found on build 93
 * (docs/1.9-build/notes/fresh-eyes.md, gate-run-1.md), each measured on the
 * export with real touch before it was mended:
 *
 *  - L3, a reading plan: a day marked read brought a line in over the days
 *    (41px), and the card over them turned to the next day, taller or
 *    shorter (up to 48px).
 *  - L7, Saints: a kind chosen took the pinned card away from over the
 *    kinds, and "All" put it back: 436px at 820 wide, 792px at 360.
 *  - A reading path: "Mark as read" turned to "Read" and its pill went from
 *    114px wide to 66px, so its middle left the finger by 24px.
 *  - M4, Chants: a tradition chosen over "All chants" shortened the list,
 *    the page with it, and the scroll was pulled back 64 to 128px.
 *
 * A page can do this in two ways, and each has one answer:
 *
 *  - It gets shorter BELOW the finger (Chants, and the list under Saints'
 *    filters). That is the root's to mind, for every page at once: after any
 *    tap the page keeps the length the reader is looking at
 *    (lib/ui/keepLength.ts, Fable Theology's; its own test holds it). No
 *    page holds a list of its own as well: two holds on one page would
 *    quarrel, and this file fails one that tries.
 *  - It changes ABOVE the finger (a plan). The root lets go of that case by
 *    design, and lib/ui/useHeldPlace.ts answers it: the pressed thing is
 *    kept where it is on the screen while what is over it changes.
 *
 * And where it can be, the page is simply made not to change: Saints' pinned
 * card and its Clear, a path's pill.
 *
 * The walk on the export is what measures 0px; this holds the arithmetic and
 * each page to its mend.
 *
 * What would go wrong if this broke: a reader taps a filter or a day's
 * circle and the page slides, so the next tap lands on something else.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("a page that gets shorter below the finger", () => {
  it("is kept by the one hold at the root, and no page of these keeps a list of its own", () => {
    // The root's hold is there, and hears every tap before anything the tap does.
    expect(read("components/nav/OpenedBridge.tsx")).toContain('document.addEventListener("click", noteTap, true)');
    // The page-by-page hold this chat first made (a least height on the list at the tap) is gone.
    expect(fs.existsSync(path.join(ROOT, "lib/ui/useHeldFoot.ts"))).toBe(false);
    for (const page of ["components/chants/ChantsHome.tsx", "components/saints/SaintsBrowser.tsx", "components/plans/PlanClient.tsx", "components/plans/PlanPath.tsx"]) {
      const src = code(page);
      expect(src, page).not.toMatch(/useHeldFoot|minHeight|min-h-\[\$\{/);
    }
  });
});

describe("what is over the saints' filters", () => {
  const src = code("components/saints/SaintsBrowser.tsx");

  it("never changes when a filter is chosen: the pinned card stays pinned", () => {
    expect(src).toMatch(/\{featured\.map\(\(s\) => \(\s*<div key=\{s\.slug\} className="mt-10">\s*<FeaturedSaintCard saint=\{s\} \/>/);
    expect(src).not.toMatch(/!isFiltering &&\s*featured\.map/);
    // A saint it shows is still found in the list where the filter is hers.
    expect(src).toContain("const pool = isFiltering ? saints : rest;");
  });

  it("keeps the label's row one height: Clear is always in it, unseen until there is something to clear", () => {
    const at = src.indexOf('t("saints.clearFilters")');
    const button = src.slice(src.lastIndexOf("<button", at), at);
    expect(button).toContain("disabled={!isFiltering}");
    expect(button).toContain("aria-hidden={!isFiltering || undefined}");
    expect(button).toContain('!isFiltering && "invisible"');
    // Not drawn only while filtering, which grew the row by 3px as it came.
    expect(src.slice(src.lastIndexOf("{", src.lastIndexOf("<button", at)), src.lastIndexOf("<button", at))).not.toContain("isFiltering ?");
    // Placed by start and end, so it turns in Arabic.
    expect(button).toContain("-me-3");
    expect(button).not.toMatch(/-m[lr]-\d/);
  });
});

describe("a page that changes above the finger", () => {
  it("is scrolled by as much as the pressed thing moved, within what the page can scroll", () => {
    // A line came in over it: the thing went down 41px, so the page goes down 41px and it is back.
    expect(scrollToHold({ was: 527.5, now: 568.9, scrollY: 0, max: 400 })).toBeCloseTo(41.4);
    // A row left over it while the page was scrolled: the page comes back up by the row.
    expect(scrollToHold({ was: 400, now: 340.5, scrollY: 300, max: 900 })).toBeCloseTo(240.5);
    // At the very top there is nothing above to scroll to: this cannot answer a part that shrinks there.
    expect(scrollToHold({ was: 400, now: 340.5, scrollY: 20, max: 900 })).toBe(0);
    // And never past the page's end.
    expect(scrollToHold({ was: 400, now: 500, scrollY: 850, max: 900 })).toBe(900);
    expect(scrollToHold({ was: 400, now: 400, scrollY: 123, max: 900 })).toBe(123);
    // Long enough for the change a tap makes to be drawn, short enough to be gone before the next scroll.
    expect(HOLD_MS).toBeGreaterThanOrEqual(300);
    expect(HOLD_MS).toBeLessThanOrEqual(1000);
  });

  it("answers each drawing before it is seen, and lets go of a thing that has left the page", () => {
    const src = code("lib/ui/useHeldPlace.ts");
    expect(src).toContain("frame = requestAnimationFrame(keep);");
    expect(src).toContain("if (!el.isConnected) return stop();");
    // The reader's next touch is theirs: a finger that starts to scroll within the hold is not scrolled back.
    expect(src).toContain('const theirs = ["touchstart", "pointerdown", "wheel", "keydown"] as const;');
    expect(src).toMatch(/const stop = \(\) => \{\s*holding = false;\s*cancelAnimationFrame\(frame\);/);
    expect(src).toContain("for (const e of theirs) window.addEventListener(e, stop, { capture: true, passive: true });");
    expect(src).toContain('window.scrollTo({ top, behavior: "instant" });');
    // A part that does not get shorter under a tap, for the top of a page. At the tap it is told to stay
    // as tall as it is, to the fraction, which changes nothing and is the one thing that stops it shrinking.
    expect(src).toMatch(/const keep = useCallback\(\(\) => \{[\s\S]*?const base = el\.getBoundingClientRect\(\)\.height;[\s\S]*?el\.style\.minHeight = `\$\{base\}px`;/);
    // Nothing is written on the page before a tap: the watcher leaves a part alone that was never tapped.
    expect(src).toMatch(/if \(base === 0\) return;/);
    // What it gains in the moment after the tap it gains by whole pixels, so the scroll, which moves by
    // whole pixels, can answer it exactly; what it gains later is not a tap's doing.
    expect(src).toMatch(/if \(performance\.now\(\) > until\) return;\s*const gained = el\.getBoundingClientRect\(\)\.height - base;\s*if \(gained > 0\.01\) el\.style\.minHeight = `\$\{base \+ Math\.ceil\(gained - 0\.01\)\}px`;/);
    // A new width starts it afresh.
    expect(src).toMatch(/if \(el\.offsetWidth !== width\) \{\s*tap\.current = \{ base: 0, width: 0, until: 0 \};\s*el\.style\.minHeight = "";/);
  });

  it("holds a reading plan's day under the finger that marks it", () => {
    const page = code("components/plans/PlanClient.tsx");
    const days = code("components/plans/PlanPath.tsx");
    // The circle hands itself up, and the page holds it before the mark is made.
    expect(days).toContain("onClick={(e) => onToggle(i, !isRead, e.currentTarget)}");
    expect(page).toMatch(/const toggle = \(day: number, read: boolean, pressed: Element\) => \{[\s\S]*?hold\(pressed\);\s*keepHead\(\);\s*if \(read\) completeDay\(plan, day\);/);
    expect(page).toContain("const hold = useHeldPlace();");
    // Everything over the days is told, at the mark, to stay as tall as it is.
    expect(page).toContain("const { ref: head, keep: keepHead } = useNoShrink<HTMLDivElement>();");
    expect(page).toMatch(/<div ref=\{head\}>\s*\{mounted && finished \? \(/);
    expect(page.indexOf("<div ref={head}>")).toBeLessThan(page.indexOf("<PlanPath "));
  });

  it("holds a council's Father under the finger that chooses him", () => {
    // The card over the row of faces turns to the Father tapped, taller or shorter by his name, byname and part:
    // the face moved 14 to 106px under the finger on three councils (the gate's tap walk, 2026-11-12).
    const fathers = code("components/councils/CouncilFathers.tsx");
    expect(fathers).toContain("const hold = useHeldPlace();");
    expect(fathers).toContain("const { ref: cardPlace, keep: keepCard } = useNoShrink<HTMLDivElement>();");
    // The card's place is the part that never shrinks, and it stands over the row.
    expect(fathers).toContain('<div ref={cardPlace} className="mt-3" aria-live="polite">');
    expect(fathers.indexOf("<div ref={cardPlace}")).toBeLessThan(fathers.indexOf("<ul "));
    // The face hands itself up, and is held before the Father is chosen.
    expect(fathers).toMatch(/onClick=\{\(e\) => \{\s*hold\(e\.currentTarget\);\s*keepCard\(\);\s*setPicked\(i\);/);
  });

  it("lets the line of days in a row come and go inside the part that never shrinks", () => {
    const page = code("components/plans/PlanClient.tsx");
    // The line is over the days and inside the head, so its going leaves its room and its coming is answered by the hold.
    const head = page.slice(page.indexOf("<div ref={head}>"), page.indexOf("<PlanPath "));
    expect(head.match(/<p data-plan-streak=""/g)).toHaveLength(2);
    expect(head).toContain('t("plans.catchUp", { streak: tn("plans.streak", catching) })');
    expect(head).toContain('tn("plans.streak", streak)');
    // Its room is not kept before there is a line: that set the days lower at rest.
    expect(page).not.toMatch(/className="invisible">\s*\{tn\("plans\.streak"/);
  });

  it("keeps a day that has been in the window in it: no row leaves from over the finger", () => {
    const days = code("components/plans/PlanPath.tsx");
    expect(days).toContain("const [first, setFirst] = useState<number | null>(null);");
    expect(days).toContain("const from = first === null ? start : Math.min(first, start);");
    expect(days).toContain("if (first !== from) setFirst(from);");
    expect(days).not.toMatch(/const from = Math\.max\(0, anchor - BEHIND\);/);
  });
});

describe("a control that changes its own size under the finger", () => {
  it("a reading path's pill is one width whether the day is read or not", () => {
    const src = code("components/reading/PathView.tsx");
    const at = src.indexOf("aria-pressed={read}");
    const button = src.slice(src.lastIndexOf("<button", at), src.indexOf("</button>", at));
    // Both lines stand in the one cell, so the pill is as wide as the longer of them.
    expect(button).toContain("inline-grid");
    expect(button).toContain("justify-items-center");
    expect(button).toMatch(/<span aria-hidden=\{read\} className=\{`col-start-1 row-start-1 \$\{read \? "invisible" : ""\}`\}>\s*\{t\("paths\.markRead"\)\}/);
    expect(button).toMatch(/<span aria-hidden=\{!read\} className=\{`col-start-1 row-start-1 \$\{read \? "" : "invisible"\}`\}>\s*\{t\("paths\.read"\)\}/);
    // Never one line or the other, which made the pill as wide as whichever it held.
    expect(button).not.toMatch(/read \? t\("paths\.read"\) : t\("paths\.markRead"\)/);
    // Still 44 to the touch.
    expect(button).toContain("hit-44");
  });
});
