import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { TranslationDisclaimer } from "@/components/i18n/TranslationDisclaimer";

export const metadata = {
 title: "About",
 description:
 "A sanctuary for the Orthodox life outside the Liturgy. What Purify is, what it is made of, how it is kept, and the promises that hold underneath.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

export default async function AboutPage() {
 const locale = await getServerLocale();
 if (locale === "de") return <AboutDe />;
 const m = getMessages(locale);
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <TranslationDisclaimer />
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {t(m, "about.eyebrow")}
 </p>
 <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {t(m, "about.h1")}
 </h1>

 {/* §1 Manifesto / North Star */}
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 The north star
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 Purify is not an app, not a Bible reader, not a calendar, not a
 prayer book. It is one quiet home for all of those, set together
 so that no part stands alone. The Scriptures with the Fathers in
 the margin. The lives of the saints with their writings to read
 in full. Every day of the Church&rsquo;s year, fast and feast,
 in either reckoning. The morning and evening rules in the wording
 the diaspora has carried.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 The Liturgy is where the Church gathers. This is the room you
 come into between Liturgies: to pray when you rise, to read when
 you have an hour, to walk the year, to keep the fast.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Built for the praying life, not for retention loops. There are no
 analytics watching you read, no advertising in the margins, no
 notifications pulling you back. The site is plain on purpose. It
 hopes to be the only thing open on the screen for a little while,
 and then to be closed.
 </p>

 {/* §2 Radical Textual Honesty */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 What it is made of
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Every text named. Every source open.
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Purify hides nothing about what it puts in front of you. The
 Scriptures, the prayers, and the Fathers are drawn from sources
 you can verify line by line.
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong className="text-paper">Old Testament</strong>, Brenton&rsquo;s
 1851 English Septuagint, with the deuterocanonical books and
 the Church&rsquo;s Psalter numbering.
 </li>
 <li>
 <strong className="text-paper">New Testament</strong>, The King
 James Version of 1611.
 </li>
 <li>
 <strong className="text-paper">Greek</strong>, Nestle 1904,
 polytonic, with Strong&rsquo;s numbers and Robinson morphology
 on every word.
 </li>
 <li>
 <strong className="text-paper">The Fathers</strong>, Schaff&rsquo;s
 Ante-Nicene and Nicene Fathers (1885&ndash;1900), the standard
 English critical editions.
 </li>
 <li>
 <strong className="text-paper">Daily prayers</strong>, The wording
 carried by the Jordanville Prayer Book, the editions of St.
 Tikhon&rsquo;s Monastery, and Isabel Hapgood&rsquo;s Service Book.
 </li>
 <li>
 <strong className="text-paper">The Calendar</strong>, Fixed feasts
 on the New (Revised Julian) reckoning of the Ecumenical
 Patriarchate; an Old (Julian) toggle for the Russian, Serbian,
 Athonite, and Jerusalem traditions. Pascha by the algorithm
 shared by all canonical Orthodox churches.
 </li>
 </ul>
 <p className="mt-5 font-serif text-body text-paper/85 leading-[1.7]">
 Over ninety per cent of the textual treasury is in the public
 domain. The site also carries three modern translations under
 proper license, the New King James, the New International,
 and the New Living, fetched live from the publishers and
 shown exactly as set, footnotes and all, with their attribution
 intact. Nothing is repackaged. No translation is concealed inside
 a black-box rendering. There are no proprietary lock-ins.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Where the Orthodox jurisdictions disagree on a point of practice
, most often the calendar and the fast, Purify
 surfaces both readings and does not arbitrate. The Church has not
 asked it to.
 </p>

 {/* §3 Ethical Privacy Covenant */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Your reading life is yours
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 A covenant on privacy.
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 What you highlight, what you note, what you bookmark, the length
 of your prayer streak, these belong to you and only to you.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 By default, all of it lives on your device, in the local storage
 of the browser you are reading in. There is no server row, no
 profile, no copy elsewhere. Purify cannot read it because Purify
 never receives it.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 If you want your notes and bookmarks to follow you between phone
 and laptop, you may open a{" "}
 <strong className="text-paper">public account</strong>, your
 email and a password, or one of the OAuth providers wired into
 the site. The same data is then stored in a row under your name,
 behind row-level security, so no one else may read it. You may
 sign out at any time, and delete the account and every row
 attached to it from the Data tab on your dashboard. The choice
 between the two paths is named plainly the first time you open{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>
 , and is reversible in either direction.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 There is no analytics layer. No third-party tracker. No advertising
 network. The full details, with every field and every third party
 named, are set out on the{" "}
 <Link
 href="/privacy"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 privacy page
 </Link>
 .
 </p>

 {/* §4 Stewardship & the Road Ahead */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 How it is kept
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Mission-first, independently built.
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 This work is kept by an independent steward, not a company. There
 is no investor to satisfy, no growth team to feed, and no incentive
 to keep you on the page longer than you came to be. What ships,
 and what does not, is decided for the sake of the Faith confessed
 by the Fathers and for the sake of the readers who pray with us.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 The{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-link hover:text-paper underline underline-offset-2 decoration-link/35"
 >
 Discord server
 </a>{" "}
 and the Instagram account{" "}
 <a
 href="https://instagram.com/purifymylife"
 target="_blank"
 rel="noopener noreferrer"
 className="text-gold hover:text-paper underline underline-offset-2 decoration-gold/35"
 >
 @purifymylife
 </a>{" "}
 exist for the community, not for the algorithm. Conversation
 about the texts, about the saints, about the year, that
 is what they are for.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Purify is funded today by freewill gifts, transparently itemized
 on the{" "}
 <Link
 href="/support"
 className="text-gold hover:underline underline-offset-2"
 >
 Support page
 </Link>
 . The core spiritual treasury, every saint&rsquo;s life,
 every primary writing of the Fathers, the Scriptures with the
 Greek beside them, the daily prayers, the calendar, will
 remain free of charge, always.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 A heavier infrastructure layer is on the way, and the licensing
 is being upgraded so that it can be offered honestly. When that
 optional, subscription-funded layer arrives, it will exist solely
 to pay for the work it requires, the servers, the
 production, the rights, and to keep the core forever open
 to anyone who needs it. What is free today will still be free
 then.
 </p>

 {/* §5 Contributors */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Readers who have shaped Purify
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Contributors
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Purify is editorially small, but it is not alone. Readers in the
 Discord and through /contact regularly send patristic citations,
 corrections, and theological notes that the editors take seriously
 and that shape what ships. The following readers contributed
 substantively to specific patches:
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong className="text-paper">ChristosAnesti</strong>, the
 florilegium on the essence-energies distinction (v6.8), including
 the patristic and Scriptural witnesses underlying the new hosted
 page on Gregory Palamas&rsquo;s profile.
 </li>
 </ul>
 <p className="mt-4 font-serif text-ui text-paper/55 leading-[1.65] italic">
 If you have contributed a citation, a translation note, or an
 editorial correction that shipped, and you do not see your handle
 here, write us; we want to keep this list honest.
 </p>

 {/* §5b Promoters */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Readers who have spread the word
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Promoters
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Purify has no advertising budget and buys no reach. It grows because
 readers tell other readers. The following have gone out of their way
 to point people here:
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong className="text-paper">Wojack</strong> (
 <a
 href="https://www.tiktok.com/@spyridons.ponder"
 target="_blank"
 rel="noopener noreferrer"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 @Spyridons.ponder
 </a>
 ), for sharing Purify with his audience on TikTok.
 </li>
 </ul>
 <p className="mt-4 font-serif text-ui text-paper/55 leading-[1.65] italic">
 If you have shared Purify somewhere and would like to be named here,
 write us; we are grateful for every reader you send.
 </p>

 {/* §6 Closing Doxology */}
 <div className="mt-16 pt-10 border-t border-paper/10 text-center">
 <p className="font-serif italic text-title-sm md:text-title tracking-wide leading-[1.4] max-w-[560px] mx-auto text-gold">
 Glory to God for all things.
 </p>
 </div>
 </article>
 </section>
 );
}

// German render, full editorial translation, no machine output. Mirrors
// the English structure section for section so cross-checking is easy.
function AboutDe() {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 Über
 </p>
 <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 Eine Wohnung für das orthodoxe Leben.
 </h1>

 {/* §1 Manifest / Nordstern */}
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Der Nordstern
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 Purify ist nicht eine App, nicht ein Bibelleser, nicht ein
 Kalender, nicht ein Gebetbuch. Es ist eine stille Wohnung für
 dies alles, so beieinander, daß kein Teil allein steht. Die
 Schriften mit den Vätern am Rand. Die Leben der Heiligen mit
 ihren Schriften, ganz zu lesen. Jeder Tag des Kirchenjahres,
 Fasten und Fest, nach beiden Reckonungen. Die Morgen- und
 Abendregel im Wortlaut, den die Diaspora getragen hat.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Die göttliche Liturgie ist der Ort, wo die Kirche sich versammelt.
 Dies ist die Kammer, in die du zwischen den Liturgien hineingehst:
 um zu beten, wenn du aufstehst, um zu lesen, wenn du eine Stunde
 hast, um das Jahr zu gehen, um das Fasten zu halten.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Für das betende Leben gebaut, nicht für Rückbindungsschleifen. Es
 gibt keine Analytik, die dich beim Lesen beobachtet, keine Werbung
 am Rand, keine Benachrichtigungen, die dich zurückziehen. Die Seite
 ist absichtlich schlicht. Sie hofft, eine kleine Weile lang das
 Einzige zu sein, was auf dem Bildschirm offen ist, und dann
 geschlossen zu werden.
 </p>

 {/* §2 Radikale Texttreue */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Woraus es gemacht ist
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Jeder Text genannt. Jede Quelle offen.
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Purify verbirgt nichts darüber, was es dir vorlegt. Die Schriften,
 die Gebete und die Väter sind aus Quellen geschöpft, die du Zeile
 für Zeile prüfen kannst.
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong className="text-paper">Altes Testament</strong>, Brentons
 englische Septuaginta von 1851, mit den deuterokanonischen Büchern
 und der Psalterzählung der Kirche.
 </li>
 <li>
 <strong className="text-paper">Neues Testament</strong>, die King-James-Bibel
 von 1611.
 </li>
 <li>
 <strong className="text-paper">Griechisch</strong>, Nestle 1904,
 polytonisch, mit Strong-Nummern und Robinson-Morphologie auf
 jedem Wort.
 </li>
 <li>
 <strong className="text-paper">Die Väter</strong>, Schaffs
 Ante-Nicene und Nicene Fathers (1885&ndash;1900), die
 klassischen englischen kritischen Ausgaben.
 </li>
 <li>
 <strong className="text-paper">Tägliche Gebete</strong>, der
 Wortlaut, den das Jordanville-Gebetbuch, die Ausgaben des
 Hl. Tichon-Klosters und Isabel Hapgoods Service Book tragen.
 </li>
 <li>
 <strong className="text-paper">Der Kalender</strong>, die festen
 Feste nach der Neuen (Revidierten Julianischen) Reckonung des
 Ökumenischen Patriarchats; eine Umschaltung auf das Alte
 (Julianische) für die russische, serbische, athonitische und
 jerusalemische Überlieferung. Pascha nach dem Algorithmus, den
 alle kanonischen orthodoxen Kirchen teilen.
 </li>
 </ul>
 <p className="mt-5 font-serif text-body text-paper/85 leading-[1.7]">
 Über neunzig Prozent des Textschatzes liegen gemeinfrei. Die Seite
 trägt außerdem drei moderne Übersetzungen unter ordentlicher
 Lizenz, die New King James, die New International und
 die New Living,, die unmittelbar von den Verlagen geholt
 und genau so gezeigt werden, wie sie gesetzt sind, mit Fußnoten
 und allem, ihre Verfasserangabe unangetastet. Nichts wird
 umverpackt. Keine Übersetzung wird in einer Blackbox versteckt.
 Es gibt keine geschützten Einbindungen.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Wo die orthodoxen Jurisdiktionen in einem Punkt der Praxis
 voneinander abweichen, meistens im Kalender und im Fasten
,, legt Purify beide Lesarten vor und richtet nicht. Die
 Kirche hat es nicht darum gebeten.
 </p>

 {/* §3 Ethischer Privatheitsbund */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Dein Lese-Leben gehört dir
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Ein Bund über die Privatheit.
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Was du markierst, was du dir notierst, was du als Lesezeichen
 setzt, die Länge deiner Gebets-Strähne, das gehört dir
 und nur dir.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Voreingestellt lebt all das auf deinem Gerät, im Lokalspeicher des
 Browsers, in dem du gerade liest. Es gibt keine Zeile auf einem
 Server, kein Profil, keine Kopie anderswo. Purify kann es nicht
 lesen, weil Purify es niemals empfängt.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Wenn du möchtest, daß deine Notizen und Lesezeichen dir zwischen
 Telefon und Laptop folgen, kannst du ein{" "}
 <strong className="text-paper">öffentliches Konto</strong> öffnen
, deine E-Mail und ein Paßwort, oder einen der in die Seite
 eingebauten OAuth-Anbieter. Dieselben Daten werden dann in einer
 Zeile unter deinem Namen gespeichert, hinter zeilenstrenger
 Sicherheit, so daß niemand sonst sie lesen kann. Du kannst dich
 jederzeit abmelden und das Konto sowie jede zugehörige Zeile aus
 dem Daten-Reiter deines Dashboards löschen. Die Wahl zwischen
 beiden Wegen wird beim ersten Öffnen von{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>{" "}
 schlicht benannt und ist in beide Richtungen umkehrbar.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Es gibt keine Analytik-Schicht. Keinen Tracker eines Dritten. Kein
 Werbenetz. Die vollen Einzelheiten, mit jedem Feld und jedem
 Dritten beim Namen, findest du auf der{" "}
 <Link
 href="/privacy"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 Datenschutzseite
 </Link>
 .
 </p>

 {/* §4 Verwaltung und der Weg voraus */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Wie es bewahrt wird
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Sendungsorientiert, unabhängig gebaut.
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Dieses Werk wird von einer unabhängigen Verwaltung gehalten, nicht
 von einer Firma. Es gibt keinen Investor zu befriedigen, kein
 Wachstumsteam zu speisen und keinen Anreiz, dich länger auf der
 Seite zu halten, als du gekommen bist, um es zu sein. Was
 geliefert wird und was nicht, wird um des Glaubens willen
 entschieden, der von den Vätern bekannt ist, und um der Leser
 willen, die mit uns beten.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Der{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-link hover:text-paper underline underline-offset-2 decoration-link/35"
 >
 Discord-Server
 </a>{" "}
 und das Instagram-Konto{" "}
 <a
 href="https://instagram.com/purifymylife"
 target="_blank"
 rel="noopener noreferrer"
 className="text-gold hover:text-paper underline underline-offset-2 decoration-gold/35"
 >
 @purifymylife
 </a>{" "}
 sind für die Gemeinschaft da, nicht für den Algorithmus. Gespräch
 über die Texte, über die Heiligen, über das Jahr, dafür
 sind sie.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Purify wird heute durch freiwillige Gaben getragen, die auf der{" "}
 <Link
 href="/support"
 className="text-gold hover:underline underline-offset-2"
 >
 Unterstützungsseite
 </Link>{" "}
 durchsichtig aufgeschlüsselt sind. Der geistliche Kernschatz
, das Leben jedes Heiligen, jedes wichtige Schreiben der
 Väter, die Schriften mit dem Griechischen daneben, die täglichen
 Gebete, der Kalender, wird immer unentgeltlich bleiben.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Eine schwerere Infrastrukturschicht ist im Werden, und die
 Lizenzierung wird verbessert, damit sie ehrlich angeboten werden
 kann. Wenn diese freiwillige, durch Abonnement getragene Schicht
 kommt, wird sie ausschließlich dazu da sein, die Arbeit zu
 bezahlen, die sie verlangt, die Server, die Produktion,
 die Rechte, und den Kern für jeden, der ihn braucht,
 immer offen zu halten. Was heute frei ist, wird dann noch frei
 sein.
 </p>

 {/* §5 Mitarbeiter */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Leser, die Purify mitgeprägt haben
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Mitwirkende
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Purify ist redaktionell klein, aber nicht allein. Leser im Discord
 und über /contact schicken regelmäßig patristische Zitate,
 Korrekturen und theologische Anmerkungen, die die Redaktion ernst
 nimmt und die prägen, was geliefert wird. Die folgenden Leser
 haben wesentlich zu bestimmten Patches beigetragen:
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong className="text-paper">ChristosAnesti</strong>, das
 Florilegium zur Wesens-Energien-Unterscheidung (v6.8), samt der
 patristischen und Schrift-Zeugen, die der neuen Seite auf dem
 Profil des heiligen Gregor Palamas zugrunde liegen.
 </li>
 </ul>
 <p className="mt-4 font-serif text-ui text-paper/55 leading-[1.65] italic">
 Wenn du ein Zitat, eine Übersetzungsanmerkung oder eine
 redaktionelle Korrektur beigetragen hast, die geliefert wurde, und
 deinen Namen hier nicht siehst, schreib uns; wir wollen diese
 Liste ehrlich halten.
 </p>

 {/* §5b Förderer */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Leser, die Purify bekannt gemacht haben
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Förderer
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Purify hat kein Werbebudget und kauft keine Reichweite. Es wächst,
 weil Leser anderen Lesern davon erzählen. Die folgenden haben sich
 besondere Mühe gegeben, Menschen hierher zu weisen:
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong className="text-paper">Wojack</strong> (
 <a
 href="https://www.tiktok.com/@spyridons.ponder"
 target="_blank"
 rel="noopener noreferrer"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 @Spyridons.ponder
 </a>
 ), dafür, daß er Purify mit seinem Publikum auf TikTok geteilt hat.
 </li>
 </ul>
 <p className="mt-4 font-serif text-ui text-paper/55 leading-[1.65] italic">
 Wenn du Purify irgendwo geteilt hast und hier genannt werden
 möchtest, schreib uns; wir sind für jeden Leser dankbar, den du
 schickst.
 </p>

 {/* §6 Schluss-Doxologie */}
 <div className="mt-16 pt-10 border-t border-paper/10 text-center">
 <p className="font-serif italic text-title-sm md:text-title tracking-wide leading-[1.4] max-w-[560px] mx-auto text-gold">
 Ehre sei Gott für alles.
 </p>
 </div>
 </article>
 </section>
 );
}
