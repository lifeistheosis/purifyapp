import { getServerLocale } from "@/lib/i18n/server";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { TranslationDisclaimer } from "@/components/i18n/TranslationDisclaimer";
import { T } from "@/components/i18n/T";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";

export const metadata = {
 title: "FAQ",
 description:
 "Twelve common questions about Purify: Orthodox alignment, Bible translations, calendar styles, prayer book sources, privacy, and the roadmap.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

type QA = {
 q: string;
 /**
  * Where the message catalogs hold the question, so the island that draws it
  * can ask it in the reader's language. A server component's own string is
  * baked into the apps in English, which is why the question is not drawn
  * from `q`. The English `q` stays as the fallback, and has to stay the
  * same, letter for letter, as en.json under this key
  * (lib/i18n/__tests__/smallLabels.test.ts holds the two together). The
  * German list has no keys: its questions are written out below.
  */
 k?: string;
 a: React.ReactNode;
};

const QUESTIONS: QA[] = [
 {
 q: "Is this Orthodox?",
 k: "faq.orthodox.q",
 a: (
 <>
 <p>
 <T k="ui.yesPurifyIsBuiltFor" />
 </p>
 </>
 ),
 },
 {
 q: "Which jurisdiction is this aligned with?",
 k: "faq.jurisdiction.q",
 a: (
 <>
 <p>
 <T k="ui.noneInParticularWeTry" />
 </p>
 </>
 ),
 },
 {
 q: "Which Bible do you use, and why?",
 k: "faq.bible.q",
 a: (
 <>
 <p>
 <T k="ui.theOldTestamentIsBrenton" />
 </p>
 <p>
 <T k="ui.theNewTestamentIsThe" />
 </p>
 </>
 ),
 },
 {
 q: "Why use the King James for the New Testament?",
 k: "faq.kingJames.q",
 a: (
 <>
 <p>
 <T k="ui.threeReasonsItIsPublic" />
 </p>
 </>
 ),
 },
 {
 q: "The Greek New Testament you show is Nestle 1904, why not Byzantine?",
 k: "faq.nestle.q",
 a: (
 <>
 <p>
 <T k="ui.weStartedWithRobinsonS" />
 </p>
 </>
 ),
 },
 {
 q: "Which calendar do you follow? Can I switch?",
 k: "faq.calendar.q",
 a: (
 <>
 <p>
 <T k="ui.theDefaultIsTheNew" />
 </p>
 </>
 ),
 },
 {
 q: "The fasting rule on the calendar looks different from what my priest says.",
 k: "faq.fasting.q",
 a: (
 <>
 <p>
 <T k="ui.trustYourPriestTheFasting" />
 </p>
 </>
 ),
 },
 {
 q: "Where did the daily prayer texts come from?",
 k: "faq.prayerTexts.q",
 a: (
 <>
 <p>
 <T k="ui.theMorningAndEveningRules" />
 </p>
 </>
 ),
 },
 {
 q: "Where are the Russian saints?",
 k: "faq.russianSaints.q",
 a: (
 <>
 <p>
 <T k="ui.theSaintsIndexLeansGreek" />
 </p>
 </>
 ),
 },
 {
 q: "Will there be akathists, audio, accounts, and cross-device sync?",
 k: "faq.roadmap.q",
 a: (
 <>
 <p>
 <T k="ui.accountsAndCrossDeviceSync" />{" "}
 <a
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.accountPage" />
 </a>{" "}
 <T k="ui.atAnyTime" />
 </p>
 <p>
 <T k="ui.akathistsTheTheotokosChristThe" />
 </p>
 </>
 ),
 },
 {
 q: "Is Purify free? Will anything cost money?",
 k: "faq.free.q",
 a: (
 <>
 <p>
 <T k="ui.everythingInTheAppToday" />
 </p>
 <p>
 <T k="ui.anOptionalLayerCalled" /> <strong><T k="study.purifyPlus" /></strong> <T k="ui.isPlannedForAfterThe" />
 </p>
 <p>
 <strong><T k="ui.preLaunchSupportersKeepLifetime" /></strong> <T k="ui.ifYouSupportedPurifyBefore" />
 </p>
 </>
 ),
 },
 {
 q: "What is Today's Catechism?",
 k: "faq.catechism.q",
 a: (
 <>
 <p>
 <T k="faq.catechism.a1" />
 </p>
 <p>
 <T k="faq.catechism.a2" />
 </p>
 </>
 ),
 },
 {
 q: "Do you collect any of my data?",
 k: "faq.data.q",
 a: (
 <>
 <p>
 <strong><T k="ui.withoutAnAccount" /></strong> <T k="ui.noAnalyticsNoThirdParty" />
 </p>
 <p>
 <strong><T k="ui.withAnAccount" /></strong> <T k="ui.theSameItemsAreAlso" />
 </p>
 <p>
 <T k="ui.inBothCasesOurHosting" />
 </p>
 </>
 ),
 },
 {
 q: "How do I install this on my phone, and how do I send feedback?",
 k: "faq.install.q",
 a: (
 <>
 <p>
 <T k="ui.purifyIsAProgressiveWeb" />
 </p>
 <p>
 <T k="ui.forFeedbackEmail" />{" "}
 <a
 href="mailto:team@purify.app"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.teamPurifyApp" />
 </a>
 <T k="ui.weReadEverythingWeAnswer" />
 </p>
 </>
 ),
 },
];

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
 href="mailto:team@purify.app"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.teamPurifyApp" />
 </a>
 <T k="ui.wirLesenAllesWirBeantworten" />
 </p>
 </>
 ),
 },
];

async function FaqContent() {
 const locale = await getServerLocale();
 const isDe = locale === "de";
 const questions = isDe ? QUESTIONS_DE : QUESTIONS;
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 {!isDe && <TranslationDisclaimer />}
 <p className="font-sans text-detail font-semibold text-paper/55 mb-4">
 {isDe ? "Häufige Fragen" : <T k="faq.eyebrow" />}
 </p>
 <h1 id="faq-title" className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {isDe ? "Ehrliche Antworten auf häufige Fragen." : <T k="faq.h1" />}
 </h1>
 <p className="mt-6 font-serif text-body text-paper/75 leading-[1.7]">
 {isDe
 ? "Ehrliche Antworten. Die erste ist offen; tippe auf jede andere, um sie zu öffnen."
 : "Honest answers. The first one is open; tap any other to expand."}
 </p>

 <div className="mt-10 space-y-3">
 {questions.map((qa, i) => (
 <details
 key={i}
 open={i === 0}
 className="group rounded-md border border-paper/12 bg-paper/[0.03] open:bg-paper/[0.05] transition-colors"
 >
 <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4">
 <span className="font-sans text-body md:text-body font-semibold text-paper leading-tight">
 {qa.k ? <T k={qa.k} /> : qa.q}
 </span>
 <span
 aria-hidden
 className="text-paper/45 group-open:rotate-180 transition-transform duration-200 text-caption shrink-0"
 >
 <ChevronDown size={14} className="block" />
 </span>
 </summary>
 <div className="px-5 pb-5 -mt-1 font-serif text-body text-paper/85 leading-[1.7] space-y-4">
 {qa.a}
 </div>
 </details>
 ))}
 </div>
 </article>
 </section>
 );
}

/*
 * On a phone the page wears the bar every screen under You wears (1.8): the
 * way back, and the page's name once its own heading has gone up under the
 * bar. It is a row of Settings, and wore the apps' plain back bar until then.
 */
export default async function FaqPage() {
  return (
    <>
      <MobileTopBar titleKey="faq.eyebrow" back backFallback="/support" revealTitleOn="faq-title" />
      <FaqContent />
    </>
  );
}
