// One top bar: the phone's five tabs wear the same bar.
//
// What a reader would notice if this broke: the Premium pill on the left of
// Today and on the right of Bible, its x moving from tab to tab, a Support
// lamp back in the bar, a search on some tabs and not on others, or the star
// back before "Premium". The owner, 2026-10-16 (Homebase/boards/purify-master/
// r17/BRAINSTORM.md, notes 10 to 14): one top bar for all five tabs, "Same
// design on all"; Support "does nothing useful there"; the pill in one place;
// its star "a vibe-coded symbol". His answer: the pill on every tab, in the
// same place, with no star.
//
// This reads the source. How the bar is drawn in a built app is the "One top
// bar" section of scripts/export-walk.mjs.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old bar is not read as the bar. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const BAR = "components/mobile/MobileHeader.tsx";
const PILL = "components/nav/MobilePremiumButton.tsx";
const BELL = "components/nav/NotificationsButton.tsx";
const TABS: [file: string, titleKey: string][] = [
  ["components/today/TodayMobileV3.tsx", "nav.today"],
  ["components/mobile/BibleMobile.tsx", "nav.bible"],
  ["components/mobile/DiscoverMobile.tsx", "nav.discover"],
  ["components/mobile/PrayersMobile.tsx", "nav.prayers"],
  ["components/mobile/YouMobile.tsx", "nav.you"],
];

describe("the phone's tab bar", () => {
  it("is the one bar on all five tabs, each named by its tab's own word", () => {
    for (const [file, key] of TABS) {
      const bars = [...code(file).matchAll(/<MobileHeader\b[^>]*\/>/g)].map((m) => m[0]);
      expect(bars.length, file).toBeGreaterThan(0);
      for (const bar of bars) expect(bar, file).toBe(`<MobileHeader titleKey="${key}" />`);
    }
    // Today's own bar is gone, so nothing can draw it again.
    expect(existsSync(join(root, "components/today/MobileTopTabs.tsx"))).toBe(false);
  });

  it("holds the title, then the Premium pill, search and the bell, and nothing else", () => {
    // The streak rode beside the pill from 1.7.1 (the owner, 2026-10-17: "can
    // you put the streak at the top, like right next to plus?") until his
    // pick A of round 15 in 1.8, "Lighter, no streak" (Homebase/boards/
    // purify-master/r18/choose/15-top-bar.png). It left the one bar on every
    // tab, so the pill still never moves between them, and it lives on Today
    // as the prayer rope (components/today/StreakRow.tsx).
    const bar = code(BAR);
    const drawn = [...bar.matchAll(/<([A-Z][A-Za-z]*)[\s/>]/g)].map((m) => m[1]);
    expect(drawn).toEqual(["MobilePremiumButton", "SearchTrigger", "NotificationsButton"]);
    for (const gone of ["Streak", "useStreak", "Flame"]) expect(bar.includes(gone), gone).toBe(false);
    expect(bar).toMatch(/<h1\b/);
    // No slot through which one tab can put something else on the right, so
    // what follows the pill is the same width on every tab and it never moves.
    for (const gone of ["trailing", "extra", "donate", "search?:", "children"]) {
      expect(bar.includes(gone), gone).toBe(false);
    }
  });

  it("carries no Support link, and neither does the inner pages' bar", () => {
    for (const file of [BAR, "components/nav/MobileTopBar.tsx"]) {
      const source = code(file);
      for (const gone of ["/support", "Lampada", "nav.supportPurify", "donate"]) {
        expect(source.includes(gone), `${file} has ${gone}`).toBe(false);
      }
    }
  });

  it("stays at the top in the apps, clear of the status bar, and pads nothing twice", () => {
    const css = read("app/globals.css");
    const rule = /html\.is-native \.tab-topbar\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/position:\s*sticky;/);
    expect(rule).toMatch(/top:\s*0;/);
    expect(rule).toMatch(/padding-top:\s*calc\(var\(--inset-top\) \+ 0\.5rem\);/);
    expect(rule).toMatch(/margin-top:\s*calc\(-1 \* var\(--inset-top\)\);/);
    expect(code(BAR)).toMatch(/sticky && "tab-topbar"/);
    // The negative margin cancels the page's own inset, so every page under
    // the bar has to carry one: the (app) frame's <main>, and Today's wrapper.
    expect(read("components/layout/AppFrame.tsx")).toContain('<main data-route-content className="flex-1 safe-pt safe-pb">');
    expect(read("app/page.tsx")).toContain('<div data-route-content className="flex-1 safe-pt safe-pb">');
    // Reading sits under the apps' back bar, which is pinned already.
    expect(code("components/reading/ReadingRoom.tsx")).toContain('<MobileHeader titleKey="nav.reading" sticky={false} />');
  });

  it("has no copy to keep in step on the launch cover", () => {
    // 1.6 and 1.7 opened on an outline of Today that drew this bar row for
    // row. Since 1.8 the apps open on the horizon intro instead
    // (components/native/LaunchFrame.tsx), which draws no bar, so the bar can
    // change without a second drawing of it to move as well.
    const bar = code(BAR);
    expect(bar).toContain("bg-night py-2");
    expect(bar).toContain("flex h-11 items-center gap-2 ps-5 pe-[9px]");
    const frame = code("components/native/LaunchFrame.tsx");
    expect(frame).not.toContain("h-11");
    expect(frame).toContain("launch-horizon");
  });

  it("names Today once: the greeting under the bar is not a second h1", () => {
    const greeting = code("components/today/GreetingHeader.tsx");
    expect(greeting).not.toMatch(/<h1\b/);
    expect(greeting).toMatch(/<h2\b/);
  });

  it("opens the upgrade sheet from Today's pill, as on the other four tabs", () => {
    const today = code("components/today/TodayMobileV3.tsx");
    const provider = today.indexOf("<UpgradeModalProvider>");
    expect(provider).toBeGreaterThan(-1);
    expect(provider).toBeLessThan(today.indexOf("<MobileHeader"));
  });
});

describe("the Premium pill", () => {
  it("is the word alone: no star and no check, on the phone, and no star on the computer", () => {
    const pill = code(PILL);
    for (const gone of [/\bGoldStar\b/, /\bGoldCheck\b/, /\bSparkle\b/, /\bStar\b/, /clipPath/]) {
      expect(pill, String(gone)).not.toMatch(gone);
    }
    expect(code("components/nav/PremiumNavCta.tsx")).not.toMatch(/\bGoldStar\b/);
  });

  // A size larger since 1.7.2 (the owner, 2026-10-19: "make the buttons at
  // the top a tab bit bigger"): the pill 36px tall, the icons 24px, and the
  // pill's word larger from 380px, so a 360px phone keeps room for the name.
  it("is one size whatever it says, in a 44px box", () => {
    const pill = code(PILL);
    expect(pill).toContain('const box = "group inline-flex h-11 shrink-0 items-center";');
    expect(pill).toContain("inline-flex h-9 items-center whitespace-nowrap rounded-pill px-3 font-sans text-caption font-semibold min-[380px]:px-3.5 min-[380px]:text-ui");
    // Not .hit-44: the box is the 44px target already.
    expect(pill).not.toMatch(/\bhit-44\b/);
  });

  // The owner's pick of 2026-10-27 (Homebase/boards/purify-master/variants/
  // 06-premium-pill.png, round 6, B, "Silver"): "a cool metal edge and a soft
  // sheen", no gold; and his word of 2026-10-28, "just use a glowly white"
  // (the still white glow is held in lib/premium/__tests__/silver.test.ts).
  // It was a gold hairline, the word in gold and a breathing gold halo
  // (.premium-glow, and a resting halo set inline).
  it("is silver, on the phone and on the computer: no gold, and no gold halo", () => {
    const GOLD = [/premium-glow/, /premium-gold-text/, /rgba\(201,\s*162,\s*90/, /#c9a25a/i, /\b(?:ring|text|bg|border)-premium\b/, /boxShadow/];
    const phone = code(PILL);
    const computer = code("components/nav/PremiumNavCta.tsx");
    expect(phone).toContain(': "premium-pill",');
    expect(computer).toContain('cn("premium-pill", active && "ring-1 ring-paper/40")');
    for (const [name, source] of [["phone", phone], ["computer", computer]] as const) {
      for (const gold of GOLD) expect(source, `${name}: ${gold}`).not.toMatch(gold);
    }

    // The look itself, in globals.css: the page's ink for the word and the
    // edge, a white sheen, nothing that moves, and nothing of the gold.
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = [...css.matchAll(/([^{}]*\.premium-pill[^{}]*)\{([^}]*)\}/g)].map((m) => `${m[1].trim()} { ${m[2]} }`);
    expect(rules.length).toBeGreaterThanOrEqual(4);
    const base = /(^|\})\s*\.premium-pill\s*\{([^}]*)\}/.exec(css)?.[2] ?? "";
    expect(base).toMatch(/color:\s*var\(--color-paper\);/);
    expect(base).toMatch(/border-color:\s*color-mix\(in srgb, var\(--color-paper\) 62%, transparent\);/);
    expect(base).toMatch(/linear-gradient\(180deg, rgba\(255, 255, 255, 0\.16\), rgba\(255, 255, 255, 0\.04\)\)/);
    for (const rule of rules) {
      expect(rule).not.toMatch(/#c9a25a|#efd9a3|#7c5d28|#9a7433|#16130e|201,\s*162,\s*90|premium-ink|animation/i);
    }
    expect(css).not.toMatch(/\.premium-glow|@keyframes premium-glow|\.premium-gold-text|\.premium-cta/);
    // Parchment has its own pearl, so the pill is not white on paper.
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.premium-pill \{/);
  });

  it("calls a plan the reader holds by its name alone, and says the rest to a screen reader", () => {
    for (const { code: locale } of LOCALES) {
      const m = getMessages(locale);
      expect(m["nav.plusPill"], locale).toBe("Plus");
      expect(m["nav.proPill"], locale).toBe("Pro");
      // The accessible name holds the word that is shown.
      expect(m["nav.plusActivated"], locale).toContain("Plus");
      expect(m["nav.proActivated"], locale).toContain("Pro");
    }
  });
});

describe("search and the bell", () => {
  it("are 44px buttons, drawn at one size", () => {
    expect(code("components/search/SearchTrigger.tsx")).toContain('"h-11 w-11 ');
    expect(code(BAR)).toContain("<SearchTrigger iconSize={24}");
    const bell = code(BELL);
    expect(bell).toContain("inline-flex h-11 w-11 ");
    expect(bell).toContain("<Bell size={24} filled={lit} />");
  });

  // The owner's build 80 note 5 (Homebase/boards/purify-master/r18/
  // BUILD-80-NOTES.md, 2026-10-29): "the notifications button and search
  // touch a little; the Premium pill does not touch search". The pill's
  // wrapper had a 2px margin of its own and search and the bell had nothing
  // between them, which showed on Prayers, where the two stand on round
  // plates. One gap now, the row's own 8px, between all three boxes; the
  // walk measures it (scripts/export-walk.mjs, "One top bar").
  it("stand one even step apart, the pill, search and the bell, each in its own 44px box", () => {
    const bar = code(BAR);
    expect(bar).toContain('<div data-tab-actions="" className="flex shrink-0 items-center gap-2">');
    // Still wrapped, so the plates over Prayers' picture (globals.css,
    // `[data-tab-actions] > button`) leave the pill its own silver.
    expect(bar).toMatch(/<span className="inline-flex">\s*<MobilePremiumButton \/>\s*<\/span>\s*<SearchTrigger iconSize=\{24\} className="text-paper\/80"(?: tour="search")? \/>\s*<NotificationsButton \/>\s*<\/div>/);
    // No margin on any of the three, so the one gap is all the room between them.
    const margin = /(?:^|[\s"'`:])-?m[sexylrtb]?-(?:\d|\[|px\b|auto\b)/;
    const cluster = bar.slice(bar.indexOf("data-tab-actions"), bar.indexOf("</header>"));
    expect(cluster).not.toMatch(margin);
    for (const file of [PILL, "components/search/SearchTrigger.tsx", BELL]) {
      expect(code(file), file).not.toMatch(margin);
    }
  });

  it("says something is new one way only: the bell drawn filled, no dot, no count", () => {
    const bell = code(BELL);
    expect(bell).toContain("const lit = inbox.unread > 0 || whatsNewUnseen(seen);");
    expect(bell).not.toMatch(/\{inbox\.unread\}|crimson/);
    // No second poller: the tab bar's badge keeps the one store fresh.
    expect(bell.includes("setInterval")).toBe(false);
    const sheet = code("components/nav/NotificationsSheet.tsx");
    expect(sheet).not.toMatch(/crimson/);
    // A pop-up is the shared, movable sheet.
    expect(sheet).toMatch(/<Sheet\b/);
  });
});
