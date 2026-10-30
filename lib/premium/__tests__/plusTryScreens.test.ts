// What each Plus preview draws (r3-07 A, the owner's notes 8 and 39 of build
// 80: "showing like a visual for every single one"), rendered: the rows with
// their Try it, the preview's title bar and its foot, and each of the
// fourteen features' own screens, in the reader's language.
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
import { PLUS_ROWS, plusRowsLedBy, type PlusRow } from "@/lib/premium/plusRows";

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
    expect(opens).toEqual(PLUS_ROWS.map((r) => r.id));
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
    expect(out).not.toContain("#0a0a0a");
  });

  it("draw the Listen offline row whole, with no entrance of its own to wait on", () => {
    const out = render(createElement(PlusFeatureRows, { onTry: () => {} }));
    const offline = out.slice(out.indexOf('data-plus-feature="offline"'), out.indexOf('data-plus-feature="ambience"'));
    expect(offline).toContain(html(say("en", "plus.offline.name")));
    expect(offline).toContain(html(say("en", "plus.offline.body")));
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

  it("offers no Next after the last feature", () => {
    const rows = plusRowsLedBy(null);
    const last = rows[rows.length - 1];
    expect(render(createElement(PlusTryPage, { row: last, next: null, onNext: () => {} }))).not.toContain("data-plus-try-next");
  });
});

describe("each feature's own screen", () => {
  it("Ambience: John 1, and the six sounds as the ambience sheet names them", () => {
    const out = preview(TryAmbience, "ambience");
    expect(out).toContain("In the beginning was the Word, and the Word was with God, and the Word was God.");
    for (const t of AMBIENCE_TRACKS) expect(out, t.id).toContain(html(say("en", t.labelKey)));
    expect(out.match(/aria-pressed=/g)).toHaveLength(AMBIENCE_TRACKS.length);
  });

  it("Candlelight and Monastery: John 1 in Candlelight, with Dark and Monastery beside it", () => {
    const out = preview(TryReadingModes, "reading-modes");
    expect(out).toContain("--color-night:#0a0a0a");
    expect(out).toMatch(/aria-checked="true"[^>]*><span class="block truncate">Candlelight<\/span>/);
    expect(out.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(out).toContain(">Dark</span>");
    expect(out).toContain(">Monastery</span>");
    expect(out).toContain("All things were made by him");
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
  });

  it("the timeline in full dress: Florence's period art, moving, and its further pictures", () => {
    const out = preview(TryHistory, "immersive-history");
    expect(out).toContain("The Council of Ferrara–Florence");
    expect(out).toContain("history-pan");
    expect(out).toContain(">More pictures</p>");
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
