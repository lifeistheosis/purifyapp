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
};

const german = page.slice(page.indexOf("function PrivacyDe()"));
const english = page.slice(0, page.indexOf("function PrivacyDe()"));

describe("the privacy page carries each approved line, word for word", () => {
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
