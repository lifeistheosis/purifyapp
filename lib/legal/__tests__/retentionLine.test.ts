import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { RETENTION_KINDS } from "@/lib/email/retention/kinds";
import { RETENTION_SWITCHES } from "@/lib/email/retention/switches";

/**
 * The Privacy Policy's line for the three retention lists, his "rec yes all"
 * (2026-11-14, about 14:45 UTC; docs/1.9-build/BRAINSTORM.md): the draft in
 * docs/plans/retention-emails.md ("A privacy line, for his words"), with
 * Updates 23's words after "a short guide for your first week (days 1, 3 and
 * 7)", beside the lists the page already names. Legal words: his, word for
 * word, nothing added. The German is a faithful rendering, shown to the
 * arbiter before it landed.
 */

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const AFTER = "a short guide for your first week (days 1, 3 and 7)";
const UPDATES_23 = ", which your welcome email offers in one line and which starts only when you press its button";

/** The page's words as a reader reads them: no comments, entities written out, one space between words. */
const words = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/&rsquo;/g, "'")
    .replace(/\s+/g, " ");

/** The draft as the plan holds it, with Updates 23's words where his yes put them. */
function hisWords() {
  const plan = read("docs/plans/retention-emails.md");
  const section = plan.slice(plan.indexOf("## A privacy line, for his words"));
  const quote = /\n> (Three more[^\n]+)/.exec(section)?.[1] ?? "";
  expect(quote, "the plan's draft").toContain(AFTER);
  return quote.replace(AFTER, AFTER + UPDATES_23);
}

const GERMAN =
  "Drei weitere, jede ausgeschaltet, bis du sie einschaltest: ein kurzer Leitfaden für deine erste Woche (Tage 1, 3 und 7), den deine Willkommens-E-Mail in einer Zeile anbietet und der erst beginnt, wenn du deren Schaltfläche drückst; eine Nachricht, wenn dein Konto zwei Wochen lang nichts bewahrt hat, und noch einmal nach einem Monat, die nennt, wo du gelesen hast, oder das Fest deines Namenspatrons in jener Woche; und ein Begleiter für jede Fastenzeit, wenn sie beginnt, und danach wöchentlich. Um sie zu schreiben, lesen wir nur, was dein Konto bereits bewahrt: wann es angelegt wurde, die Gebete, die du abgehakt hast, die Verse, die du bewahrt hast, deine Stelle in der Bibel und bei den Vätern sowie den Kalender und den Namenspatron in deinem Profil. Nichts Neues wird erhoben, nichts davon wird aufbewahrt, und die Besuchsdaten werden nie damit verknüpft.";

describe("the Privacy Policy's retention line", () => {
  const page = words(read("components/legal/PrivacyText.tsx"));

  it("says his words once in English, right after the two lists it already names", () => {
    const line = hisWords();
    expect(line.endsWith("never joined to it.")).toBe(true);
    expect(page.split(line).length - 1).toBe(1);
    expect(page).toContain(`both stay off until you turn them on in your account. ${line} A few times a year,`);
  });

  it("says them once in German, in the same place", () => {
    expect(page.split(GERMAN).length - 1).toBe(1);
    expect(page).toContain(`beide bleiben aus, bis du sie in deinem Konto einschaltest. ${GERMAN} Einige Male im Jahr,`);
  });

  it("keeps the promise it sits under: every retention list is still off", () => {
    for (const kind of RETENTION_KINDS) expect(RETENTION_SWITCHES[kind], kind).toBe("off");
  });
});

describe("the policy's lookup in words, its arrows gone (his yes, 2026-11-14)", () => {
  const page = read("components/legal/PrivacyText.tsx");

  it("names ipwho.is's lookup in words in both languages, the meaning unchanged", () => {
    expect(words(page)).toContain("<strong>ipwho.is</strong>, free, server-side IP-to-city lookup, used only on the first hit of an anonymous session");
    expect(words(page)).toContain("<strong>ipwho.is</strong>, freie serverseitige IP-zu-Stadt-Auflösung, nur beim ersten Treffer einer anonymen Sitzung");
    expect(page).not.toContain("&rarr;");
  });
});
