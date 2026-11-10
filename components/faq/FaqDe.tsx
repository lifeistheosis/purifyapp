import { T } from "@/components/i18n/T";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";

import { FaqList, type QA } from "./FaqList";

/**
 * The FAQ in German (1.9, the reader's language in the apps): its own file,
 * loaded on the device when the reader's language is German
 * (./FaqInReadersLanguage.tsx), never written into the page, which writes
 * the English. Until 1.9 the page chose it on the server, which in the apps
 * knows no reader. The German list has no keys: its questions are written
 * out here.
 */

const QUESTIONS_DE: QA[] = [
 {
 q: "Ist das orthodox?",
 a: (
 <p>
 <T k="ui.jaPurifyIstFR" />
 </p>
 ),
 },
 {
 q: "An welcher Jurisdiktion ist Purify ausgerichtet?",
 a: (
 <p>
 <T k="ui.anKeinerBestimmtenWirBem" />
 </p>
 ),
 },
 {
 q: "Welche Bibel benutzt ihr, und warum?",
 a: (
 <>
 <p>
 <T k="ui.dasAlteTestamentIstBrentons" />
 </p>
 <p>
 <T k="ui.dasNeueTestamentIstDie" />
 </p>
 </>
 ),
 },
 {
 q: "Warum die King-James-Bibel fürs Neue Testament?",
 a: (
 <p>
 <T k="ui.dreiGrNdeSieIst" />
 </p>
 ),
 },
 {
 q: "Das griechische Neue Testament, das ihr zeigt, ist Nestle 1904, warum nicht Byzantinisch?",
 a: (
 <p>
 <T k="ui.wirBegannenMitRobinsonsByzantinischer" />
 </p>
 ),
 },
 {
 q: "Welchem Kalender folgt ihr? Kann ich umschalten?",
 a: (
 <p>
 <T k="ui.voreingestelltIstDerNeueRevidierte" />
 </p>
 ),
 },
 {
 q: "Die Fastenregel im Kalender sieht anders aus, als mein Priester sagt.",
 a: (
 <p>
 <T k="ui.vertrauDeinemPriesterDieFastenregeln" />
 </p>
 ),
 },
 {
 q: "Woher kommen die täglichen Gebetstexte?",
 a: (
 <p>
 <T k="ui.dieMorgenUndAbendregelStehen" />
 </p>
 ),
 },
 {
 q: "Wo sind die russischen Heiligen?",
 a: (
 <p>
 <T k="ui.dasHeiligenverzeichnisNeigtVorerstZum" />
 </p>
 ),
 },
 {
 q: "Wird es Akathiste, Audio, Konten und Geräteabgleich geben?",
 a: (
 <>
 <p>
 <T k="ui.kontenUndGerTeabgleichKamen" />{" "}
 <a
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.kontoseite" />
 </a>{" "}
 <T k="ui.lSchen" />
 </p>
 <p>
 <T k="ui.dieAkathisteAnDieGottesgeb" />
 </p>
 </>
 ),
 },
 {
 q: "Sammelt ihr irgendwelche meiner Daten?",
 a: (
 <>
 <p>
 <strong><T k="ui.ohneKonto" /></strong> <T k="ui.keineAnalytikKeineFremdenSkripte" />
 </p>
 <p>
 <strong><T k="ui.mitKonto" /></strong> <T k="ui.dieselbenPostenWerdenAuchAuf" />
 </p>
 <p>
 <T k="ui.inBeidenFLlenSieht" />
 </p>
 </>
 ),
 },
 {
 q: "Wie installiere ich das auf meinem Telefon, und wie schicke ich Rückmeldung?",
 a: (
 <>
 <p>
 <T k="ui.purifyIstEineProgressiveWeb" />
 </p>
 <p>
 <T k="ui.fRRCkmeldungSchreib" />{" "}
 <a
 href={`mailto:${SUPPORT_EMAIL}`}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 {SUPPORT_EMAIL}
 </a>
 <T k="ui.wirLesenAllesWirBeantworten" />
 </p>
 </>
 ),
 },
];

export function FaqDe() {
 return (
 <FaqList
 questions={QUESTIONS_DE}
 eyebrow="Häufige Fragen"
 h1="Ehrliche Antworten auf häufige Fragen."
 lead="Ehrliche Antworten. Die erste ist offen; tippe auf jede andere, um sie zu öffnen."
 />
 );
}
