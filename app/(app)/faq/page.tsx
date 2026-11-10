import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { FaqInReadersLanguage } from "@/components/faq/FaqInReadersLanguage";
import { FaqList, type QA } from "@/components/faq/FaqList";
import { T } from "@/components/i18n/T";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";

export const metadata = {
 title: "FAQ",
 description:
 "Twelve common questions about Purify: Orthodox alignment, Bible translations, calendar styles, prayer book sources, privacy, and the roadmap.",
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
 href={`mailto:${SUPPORT_EMAIL}`}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 {SUPPORT_EMAIL}
 </a>
 <T k="ui.weReadEverythingWeAnswer" />
 </p>
 </>
 ),
 },
];

/**
 * The English FAQ, drawn here; another language the reader reads is its own
 * file, drawn on the device (components/faq/FaqInReadersLanguage.tsx).
 */
function FaqContent() {
 return (
 <FaqInReadersLanguage>
 <FaqList
 questions={QUESTIONS}
 eyebrow={<T k="faq.eyebrow" />}
 h1={<T k="faq.h1" />}
 lead="Honest answers. The first one is open; tap any other to expand."
 leadLang="en"
 />
 </FaqInReadersLanguage>
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
