// The privacy lines Edgar approved on 2026-11-09 ("yes to all 4"), one for
// each admin feature that keeps something new (docs/1.9-build/BRAINSTORM.md).
// Each goes live with its feature, word for word: the features below are
// built, three of them waiting only on their tables, which he can create at
// any moment, so the page has to say it before they do. The page is built in
// English and in German, and carries each line in both.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { KEEP_DAYS } from "@/lib/ops/prune";

const page = fs.readFileSync("app/(app)/privacy/page.tsx", "utf8").replace(/\s+/g, " ");

const LINES = {
  "Plus records (A2, lib/billing/plusEvents.ts)":
    "When you buy or renew a membership, we keep a record of it: which store, the price and the dates. Once you delete your account, it is no longer linked to you.",
  "Errors (A10, lib/errors/)": "When something fails, the app reports the page, the app version and the kind of device, never who you are.",
  "The 1.9 counts (A5, lib/analytics/featureCounting.ts)":
    "We count, without your name, which Bible translations are downloaded, which reading plans are begun and finished, how many journal pages are written and shared, and which version of the app is in use.",
  "Searches that found nothing (A11, lib/search/)":
    "When a search finds nothing, we keep the words you searched, never who you are, for 90 days, so we can add what readers are looking for. Anything that looks like an email address or a phone number is removed before it is kept.",
  // His yes to 59 (2026-11-10), as the page writes its apostrophe.
  "What is kept while reading travels with Plus (59, supabase/migrations/20261110012059_user_kept.sql)":
    "With Purify Plus, what you keep while reading travels too: your progress in each reading plan, Remember the verse&rsquo;s schedule (which verse is due when, not its words), your place in the Bible and in each long work, and your reading settings (palette, size, typeface, line spacing and Focus). Each is one small record that only your account can read or change, and it is deleted with your account.",
};

// The German page carries the same lines (the page is built in both languages).
const LINES_DE = {
  "Plus records, in German":
    "Wenn du eine Mitgliedschaft abschließt oder verlängerst, bewahren wir eine Aufzeichnung davon auf: welcher Store, der Preis und die Datumsangaben. Sobald du dein Konto löschst, ist sie nicht mehr mit dir verbunden.",
  "The 1.9 counts, in German":
    "Wir zählen, ohne deinen Namen, welche Bibelübersetzungen heruntergeladen werden, welche Lesepläne begonnen und beendet werden, wie viele Tagebuchseiten geschrieben und geteilt werden und welche Version der App benutzt wird.",
  "Errors, in German": "Wenn etwas fehlschlägt, meldet die App die Seite, die App-Version und die Art des Geräts, niemals, wer du bist.",
  "Searches that found nothing, in German":
    "Wenn eine Suche nichts findet, behalten wir 90 Tage lang die Wörter, nach denen du gesucht hast, niemals aber, wer du bist, damit wir ergänzen können, wonach Leser suchen. Alles, was wie eine E-Mail-Adresse oder eine Telefonnummer aussieht, wird entfernt, bevor es behalten wird.",
  "What is kept while reading travels with Plus, in German":
    "Mit Purify Plus wandert auch mit, was du beim Lesen behältst: dein Fortschritt in jedem Leseplan, der Plan von &bdquo;Den Vers auswendig lernen&ldquo; (welcher Vers wann dran ist, nicht sein Wortlaut), deine Stelle in der Bibel und in jedem langen Werk und deine Leseeinstellungen (Palette, Größe, Schriftart, Zeilenabstand und Fokus). Jedes davon ist ein kleiner Eintrag, den nur dein Konto lesen oder ändern kann und der mit deinem Konto gelöscht wird.",
};

const german = page.slice(page.indexOf("function PrivacyDe()"));
const english = page.slice(0, page.indexOf("function PrivacyDe()"));

// The line for tests of two versions (lib/ab/), his "sure" of 2026-11-10 to
// it as written. No test may run before the page says this.
const TESTS_LINE =
  "Sometimes two readers are shown a different version of the same screen, so we can learn which one helps. Which version your device shows is decided on your device, by a random number that never leaves it. A count may then also say which version it was, and nothing else is added: no session id, no account, no device id. &ldquo;A reader shown the second version came back a week later&rdquo; is one more on a total, never you.";
const TESTS_LINE_DE =
  "Manchmal sehen zwei Leser eine unterschiedliche Fassung desselben Bildschirms, damit wir lernen, welche hilft. Welche Fassung dein Gerät zeigt, wird auf deinem Gerät entschieden, durch eine Zufallszahl, die es nie verlässt. Eine Zählung kann dann auch sagen, welche Fassung es war, und sonst kommt nichts hinzu: keine Sitzungs-Kennung, kein Konto, keine Geräte-Kennung. &bdquo;Ein Leser, dem die zweite Fassung gezeigt wurde, kam eine Woche später wieder&ldquo; ist einer mehr in einer Summe, nie du.";

describe("the privacy page carries each approved line, word for word", () => {
  it("Tests of two versions (lib/ab/)", () => expect(english).toContain(TESTS_LINE));
  it("Tests of two versions, in German", () => expect(german).toContain(TESTS_LINE_DE));

  for (const [what, line] of Object.entries(LINES)) {
    it(what, () => expect(english).toContain(line));
  }
  for (const [what, line] of Object.entries(LINES_DE)) {
    it(what, () => expect(german).toContain(line));
  }

  it("and keeps the promise it makes about searches: 90 days", () => {
    expect(KEEP_DAYS.search_misses).toBe(90);
  });
});
