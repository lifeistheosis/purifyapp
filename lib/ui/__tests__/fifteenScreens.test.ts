// The fifteen screens, round 1 (1.9; his yes to all five, 2026-11-13 about
// 20:47 UTC): Today, and the house rules that hold across the app.
// docs/1.9-build/redesign/README.md, "Round 1, in short".
//
// Each rule is read from the source, so a page that breaks it fails here
// before anyone draws it. Readers' own words and the admin and owner pages
// are not the house's screens and are left out.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Every .tsx under app/ and components/, but the admin's and the owner's pages. */
function screens(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, e.name);
      if (e.isDirectory()) {
        if (/^(app|components)\/(admin|owner)$/.test(rel) || e.name === "__tests__") continue;
        walk(rel);
      } else if (rel.endsWith(".tsx")) out.push(rel);
    }
  };
  walk("app");
  walk("components");
  return out;
}

/** A white pill: the paper ground and the night's ink, the house's one strong button. */
const WHITE = /(?<![\w/[-])bg-paper(?![\w/-])[^"'`]*text-night|text-night[^"'`]*(?<![\w/[-])bg-paper(?![\w/-])/;

describe("Today: the day leads once, with the screen's one white button", () => {
  // What Today's first screen draws (components/today/TodayMobileV3.tsx).
  const FIRST_SCREEN = [
    "components/today/GreetingHeader.tsx",
    "components/today/PrayNowCard.tsx",
    "components/today/ChurchTodayRail.tsx",
    "components/today/StreakRow.tsx",
    "components/streak/StreakAtRisk.tsx",
    "components/today/VerseOfDayView.tsx",
  ];

  it("holds one white button, the lead's Begin, and none in the parts under it", () => {
    for (const file of FIRST_SCREEN) {
      const whites = read(file).split("\n").filter((line) => WHITE.test(line));
      if (file.endsWith("GreetingHeader.tsx")) {
        expect(whites, file).toHaveLength(1);
        expect(read(file)).toMatch(/data-pray-hour=""\s+className="[^"]*bg-paper[^"]*text-night/);
      } else {
        expect(whites, file).toEqual([]);
      }
    }
  });

  it("holds no other white button in the states round 1 did not draw", () => {
    // Every part Today's screen imports, so a card added later is held too: a
    // new reader's first days (FirstStepsNudge), the verse to learn
    // (RememberCard), the first Liturgy (FirstLiturgyReminder) and the rest.
    /** By name and reason only. */
    const OWN_SURFACE: Record<string, string> = {
      "components/widget/WidgetTip.tsx": "its one white button is the Done of its own sheet, a screen of its own",
    };
    const today = read("components/today/TodayMobileV3.tsx");
    const parts = [...today.matchAll(/^import \{[^}]*\} from "(\.\/|@\/components\/)([^"]+)";$/gm)].map((m) =>
      m[1] === "./" ? `components/today/${m[2]}.tsx` : `components/${m[2]}.tsx`,
    );
    expect(parts).toEqual(
      expect.arrayContaining([
        "components/onboarding/FirstStepsNudge.tsx",
        "components/today/RememberCard.tsx",
        "components/today/FirstLiturgyReminder.tsx",
      ]),
    );
    for (const file of ["components/today/TodayMobileV3.tsx", ...parts]) {
      if (OWN_SURFACE[file]) continue;
      const whites = read(file).split("\n").filter((line) => WHITE.test(line));
      expect(whites, file).toEqual([]);
    }
  });

  it("draws the verse on the page, without a box, and the fast as a row in one tray", () => {
    expect(read("components/today/VerseOfDayView.tsx")).not.toMatch(/<article className="[^"]*\b(border|lm-card|bg-night-deep)\b/);
    expect(read("components/today/ChurchTodayRail.tsx")).toMatch(/data-today-band="fast" className="theology-tray /);
  });
});

describe("No zero as a first sight", () => {
  it("keeps Today's rope for a reader with a kept day, and its numeral hidden at zero", () => {
    const rope = read("components/today/StreakRow.tsx");
    expect(rope).toContain("if (view.ready && view.best === 0 && !view.keptToday) return null;");
    expect(rope).toContain("hidden={view.current === 0}");
  });

  it("shows Theology's count of steps walked only from the first one", () => {
    const hub = read("components/theology/TheologyHub.tsx");
    expect(hub).toContain('label={walked > 0 ? of : ""}');
    expect(hub).toMatch(/\{walked > 0 \? <span[^>]*>\{of\}<\/span> : null\}/);
    // Every other place the count is drawn is guarded the same way.
    expect(hub.match(/\{of\}/g)).toHaveLength(1);
  });
});

describe("The small line: sentence case, never capitals spaced out", () => {
  /** By name and reason only. */
  const ALLOWED: Record<string, string> = {
    "components/reading/ReadTogether.tsx": "a typed join code in its field, not a label",
  };

  it("is in no screen's class names", () => {
    const found: string[] = [];
    for (const file of screens()) {
      if (ALLOWED[file]) continue;
      const src = read(file);
      for (const m of src.matchAll(/["'`]([^"'`]*)["'`]/g)) {
        const cls = m[1];
        if (/(?<![\w-])uppercase(?![\w-])/.test(cls) && /(?<![\w-])tracking-/.test(cls)) found.push(`${file}: ${cls.slice(0, 80)}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("is never fainter than /55", () => {
    // Found by checkMock with pixels on the round 1 export (Updates 29): Theology's
    // "1 of 9" at /50 read 4.39:1 on Cappadocian at 800 and 1032. The small lines
    // the sweep left were already in sentence case, so only their ink was wrong.
    const found: string[] = [];
    for (const file of screens()) {
      for (const m of read(file).matchAll(/font-sans text-caption font-semibold text-paper\/(\d+)\b/g)) {
        if (Number(m[1]) < 55) found.push(`${file}: text-paper/${m[1]}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("is in no rule of the stylesheet", () => {
    // The class names above are half of it: .set-well-ref (Settings' reader
    // size), .gift-eyebrow (the gift) and .tour-brand (the tour) set their
    // capitals in app/globals.css.
    const css = read("app/globals.css");
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => /text-transform:\s*uppercase/.test(m[2]))
      .map((m) => m[1].trim());
    expect(rules).toEqual([]);
  });
});

describe("Found by checkMock on the round 1 export (Updates 29)", () => {
  // The four looks are dark ones (no reading mode under them), so a rule for
  // the light looks never reached them: the export of the round read the
  // same 4.31 to 4.47:1 again (Updates 33).
  it("lifts the verse to learn's head on the four dark looks where it read under 4.5:1, over the verse's light", () => {
    const card = read("components/today/RememberCard.tsx");
    expect(card).toContain('className="remember-head font-sans text-[12.5px] font-semibold text-paper/60"');
    expect(card).toContain('<span className="text-paper/45"> · {t("plus.badge")}</span>');
    expect(card).not.toContain("[html[data-reading-mode=parchment][data-look]_&]:text-paper/80");
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const looks = 'html:is([data-look="incense"], [data-look="athos"], [data-look="forest"], [data-look="mosaic"])';
    expect(css).toContain(
      `${looks} .remember-head,\n ${looks} .remember-head .text-paper\\/45 {\n  color: color-mix(in oklab, var(--color-paper) 80%, transparent);`,
    );
  });

  // The step's count on Theology's cards ("1 of 9"): on Light a tray drew
  // /50 at 75 for it (4.83:1), so the round's raise to /55 left it at Light's
  // 70 (4.26:1 on the resume card); on Councils and Cappadocian /50 and /55
  // both draw at 55 (4.42 and 4.39:1 at 800 and 1032). Updates 33.
  it("keeps the step's count on a tray above 4.5:1 on Light and on the two palettes earned by reading", () => {
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toContain(
      'html[data-reading-mode="parchment"]:not([data-look]) .theology-tray :is(.text-paper\\/50, .text-paper\\/55) {\n color: color-mix(in oklab, var(--color-paper) 75%, transparent);',
    );
    expect(css).toContain(
      ':where(html[data-reading-mode="councils"], html[data-reading-mode="cappadocian"]) .theology-tray :is(.text-paper\\/50, .text-paper\\/52, .text-paper\\/55) {\n color: color-mix(in oklab, var(--color-paper) 66%, transparent);',
    );
    // Both counts are the small line, on a tray.
    const hub = read("components/theology/TheologyHub.tsx");
    expect(hub.match(/text-caption font-semibold text-paper\/55">\s*\{t\("readingsFlow\.of"/g) ?? []).toHaveLength(2);
  });

  it("tells the checker why the tour's bloom stays where it is measured, in every language", () => {
    const tour = read("components/whats-new/tour/TourLook.tsx");
    expect(tour).toMatch(/className="tour-bloom"\s+data-mock-allow="mirror"\s+data-mock-why="[^"]*measured on the screen[^"]*"/);
  });

  it("centres the tour's drawing from the reading side's start, so Arabic mirrors it", () => {
    const tour = read("components/whats-new/tour/TourLook.tsx");
    expect(tour).toContain("absolute start-1/2 top-0 h-[168vw] w-[168vw] -translate-x-1/2 overflow-visible rtl:translate-x-1/2");
    expect(tour).not.toMatch(/HorizonDrawing[^>]*\bleft-1\/2/);
  });
});

describe("A row: a name, one line, the chevron; no icon tile", () => {
  /** The house's row in a list: the tray's row, and the Florilegium's. */
  const ROW = /className=\{?[^>]*?(theology-row|FLOR_ROW)/;

  it("has no icon tile in any list row", () => {
    const found: string[] = [];
    for (const file of screens()) {
      const src = read(file);
      for (const m of src.matchAll(/<(Link|a|button)\b/g)) {
        const at = m.index ?? 0;
        const open = src.slice(at, src.indexOf(">", at) + 1);
        if (!ROW.test(open)) continue;
        const end = src.indexOf(`</${m[1]}>`, at);
        const body = src.slice(at, end < 0 ? undefined : end);
        if (/theology-plate|FLOR_PLATE/.test(body)) found.push(`${file}:${src.slice(0, at).split("\n").length}`);
      }
    }
    expect(found).toEqual([]);
  });
});
