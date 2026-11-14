// What each Plus preview draws (r3-07 A, the owner's notes 8 and 39 of build
// 80: "showing like a visual for every single one"), rendered: the rows with
// their Try it, the preview's title bar and its foot, and each of the
// fifteen features' own screens, in the reader's language.
//
// What a reader would notice if this broke: a Try it that is not there, a
// preview that shows nothing, an example not marked as one, a page in English
// for a reader in Athens, or the wrong feature after Next.

import { createElement, type ComponentType, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlusFeatureRows } from "@/components/billing/KeptPaywall";
import { PlusTryHead, PlusTryPage, type TryProps } from "@/components/billing/PlusTry";
import TryAmbience from "@/components/billing/plusTry/TryAmbience";
import TryCompare from "@/components/billing/plusTry/TryCompare";
import TryCrossRefs from "@/components/billing/plusTry/TryCrossRefs";
import TryDiscord from "@/components/billing/plusTry/TryDiscord";
import TryFlorilegium from "@/components/billing/plusTry/TryFlorilegium";
import TryHistory from "@/components/billing/plusTry/TryHistory";
import TryJournal from "@/components/billing/plusTry/TryJournal";
import TryMark from "@/components/billing/plusTry/TryMark";
import TryOffline from "@/components/billing/plusTry/TryOffline";
import TryPlans from "@/components/billing/plusTry/TryPlans";
import TryProfile from "@/components/billing/plusTry/TryProfile";
import TryReadingModes from "@/components/billing/plusTry/TryReadingModes";
import TryRemember from "@/components/billing/plusTry/TryRemember";
import TrySync from "@/components/billing/plusTry/TrySync";
import TryWordStudy from "@/components/billing/plusTry/TryWordStudy";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { getMessages } from "@/lib/i18n";
import { PLUS_ROWS, plusRowsLedBy, rowsHere, type PlusRow } from "@/lib/premium/plusRows";
import { TRY_PALETTES } from "@/lib/premium/plusTry";
import { TRY_COMPARE_BIBLES } from "@/lib/premium/tryCompare";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
function render(node: ReactElement, lang = "en"): string {
  return renderToString(createElement(MessagesProvider, { locale: lang, messages: getMessages(lang) } as ProviderProps, node));
}
/** What React writes for a piece of text. */
const html = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const say = (lang: string, key: string, fill: Record<string, string> = {}) =>
  Object.entries(fill).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), getMessages(lang)[key] ?? key);
const row = (id: string): PlusRow => PLUS_ROWS.find((r) => r.id === id)!;
const preview = (C: ComponentType<TryProps>, id: string, lang = "en") => render(createElement(C, { row: row(id) }), lang);

describe("the rows", () => {
  it("each end in Try it, named by its feature, when the place can show a preview", () => {
    const out = render(createElement(PlusFeatureRows, { onTry: () => {} }));
    const opens = [...out.matchAll(/data-plus-try-open="([a-z-]+)"/g)].map((m) => m[1]);
    // Off the Windows app, Discord status is not offered (1.9, rowsHere).
    expect(opens).toEqual(rowsHere(PLUS_ROWS, { desktopApp: false }).map((r) => r.id));
    expect(out.match(/>Try it<svg/g)).toHaveLength(14);
    // Each names the feature it tries.
    for (const m of out.matchAll(/aria-describedby="([^"]+)"/g)) expect(out).toContain(`id="${m[1]}"`);
  });

  it("keep no Try it where nothing can be tried (the Pro rows, a place without previews)", () => {
    expect(render(createElement(PlusFeatureRows, {}))).not.toContain("data-plus-try-open");
  });

  it("say Try it in the reader's language", () => {
    for (const lang of ["el", "ru", "ar", "ka"]) {
      expect(render(createElement(PlusFeatureRows, { onTry: () => {} }), lang), lang).toContain(`>${html(say(lang, "plus.try.open"))}<svg`);
    }
  });

  it("show the Candlelight row's Aa on the grey every tile wears", () => {
    const out = render(createElement(PlusFeatureRows, { onTry: () => {} }));
    const modes = out.slice(out.indexOf('data-plus-feature="reading-modes"'), out.indexOf('data-plus-feature="cross-refs"'));
    expect(modes).toContain(">Aa<");
    expect(modes).toContain("bg-paper/[0.08]");
    expect(out).not.toContain(TRY_PALETTES.candlelight.night);
  });

  it("draw the Listen offline row whole, with no entrance of its own to wait on", () => {
    const out = render(createElement(PlusFeatureRows, { onTry: () => {} }));
    const offline = out.slice(out.indexOf('data-plus-feature="offline"'), out.indexOf('data-plus-feature="ambience"'));
    expect(offline).toContain(html(say("en", "plus.offline.name")));
    // Its line names chants while keeping one is Plus (lib/chants/saving.ts).
    expect(offline).toContain(html(say("en", PLUS_ROWS.find((r) => r.id === "offline")!.body)));
    expect(offline).not.toContain("paywall-in");
    expect(out.match(/paywall-in/g)).toHaveLength(1);
  });
});

describe("the preview's frame", () => {
  it("has the way back, the feature's name and Preview at its top", () => {
    const out = render(createElement(PlusTryHead, { name: "Ambience", onBack: () => {}, onClose: () => {} }));
    expect(out).toContain('aria-label="Back"');
    expect(out).toContain(">Ambience</p>");
    expect(out).toContain(">Preview</span>");
    expect(out).toContain('aria-label="Close"');
    expect(render(createElement(PlusTryHead, { name: "Ambience", onBack: () => {} }))).not.toContain('aria-label="Close"');
  });

  it("stands the name over Preview, with the bar's whole width between the way back and the close", () => {
    // Admin's pick A, 2026-11-10: beside the name, "Preview" did not give way, and "Nineteen reading
    // modes" was cut at 360 wide in Greek and in Georgian. The name keeps its two lines.
    const out = render(createElement(PlusTryHead, { name: "Ambience", onBack: () => {}, onClose: () => {} }));
    expect(out).toMatch(/<div class="min-w-0 flex-1"><p class="line-clamp-2 [^"]*">Ambience<\/p><span class="[^"]*\bblock\b[^"]*">Preview<\/span><\/div>/);
    // Nothing else takes the bar's width: the name's block is the one part that grows.
    expect(out.match(/\bflex-1\b/g)).toHaveLength(1);
    // The way back and the close are 44px, and keep to the bar's middle however tall the name makes it.
    expect(out.match(/\bh-11 w-11 shrink-0\b/g)).toHaveLength(2);
    expect(out).toMatch(/^<div class="flex items-center [^"]*" data-plus-try-head="">/);
  });

  it("says what stays free under a page, and Next names the following feature", () => {
    const rows = plusRowsLedBy(null);
    const plans = row("plans");
    const out = render(createElement(PlusTryPage, { row: plans, next: rows[rows.indexOf(plans) + 1], onNext: () => {} }));
    expect(out).toContain(html(say("en", "plus.plans.keep")));
    expect(out).toContain(`${html(say("en", "plus.try.next", { feature: say("en", "remember.title") }))}<svg`);
    expect(out).not.toContain("plus-try-minute");
  });

  it("gives a sound its minute and says so: Rain plays for a minute, then stops", () => {
    const out = render(createElement(PlusTryPage, { row: row("ambience"), next: row("plans"), onNext: () => {} }));
    expect(out).toContain("Rain plays for a minute, then stops.");
    expect(out).toContain("plus-try-minute-fill");
    expect(out).toContain("Next: Reading plans");
    // In the reader's language, the sound's own name in it.
    expect(render(createElement(PlusTryPage, { row: row("ambience"), next: null, onNext: () => {} }), "de")).toContain(
      html(say("de", "plus.try.minute", { sound: say("de", "ambience.rain") })),
    );
  });

  it("keeps the room of its longest sound's line, so a sound's name moves nothing above it (Updates 28's walk, 2026-11-13)", () => {
    // The line names the sound playing. At 390, "The sea plays for a minute, then stops." takes two lines where
    // Rain's takes one: the preview grew by a line as the sea began, the sheet rose from the screen's foot, and
    // the strip's tile moved 13.3px under the finger. Every sound's line stands in the same place, unseen, and
    // the line is as tall as the tallest of them; the one said is the one playing.
    for (const lang of ["en", "ar"]) {
      const out = render(createElement(PlusTryPage, { row: row("ambience"), next: row("plans"), onNext: () => {} }), lang);
      expect(out.indexOf('data-try-sound-line=""'), lang).toBeGreaterThan(-1);
      const room = out.slice(out.indexOf('data-try-sound-line=""'));
      for (const t of AMBIENCE_TRACKS) {
        const line = html(say(lang, "plus.try.minute", { sound: say(lang, t.labelKey) }));
        expect(room, `${lang} ${t.id}`).toMatch(new RegExp(`<span aria-hidden="true" class="invisible col-start-1 row-start-1">${line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</span>`));
      }
    }
  });

  it("offers no Next after the last feature", () => {
    const rows = plusRowsLedBy(null);
    const last = rows[rows.length - 1];
    expect(render(createElement(PlusTryPage, { row: last, next: null, onNext: () => {} }))).not.toContain("data-plus-try-next");
  });
});

describe("the window under the lock's words (Updates 28's walk, 2026-11-13)", () => {
  // Once a sound's minute is up the lock's words stand over the window, on the night at 85%, and John 1 shows
  // through them as a backdrop. checkMock with pixels read those verses as words to be read, at 2.4 to 3.4:1,
  // whenever it measured past the minute (the gate at 390: Councils and every look after it; within the minute
  // they pass). They are the page under the veil, not words to read there, and say so: to the measure, by
  // name and reason, and to a screen reader, which hears the lock's words alone.
  it("marks the page under the lock's words as its backdrop, out of reach", async () => {
    const { TryWindow } = await import("@/components/billing/plusTry/TryKit");
    const veiled = render(createElement(TryWindow, { label: "Ambience", overlay: createElement("p", null, "The lock's words") }, createElement("p", null, "A verse")));
    const page = /<div ([^>]*)><p>A verse<\/p>/.exec(veiled)?.[1] ?? "";
    expect(page).toContain('aria-hidden="true"');
    expect(page).toContain('inert=""');
    expect(page).toContain('data-mock-allow="contrast"');
    expect(page).toMatch(/data-mock-why="[^"]+"/);
  });

  it("leaves the page as it is while no lock stands over it", async () => {
    const { TryWindow } = await import("@/components/billing/plusTry/TryKit");
    const open = render(createElement(TryWindow, { label: "Ambience" }, createElement("p", null, "A verse")));
    const page = /<div ([^>]*)><p>A verse<\/p>/.exec(open)?.[1] ?? "";
    expect(page).not.toMatch(/aria-hidden|inert|data-mock-allow/);
  });
});

describe("each feature's own screen", () => {
  it("Ambience: John 1, and the six sounds as the ambience sheet names them", () => {
    const out = preview(TryAmbience, "ambience");
    expect(out).toContain("In the beginning was the Word, and the Word was with God, and the Word was God.");
    for (const t of AMBIENCE_TRACKS) expect(out, t.id).toContain(html(say("en", t.labelKey)));
    expect(out.match(/aria-pressed=/g)).toHaveLength(AMBIENCE_TRACKS.length);
  });

  it("Ambience: each sound wears its photograph, upright, as the ambience sheet's tiles do (build 95, note 22)", () => {
    // His word of 2026-11-13 about 14:29 UTC: the Plus preview's strip takes the photographs too.
    const out = preview(TryAmbience, "ambience");
    const strip = out.slice(out.indexOf(`role="group" aria-label="${html(say("en", "ambience.title"))}"`));
    expect(strip.length).toBeLessThan(out.length);
    for (const t of AMBIENCE_TRACKS) {
      expect(strip, t.id).toContain(`src="${t.photo.src}"`);
      expect(strip, t.id).toContain(`background-color:${t.photo.ground}`);
    }
    // No drawing stands for a sound any more: the photograph says what it is, and is decoration beside the name.
    expect(strip).not.toContain("<svg");
    expect((strip.match(/<img [^>]*alt=""/g) ?? []).length).toBe(AMBIENCE_TRACKS.length);
    // Upright, as the sheet's tiles are, the name and its state's line on the tile's ground below the picture.
    expect(strip.match(/<button [^>]*class="[^"]*h-\[108px\][^"]*justify-end[^"]*"/g)).toHaveLength(AMBIENCE_TRACKS.length);
    expect(strip.match(/data-try-ambience-name=""/g)).toHaveLength(AMBIENCE_TRACKS.length);
  });

  it("the reading modes: John 1 in Candlelight, with Dark, Monastery and one look beside it as Settings' small pages", () => {
    const out = preview(TryReadingModes, "reading-modes");
    expect(out).toContain(`--color-night:${TRY_PALETTES.candlelight.night}`);
    // Four small pages, each with its name whole under it, and the one shown lit.
    const tiles = out.match(/<button type="button" aria-pressed="(?:true|false)"[^>]*class="set-mode">[\s\S]*?<\/button>/g) ?? [];
    expect(tiles).toHaveLength(4);
    expect(tiles.map((b) => /<span class="set-mode-name">([^<]*)<\/span>/.exec(b)?.[1])).toEqual(["Dark", "Candlelight", "Monastery", "Night sky"]);
    expect(tiles.map((b) => /data-palette="([^"]*)"/.exec(b)?.[1])).toEqual(["default", "candlelight", "monastery", "nightsky"]);
    expect(tiles.filter((b) => b.includes('aria-pressed="true"'))).toHaveLength(1);
    expect(tiles[1]).toContain('aria-pressed="true"');
    // A preview locks nothing: no page says Purify Plus under its name.
    expect(out).not.toContain("set-mode-plus");
    // It opens in Candlelight, which is not the look, so the window wears no look yet.
    expect(out).not.toContain("data-try-look");
    expect(out).toContain("All things were made by him");
  });

  it("the page of Scripture: its English verses say they are English and run left to right, in every language", () => {
    // In Arabic and Urdu the sheet runs from the right, and the page's verses,
    // the app's own English text, ran with it: a line's full stop stood at its
    // start (".was God"). Settings' small page marks its sample verses the
    // same way.
    for (const lang of ["en", "ar", "ur"]) {
      for (const [C, id] of [[TryReadingModes, "reading-modes"], [TryAmbience, "ambience"]] as const) {
        const out = preview(C, id, lang);
        const verses = /<div lang="en" dir="ltr" class="[^"]*">(?:<p>[\s\S]*?<\/p>)+<\/div>/.exec(out)?.[0] ?? "";
        expect(verses, `${id} in ${lang}`).toContain("In the beginning was the Word, and the Word was with God, and the Word was God.");
        // The book's name and the chapter's line stay in the reader's language and direction.
        expect(out.slice(0, out.indexOf('<div lang="en" dir="ltr"')), `${id} in ${lang}`).toContain(html(say(lang, "bible.books.john")));
      }
    }
  });

  it("Your mark and the cross-references: their one English verse says it is English and runs left to right, in every language", () => {
    // 1.9, the arbiter's of 09:56 UTC: in Arabic and Urdu each drew its verse
    // with the sheet, from the right, its full stop at its start, as the page
    // of Scripture did. Remember a verse (dir="auto" on the card's verse) and
    // the Florilegium (its line runs left to right) already ran it so.
    for (const lang of ["en", "ar", "ur"]) {
      for (const [C, id, words] of [
        [TryMark, "supporter-mark", "In him was life; and the life was the light of men."],
        [TryCrossRefs, "cross-refs", "In the beginning was the Word, and the Word was with God, and the Word was God."],
      ] as const) {
        const out = preview(C, id, lang);
        const verse = /<p lang="en" dir="ltr" class="[^"]*">([^<]*)<\/p>/.exec(out)?.[1] ?? "";
        expect(verse, `${id} in ${lang}`).toBe(html(words));
        // Where it is from stays in the reader's language and direction.
        expect(out, `${id} in ${lang}`).toContain(html(say(lang, "bible.books.john")));
      }
    }
  });

  it("the word study: the Word of John 1:1 first, with life and light beside it", () => {
    const out = preview(TryWordStudy, "word-study");
    expect(out).toContain(">λόγος<");
    expect(out).toContain(">ζωή<");
    expect(out).toContain(">φῶς<");
    expect(out).toContain('lang="grc"');
  });

  it("cross-references: a verse of John 1 and the verses to choose between", () => {
    const out = preview(TryCrossRefs, "cross-refs");
    expect(out).toContain(html(say("en", "bible.crossRefsFor", { reference: "John 1:1" })));
    expect(out).toContain(">1:14</span>");
  });

  it("Compare: Psalm 50:1 in the app's English and each Bible at its own place, in the reader's language", () => {
    const out = preview(TryCompare, "compare");
    expect(out).toContain(html(say("en", "bible.compareFor", { reference: "Psalms 50:1" })));
    expect(out).toContain("Have mercy upon me, O God");
    for (const r of TRY_COMPARE_BIBLES) {
      expect(out, r.bible).toContain(html(r.words));
      expect(out, r.bible).toContain(`data-compare-row="${r.bible}"`);
    }
    expect(out).toContain(" · <!-- -->50:3");
    expect(out).toContain(" · <!-- -->51:1");
    expect(out).toContain('dir="rtl"');
    expect(preview(TryCompare, "compare", "el")).toContain(html(say("el", "bible.compareFor", { reference: `${say("el", "bible.books.psalms")} 50:1` })));
  });

  it("the journal: its page, From this day, entries by day, each a Father's line with his name, marked Example", () => {
    const out = preview(TryJournal, "journal");
    expect(out).toContain(">Your journal");
    expect(out).toContain(">Example</span>");
    expect(out).toContain(">From this day</p>");
    expect(out).toContain("Let us not therefore be anxious");
    expect(out).toContain("St. John Chrysostom");
    expect(out).toContain("St. Augustine");
  });

  it("listen offline: Now Playing at John 1 with the player's own Save offline mark", () => {
    const out = preview(TryOffline, "offline");
    expect(out).toContain(">John 1</p>");
    expect(out).toContain(`aria-label="${html(say("en", "player.offline.save", { book: "John" }))}"`);
  });

  it("reading plans: the three plans and the chosen one's days", () => {
    const out = preview(TryPlans, "plans");
    for (const id of ["psalter", "gospels", "proverbs"]) expect(out, id).toContain(html(say("en", `plans.${id}.name`)));
    expect(out).toContain(">The days</p>");
    expect(out).toContain(">Today</span>");
  });

  it("remember the verse: Today's card for John 1:5, marked Example", () => {
    const out = preview(TryRemember, "remember");
    expect(out).toContain(">John 1:5</a>");
    expect(out).toContain(">Example</span>");
    expect(out).toContain(">Show the words</button>");
  });

  it("the Florilegium: a gathering of John 1, two verses and a Father, marked Example", () => {
    const out = preview(TryFlorilegium, "florilegium");
    expect(out).toContain(">John 1</h3>");
    expect(out).toContain(">Example</span>");
    expect(out).toContain("In the beginning was the Word");
    expect(out).toContain("And the light shineth in darkness");
    expect(out).toContain("St. John Chrysostom");
  });

  it("sync: what is carried, counted from this device", () => {
    const out = preview(TrySync, "sync");
    expect(out).toContain(">What syncs</p>");
    for (const key of ["ui.versesHighlighted", "ui.notesWritten", "ui.bookmarksSaved"]) expect(out, key).toContain(html(say("en", key)));
    expect(out).not.toContain(html(say("en", "ui.lastSynced")));
    // 1.9: nothing kept yet, so no column of zeros and no drawing of devices.
    expect(out).not.toMatch(/tabular-nums[^>]*>0</);
    expect(out).not.toContain("<svg viewBox=\"0 0 300 150\"");
  });

  it("history as a Thread: Florence's steps year by year, under the map that follows them (1.9)", () => {
    const out = preview(TryHistory, "immersive-history");
    expect(out).toContain("The Council of Ferrara–Florence");
    expect(out).toContain("data-event-thread");
    expect(out).toContain("data-thread-map");
    expect(out).toContain("The delegation lands at Venice.");
    // Each year said once (build 93 note 5): 1438 beside the step, its day and place over its words.
    expect(out).toContain("8 February · Venice");
    expect(out).not.toContain("8 February 1438 · Venice");
    expect(out).toMatch(/data-step-year=""[^>]*>1438</);
    // The pictures are every reader's now: the preview no longer sells them.
    expect(out).not.toContain(">More pictures</p>");
  });

  it("profile extras: the card in a frame and a theme, and the frames to try", () => {
    const out = preview(TryProfile, "profile");
    expect(out).toContain("dark-island");
    expect(out).toContain(">Halo</span>");
    expect(out).toContain(html(say("en", "profile.frame")));
    expect(out).toContain(html(say("en", "profile.theme")));
  });

  it("your mark in Community: the name with the cross beside it, and the switch", () => {
    const out = preview(TryMark, "supporter-mark");
    expect(out).toContain('aria-label="Supporter"');
    expect(out).toContain(html(say("en", "settings.showSupporterMark")));
    expect(out).toContain(">Example</span>");
  });

  it("the Discord status: what friends see, framed in the season's color", () => {
    const out = preview(TryDiscord, "discord-frames");
    expect(out).toContain(html(say("en", "settings.discordPreviewLabel")));
    expect(out).toContain("Reading John");
    expect(out).toMatch(/\/api\/discord\/art\?saint=[a-z-]+&amp;p=\d+&amp;season=[a-z]+&amp;gilded=1/);
    expect(out.match(/role="radio"/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it("speak the reader's language", () => {
    expect(preview(TryJournal, "journal", "el")).toContain(html(say("el", "journal.title")));
    expect(preview(TryRemember, "remember", "ru")).toContain(html(say("ru", "plus.try.example")));
    expect(preview(TryPlans, "plans", "ar")).toContain(html(say("ar", "plans.gospels.name")));
  });
});
