// The privacy lines Edgar approved on 2026-11-09 ("yes to all 4"), one for
// each admin feature that keeps something new (docs/1.9-build/BRAINSTORM.md),
// with the three he approved again on 2026-11-10 ("all recs": 68, 82a, 82b),
// which say more exactly what a membership record and an error report keep,
// and how long everything is kept.
// Each goes live with its feature, word for word: the features below are
// built, three of them waiting only on their tables, which he can create at
// any moment, so the page has to say it before they do. The page is built in
// English and in German, and carries each line in both.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { KEEP_DAYS } from "@/lib/ops/prune";

const page = fs.readFileSync("components/legal/PrivacyText.tsx", "utf8").replace(/\s+/g, " ");

const LINES = {
  "Plus records (A2, lib/billing/plusEvents.ts; 68)":
    "When you buy or renew a membership, we keep a record of it: which store, the plan, whether it is a free trial, the price and the dates, and, when a membership ends, why. Once you delete your account, it is no longer linked to you.",
  "Errors (A10, lib/errors/; 82a)":
    "When something fails, Purify keeps a short report: what failed and the error it gave, the page, the app version and the kind of device, never who you are. Anything in it that looks like an email address or a phone number is removed first, and each report is deleted after 14 days.",
  // The bracket ends "and the others described above" since the testing
  // counts (140, 88e8fc50) joined the page, kept the same way and not named.
  "How long we keep it (82b)":
    "We keep the anonymous visit data: the session and pageview rows, and the counts described above (the catechism, the welcome questions, the screens, what Purify Plus is wanted for, the Bibles downloaded, reading plans, journal pages and app versions, and the others described above). Nothing deletes them on a schedule; we keep them to see how Purify is used over time. Error reports are deleted after 14 days, and searches that found nothing after 90.",
  "The 1.9 counts (A5, lib/analytics/featureCounting.ts)":
    "We count, without your name, which Bible translations are downloaded, which reading plans are begun and finished, how many journal pages are written and shared, and which version of the app is in use.",
  "Searches that found nothing (A11, lib/search/)":
    "When a search finds nothing, we keep the words you searched, never who you are, for 90 days, so we can add what readers are looking for. Anything that looks like an email address or a phone number is removed before it is kept.",
  // His yes to 59 (2026-11-10), as the page writes its apostrophe.
  "What is kept while reading travels with Plus (59, supabase/migrations/20261110012059_user_kept.sql)":
    "With Purify Plus, what you keep while reading travels too: your progress in each reading plan, Remember the verse&rsquo;s schedule (which verse is due when, not its words), the quotes and your own words that you chose to learn by heart (kept with their words, since they cannot be fetched again the way a verse can), your place in the Bible and in each long work, and your reading settings (palette, size, typeface, line spacing and Focus). Each is one small record that only your account can read or change, and it is deleted with your account.",
  // Call 32, his yes of 2026-11-11 ("yes privacy and phone voice in v1.9"), the arbiter's words for it.
  "Signing in carries (call 32, P1)":
    "Purify works privately on this device with no account; signing in carries the days you have prayed and the names you pray for to every device, and with Purify Plus your highlights, notes and bookmarks too.",
  "Every field an account keeps (call 32, P3 and the field list)":
    "What you keep with your account goes to our Supabase Postgres database, so it reaches every device you sign in on. We store: your email (used to sign you in and to send confirmations on password/email changes), an Argon2 hash of your password (never the password itself), a display name, and a <code className=\"font-mono text-ui text-paper/70\"> profiles </code> row with your account creation date, when the row last changed, a flag for whether you&rsquo;ve set a password, the language you chose (so your other devices and our emails use it), and your answer to what you came for, so another device does not ask again. What you fill in on your Community profile is kept there too, and anyone can see it unless you make your profile private: your bio and status, your parish, your patron saint, your favourite verse and your links, and, when you turn it on, what you are reading now. The colour you give your name shows wherever your name does. Prayer-rule check-offs and the names you pray for travel as their own rows, and with Purify Plus so do highlights, notes and bookmarks.",
  "Starting on this device, then signing in (call 32, P4)":
    "If you start on this device and later sign in, the days you have prayed and the names you pray for are kept with your account, and with Purify Plus your highlights, notes and bookmarks too; nothing on the device is removed. Your calendar style stays on this device. Signing out never deletes what is saved on the device.",
  "What Supabase stores when you sign in (call 32, P5)":
    "If you sign in, Supabase stores the email address you signed in with and the rows you create: the days you have prayed and the names you pray for, and with Purify Plus your highlights, notes and bookmarks.",
  "The faith answers (call 32, item 8)":
    "Your answers themselves stay on your device, for making Purify yours. If you sign in, your answer to what you came for is kept with your account too; your answers about your faith, how familiar you are with Orthodox Christianity and your background, are not kept with it.",
  "Changes, with 1.9 (call 32)":
    "With 1.9: </p> <ul className=\"mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40\"> <li> Buy Me a Coffee is no longer listed: the Support page asks for no donation. </li> <li> Your answers about your faith are no longer kept with your account, and the copies kept before 1.9 are cleared. </li> <li> The prayer requests written before 1.9, which no one has seen since 1.9, are cleared with their words, the moderators&rsquo; records of those words, and who prayed for them. </li> </ul>",
};

// The German page carries the same lines (the page is built in both languages).
const LINES_DE = {
  "Plus records, in German":
    "Wenn du eine Mitgliedschaft abschließt oder verlängerst, bewahren wir eine Aufzeichnung davon auf: welcher Store, der Tarif, ob es eine kostenlose Probezeit ist, der Preis und die Datumsangaben und, wenn eine Mitgliedschaft endet, warum. Sobald du dein Konto löschst, ist sie nicht mehr mit dir verbunden.",
  "The 1.9 counts, in German":
    "Wir zählen, ohne deinen Namen, welche Bibelübersetzungen heruntergeladen werden, welche Lesepläne begonnen und beendet werden, wie viele Tagebuchseiten geschrieben und geteilt werden und welche Version der App benutzt wird.",
  "Errors, in German":
    "Wenn etwas fehlschlägt, behält Purify einen kurzen Bericht: was fehlgeschlagen ist und welchen Fehler es gab, die Seite, die App-Version und die Art des Geräts, niemals, wer du bist. Alles darin, was wie eine E-Mail-Adresse oder eine Telefonnummer aussieht, wird vorher entfernt, und jeder Bericht wird nach 14 Tagen gelöscht.",
  "How long we keep it, in German":
    "Die anonymen Besuchsdaten behalten wir: die Sitzungs- und Seitenaufruf-Zeilen und die oben beschriebenen Zählungen (zur Katechese, zu den Willkommensfragen, zu den Bildschirmen, dazu, wofür Purify Plus gewünscht wird, zu den heruntergeladenen Bibeln, den Leseplänen, den Tagebuchseiten, den App-Versionen und zu den übrigen oben beschriebenen). Nichts löscht sie nach Plan; wir behalten sie, um zu sehen, wie Purify über die Zeit genutzt wird. Fehlerberichte werden nach 14 Tagen gelöscht, erfolglose Suchen nach 90 Tagen.",
  "Searches that found nothing, in German":
    "Wenn eine Suche nichts findet, behalten wir 90 Tage lang die Wörter, nach denen du gesucht hast, niemals aber, wer du bist, damit wir ergänzen können, wonach Leser suchen. Alles, was wie eine E-Mail-Adresse oder eine Telefonnummer aussieht, wird entfernt, bevor es behalten wird.",
  "What is kept while reading travels with Plus, in German":
    "Mit Purify Plus wandert auch mit, was du beim Lesen behältst: dein Fortschritt in jedem Leseplan, der Plan von &bdquo;Den Vers auswendig lernen&ldquo; (welcher Vers wann dran ist, nicht sein Wortlaut), die Zitate und deine eigenen Worte, die du auswendig lernen willst (diese mit ihrem Wortlaut, weil sie sich nicht wie ein Vers neu laden lassen), deine Stelle in der Bibel und in jedem langen Werk und deine Leseeinstellungen (Palette, Größe, Schriftart, Zeilenabstand und Fokus). Jedes davon ist ein kleiner Eintrag, den nur dein Konto lesen oder ändern kann und der mit deinem Konto gelöscht wird.",
  "Signing in carries, in German":
    "Purify funktioniert privat auf diesem Gerät, ohne Konto; die Anmeldung bringt die Tage, an denen du gebetet hast, und die Namen, für die du betest, auf jedes Gerät, und mit Purify Plus auch deine Markierungen, Notizen und Lesezeichen.",
  "Every field an account keeps, in German":
    "Was du mit deinem Konto behältst, geht in unsere Supabase-Postgres-Datenbank, damit es jedes Gerät erreicht, auf dem du dich anmeldest. Wir speichern: deine E-Mail (um dich anzumelden und um Bestätigungen bei Passwort- oder E-Mail-Änderungen zu senden), einen Argon2-Hash deines Passworts (nie das Passwort selbst), einen Anzeigenamen und eine{\" \"} <code className=\"font-mono text-ui text-paper/70\">profiles</code> -Zeile mit dem Erstellungsdatum deines Kontos, dem Zeitpunkt, an dem die Zeile zuletzt geändert wurde, einem Kennzeichen, ob du ein Passwort gesetzt hast, der Sprache, die du gewählt hast (damit deine anderen Geräte und unsere E-Mails sie verwenden), und deiner Antwort darauf, wozu du gekommen bist, damit ein anderes Gerät nicht noch einmal fragt. Was du in deinem Profil in der Gemeinschaft ausfüllst, wird ebenfalls dort gespeichert, und jeder kann es sehen, außer du machst dein Profil privat: &bdquo;Über mich&ldquo; und dein Status, deine Gemeinde, dein Namenspatron, dein Lieblingsvers und deine Links und, wenn du es einschaltest, was du gerade liest. Die Namensfarbe, die du wählst, zeigt sich überall, wo dein Name steht. Abhakungen der Gebetsregel und die Namen, für die du betest, wandern als eigene Zeilen, und mit Purify Plus auch Markierungen, Notizen und Lesezeichen.",
  "Starting on this device, then signing in, in German":
    "Wenn du auf diesem Gerät beginnst und dich später anmeldest, werden die Tage, an denen du gebetet hast, und die Namen, für die du betest, mit deinem Konto bewahrt, und mit Purify Plus auch deine Markierungen, Notizen und Lesezeichen; auf dem Gerät wird nichts entfernt. Dein Kalenderstil bleibt auf diesem Gerät. Die Abmeldung löscht niemals, was auf dem Gerät gespeichert ist.",
  "What Supabase stores when you sign in, in German":
    "Wenn du dich anmeldest, speichert Supabase die E-Mail-Adresse, mit der du dich angemeldet hast, sowie die Zeilen, die du erstellst: die Tage, an denen du gebetet hast, und die Namen, für die du betest, und mit Purify Plus deine Markierungen, Notizen und Lesezeichen.",
  "The faith answers, in German":
    "Deine Antworten selbst bleiben auf deinem Gerät, damit Purify zu deinem wird. Wenn du dich anmeldest, wird deine Antwort darauf, wozu du gekommen bist, auch mit deinem Konto bewahrt; deine Antworten über deinen Glauben, wie vertraut du mit dem orthodoxen Christentum bist und deine Herkunft im Glauben, werden nicht damit bewahrt.",
  "Changes, with 1.9, in German":
    "Mit 1.9: </p> <ul className=\"mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40\"> <li> Buy Me a Coffee wird nicht mehr genannt: die Seite &bdquo;Dieses Werk unterstützen&ldquo; bittet um keine Spende. </li> <li> Deine Antworten über deinen Glauben werden nicht mehr mit deinem Konto bewahrt, und die vor 1.9 bewahrten Kopien werden gelöscht. </li> <li> Die vor 1.9 geschriebenen Gebetsbitten, die seit 1.9 niemand mehr gesehen hat, werden gelöscht, mit ihrem Wortlaut, den Aufzeichnungen der Moderatoren über diesen Wortlaut und den Angaben, wer für sie gebetet hat. </li> </ul>",
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

  it("and the one it makes about error reports: 14 days", () => {
    expect(KEEP_DAYS.app_errors).toBe(14);
  });

  it("names Buy Me a Coffee only to say it is no longer listed (call 32)", () => {
    expect(english.match(/Buy Me a Coffee[^<]*/g)).toEqual(["Buy Me a Coffee is no longer listed: the Support page asks for no donation. "]);
    expect(german.match(/Buy Me a Coffee[^<]*/g)).toEqual(["Buy Me a Coffee wird nicht mehr genannt: die Seite &bdquo;Dieses Werk unterstützen&ldquo; bittet um keine Spende. "]);
  });

  it("and no longer says the answers stay in the account, or that signing in synchronizes (call 32)", () => {
    expect(page).not.toContain("on your device and in your own account");
    expect(page).not.toContain("in deinem eigenen Konto, damit Purify");
    expect(page).not.toMatch(/Signed in \(synchronized\)|Angemeldet \(abgeglichen\)/);
  });
});
