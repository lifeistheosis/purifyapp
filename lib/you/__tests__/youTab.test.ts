import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";
import { sectionMedia } from "@/lib/media/sections";
import { PREMIUM_PLAN_DE, PREMIUM_PLAN_EN } from "@/lib/premium/plans";

/**
 * The You tab on a phone (1.8), held to the owner's pick A of r3-25, his note
 * 71 of build 86: "A, the ladder, then the day" (Homebase/boards/
 * purify-master/variants/r3-25-you.html, 2026-10-31), with refinements 3 (one
 * name for the subscription, Plus) and 4 (the prayer rope for the red flame),
 * which he accepted with it.
 *
 * This reads the source. How the tab is drawn in a built app is section 46
 * of scripts/export-walk.mjs; the rope drawn is lib/streak/__tests__/
 * ropeRender.test.ts, the covers lib/you/__tests__/covers.test.ts.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note about the old tab is not read as the tab. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = "components/mobile/YouMobile.tsx";
const HERO = "components/you/YouHero.tsx";
const WHO = "components/you/YouIdentity.tsx";
const CARD = "components/you/PickUpCard.tsx";
const VERSE = "components/you/KeptVerse.tsx";
const SHELF = "components/you/KeptShelf.tsx";
const ROWS = "components/you/YouRows.tsx";
const CSS = "app/globals.css";
const YOU_FILES = [PAGE, HERO, WHO, CARD, VERSE, SHELF, ROWS, "components/you/WeekLine.tsx"];

describe("the head of You: the Ladder, and the reader on it", () => {
  it("is the section's own Ladder, under the one tab bar, with the reader and then the rope at its foot", () => {
    const page = code(PAGE);
    expect(page).toContain('header={<MobileHeader titleKey="nav.you" />} hero={hero}');
    expect(page).toMatch(/<YouHero who=\{reader\}>\s*(?:\{\}\s*)?<StreakRope className="you-rope" \/>\s*<WeekLine className="mt-2\.5" feed=\{feed\} journal=\{journal\} \/>\s*<\/YouHero>/);
    // The plate it stood on, and the red flame card, are gone from the tab.
    for (const gone of ["<SectionMasthead", "<StreakCard", "eyebrow="]) expect(page, gone).not.toContain(gone);
    const hero = code(HERO);
    expect(hero).toContain('sectionMedia("you")');
    // The bar watches the picture, and since 1.9 the reader's own words on it (./barNames.test.ts).
    expect(hero).toMatch(/const picture = useRef<HTMLDivElement>\(null\);\s*const words = useRef<HTMLDivElement>\(null\);\s*useBarOverPicture\(picture, words\);/);
    expect(hero).toContain('className="you-hero-img h-full w-full object-cover object-right-top"');
    expect(hero).toContain("<YouIdentity who={who} />");
    // The tab bar names the tab: no second h1.
    expect(hero + code(WHO)).not.toMatch(/<h1\b/);
    expect(sectionMedia("you")?.src).toBe("/sections/you.v2.jpg");
  });

  it("puts the reader's picture, name, way to their profile and badges on it, and Sign in in the name's place", () => {
    const who = code(WHO);
    expect(who).toContain('href="/account/profile" data-you-identity=""');
    expect(who).toContain('<ReaderAvatar name={name} picture={me.state === "in" ? me.picture : null} size={66} />');
    expect(who).toContain('t("profile.yourProfile")');
    expect(who).toContain("useMyBadges(id)");
    expect(who).toContain('href="/signin?next=/account"');
    expect(who).toContain('t("common.signIn")');
    expect(who).toContain('t("common.optional")');
    expect(who).toContain('t("ui.privateOnThisDeviceNo")');
    // The badges are the house greys: never a badge's own colour, and the Pro
    // cross's red ring is the ink.
    expect(who).not.toContain("badgeTone");
    expect(who).toContain('{ "--color-crimson": "var(--color-paper)" }');
  });

  it("shares the clear bar and its height with Prayers, and keeps the bar's name readable over the picture", () => {
    const css = read(CSS);
    expect(css).toMatch(/\.you-hero,\s*\.prayers-hero \{\s*--hero-top: calc\(3\.75rem \+ 1px\);/);
    expect(css).toMatch(/html\.is-native \.you-hero,\s*html\.is-native \.prayers-hero \{\s*--hero-top: calc\(3\.75rem \+ 1px \+ var\(--inset-top\)\);/);
    expect(css).toMatch(/html:has\(\.you-hero\):not\(\[data-bar-solid\]\) \[data-tab-topbar\],\s*html:has\(\.prayers-hero\):not\(\[data-bar-solid\]\) \[data-tab-topbar\] \{\s*background-color: transparent;/);
    expect(css).toMatch(/html:not\(\.is-native\):has\(\.you-hero\) \[data-tab-topbar\],/);
    expect(css).toMatch(/html:has\(\.you-hero\):not\(\[data-bar-solid\]\) \[data-tab-actions\] > button,/);
    expect(css).toMatch(/\.you-hero-picture \{\s*height: calc\(var\(--hero-top\) \+ 16rem\);/);
    // Faded by a mask, so the page's own ground shows through on every palette.
    expect(css).toMatch(/\.you-hero-img \{\s*-webkit-mask-image: linear-gradient\(180deg,[^;]+;\s*mask-image: linear-gradient\(180deg,/);
    expect(code(HERO)).toContain("you-hero-shade-top absolute inset-x-0 top-0 bg-gradient-to-b from-night/75 to-transparent md:hidden");
  });

  it("fades the picture and the reader in, and with motion off they are simply there", () => {
    const css = read(CSS);
    expect(css).toMatch(/\.you-hero-img \{\s*animation: prayers-picture-in 1100ms var\(--ease-house\) backwards;/);
    expect(css).toMatch(/\.you-hero-who\.you-hero-in \{\s*animation: prayers-hero-in [^;]*var\(--ease-house\)[^;]*backwards;/);
    // Naming each entrance as it is named, so the still rule weighs what it stills (lib/ui/__tests__/stillMeansStill.test.ts).
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.you-hero-img,\s*:where\(\[data-motion="reduce"\]\) \.you-hero-in,\s*:where\(\[data-motion="reduce"\]\) \.you-hero-who\.you-hero-in,\s*:where\(\[data-motion="reduce"\]\) \.you-hero-foot\.you-hero-in \{\s*animation: none;/);
    expect(css).toMatch(/@keyframes prayers-picture-in \{/);
  });
});

describe("the day, under the Ladder", () => {
  it("runs in the sheet's order: the lit card, the verse, the shelf, the catechisms, the rows", () => {
    const page = code(PAGE);
    const order = ["<PickUpCard", "<KeptVerse", "<KeptShelf", 'tn("catechism.accountCount"', "<YouRows items={settings} />"].map((p) => page.lastIndexOf(p));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("draws where the reader left off as one lit card: the newest large with its way in, the two after it small", () => {
    const card = code(CARD);
    expect(card).toContain('className="you-lit lm-card relative overflow-hidden rounded-[22px]"');
    expect(card).toContain("const [first, ...rest] = rows;");
    expect(card).toContain("data-pickup-first");
    expect(card).toContain('<Cover subject={first.cover} width={58} height={74} className="rounded-[11px]" />');
    expect(card).toContain('<Cover subject={r.cover} width={32} height={40} className="rounded-[7px]" />');
    expect(card).toContain("you-go grid size-11 shrink-0 place-items-center rounded-full bg-paper text-night");
    expect(card).toContain("you-progress-lit");
    expect(card).toContain("latestFirst(out, 3)");
  });

  it("sets the kept verse in the Light, Learn by heart and Share one bar at its foot", () => {
    const verse = code(VERSE);
    expect(verse).toContain('className="lm-card relative overflow-hidden rounded-[24px] border border-paper/10 bg-night-deep text-center"');
    expect(verse).toContain("verse-light pointer-events-none");
    expect(verse).toContain('className="verse-cross-lit inline-flex text-paper"');
    expect(verse).toMatch(/<div className="you-verse-foot [^"]*flex [^"]*">\s*<button type="button" data-you-learn=""[\s\S]*?<span aria-hidden className="my-3 w-px shrink-0 bg-paper\/10" \/>\s*<button type="button" data-you-share=""/);
    // No more loose pills.
    expect(verse).not.toContain("rounded-pill");
    expect(verse).toContain("hintWords(");
  });

  it("shows what was kept as covers with their counts, See all with the total, sideways past three", () => {
    const shelf = code(SHELF);
    expect(shelf).toContain("<ScrollRail");
    expect(shelf).toContain("coverOf(subjectOf(r.newest))");
    expect(shelf).toContain('href="/saved"');
    expect(shelf).toContain("{total}");
    expect(shelf).toContain('className="w-[calc((100%_-_18px)/3)] md:w-[168px]"');
    // A set piece, dark on every palette, so the words on a picture stay white.
    expect(shelf).toContain("you-tile dark-island tap-press relative block h-[130px]");
    expect(shelf).toContain('t("saved.emptyLine")');
  });

  it("keeps the rows quiet: led by the plates Settings is made of, on the page's own ground", () => {
    const rows = code(ROWS);
    expect(rows).toContain('import { Plate } from "@/components/settings/LitPanel";');
    expect(rows).toContain("rounded-[18px] bg-paper/[0.03] ring-1 ring-inset ring-paper/[0.08]");
  });
});

describe("black, white and grey, on every palette", () => {
  it("draws nothing gold, amber or yellow, and nothing red", () => {
    for (const file of YOU_FILES) {
      const source = code(file);
      expect(source, file).not.toMatch(/\b(?:text|bg|ring|border|from|via|to|fill|stroke)-(?:gold|amber|yellow|streak|crimson)\b/);
      expect(source, file).not.toMatch(/#d4af37|#c9a25a/i);
    }
  });

  it("takes the white glows off on Parchment, and the halo off True black", () => {
    const css = read(CSS);
    for (const rule of [".you-mark-lit {\n filter: none;", ".you-go,\nhtml[data-reading-mode=\"parchment\"] .you-progress-lit {\n box-shadow: none;"]) {
      expect(css, rule).toContain(rule);
    }
    // The words over the Ladder stand in the house's halo of the page's own
    // ground (.words-halo, held in lib/ui/__tests__/wordsOnPictures.test.ts),
    // which is paper on Parchment: no black shadow under the ink there.
    expect(code(WHO)).toMatch(/const NAME = "words-halo /);
    expect(css).not.toContain(".you-hero-ink");
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.you-lit \{/);
    expect(css).toMatch(/html\[data-reading-mode="black"\] \.you-lit \{\s*box-shadow: inset 0 0 0 1px rgb\(255 255 255 \/ 0\.1\);/);
  });
});

describe("one name for the subscription: Plus", () => {
  it("is the pill's word for every reader in every language, and the pill is its one door on You", () => {
    for (const { code: locale } of LOCALES) {
      const m = getMessages(locale);
      expect(m["nav.premium"], locale).toBe("Plus");
      expect(m["nav.premium"], locale).toBe(m["nav.plusPill"]);
    }
    const page = code(PAGE);
    expect(page).not.toMatch(/"\/pricing"|Purify Premium|plusAndProSyncCollections/);
  });

  it("names the plans pages Purify Plus, and says what Plus and Pro are", () => {
    const premium = read("app/(app)/premium/page.tsx");
    expect(premium).toContain('title: "Purify Plus",');
    // The eyebrow is the catalog's name for it, in every language (2026-11-10).
    expect(premium).toContain('<T k="plus.badge" />');
    expect(JSON.parse(read("lib/i18n/messages/en.json"))["plus.badge"]).toBe("Purify Plus");
    expect(premium).not.toContain("Purify Premium");
    for (const file of ["app/(app)/premium/page.tsx", "app/(app)/pricing/page.tsx"]) {
      const head = read(file);
      expect(head, file).toContain("Plus is the reading and study tools; Pro adds the EIKON Box and member benefits.");
      expect(head, file).not.toMatch(/premium reading/i);
    }
  });

  it("writes the plan cards without the word, in both languages they are written in", () => {
    expect(PREMIUM_PLAN_EN.plusLede).toBe("The reading and study tools.");
    expect(PREMIUM_PLAN_EN.proLede).toBe("Everything in Plus, and the members' layer.");
    expect(PREMIUM_PLAN_EN.plusItems.find((i) => i.id === "reading-modes")?.title).toBe("Reading modes");
    expect(PREMIUM_PLAN_DE.plusItems.find((i) => i.id === "reading-modes")?.title).toBe("Lesemodi");
    for (const plan of [PREMIUM_PLAN_EN, PREMIUM_PLAN_DE]) {
      const cards = [plan.plusLede, plan.proLede, ...plan.plusItems.map((i) => i.title), ...plan.proItems.map((i) => i.title)].join(" | ");
      expect(cards).not.toMatch(/premium/i);
    }
  });
});
