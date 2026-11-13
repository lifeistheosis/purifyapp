import Link from "next/link";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { AboutInReadersLanguage } from "@/components/about/AboutInReadersLanguage";
import { T } from "@/components/i18n/T";
import { photoCredits } from "@/lib/credits/photos";

export const metadata = {
 title: "About",
 description:
 "A sanctuary for the Orthodox life outside the Liturgy. What Purify is, what it is made of, how it is kept, and the promises that hold underneath.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

/**
 * The page in the catalog's words, which are in all 21 languages, so it says
 * nothing about a language and has no note that its body is English (it had
 * one, which was true of no reader). German has a page written of its own,
 * drawn on the device (components/about/AboutInReadersLanguage.tsx).
 */
function AboutContent() {
 return (
  <AboutInReadersLanguage credits={photoCredits().length > 0}>
   <AboutEn />
  </AboutInReadersLanguage>
 );
}

function AboutEn() {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold text-paper/55 mb-4">
 <T k="about.eyebrow" />
 </p>
 <h1 id="about-title" className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 <T k="about.h1" />
 </h1>

 {/* §1 Manifesto / North Star */}
 <p className="mt-10 font-sans text-caption font-semibold text-paper/55">
 <T k="about.northStar" />
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyIsAnEasternOrthodox" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.theLiturgyIsWhereThe" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="about.prayingLife" />
 </p>

 {/* §2 Radical Textual Honesty */}
 <p className="mt-12 font-sans text-caption font-semibold text-paper/55">
 <T k="about.whatItIsMadeOf" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="about.everyTextNamed" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyHidesNothingAboutWhat" />
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc ps-6 marker:text-paper/35">
 <li>
 <strong className="text-paper"><T k="footer.oldTestament" /></strong><T k="ui.brentonS1851EnglishSeptuagint" />
 </li>
 <li>
 <strong className="text-paper"><T k="footer.newTestament" /></strong><T k="ui.theKingJamesVersionOf" />
 </li>
 <li>
 <strong className="text-paper"><T k="ui.greek" /></strong><T k="ui.nestle1904PolytonicWithStrong" />
 </li>
 <li>
 <strong className="text-paper"><T k="footer.theFathers" /></strong><T k="ui.schaffSAnteNiceneAnd" />
 </li>
 <li>
 <strong className="text-paper"><T k="ui.dailyPrayers" /></strong><T k="ui.theWordingCarriedByThe" />
 </li>
 <li>
 <strong className="text-paper"><T k="footer.calendar" /></strong><T k="ui.fixedFeastsOnTheNew" />
 </li>
 </ul>
 <p className="mt-5 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.overNinetyPerCentOf" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.whereTheOrthodoxJurisdictionsDisagree" />
 </p>

 {/* §3 Ethical Privacy Covenant */}
 <p className="mt-12 font-sans text-caption font-semibold text-paper/55">
 <T k="about.yourReadingLifeIsYours" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="about.covenantOnPrivacy" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.whatYouHighlightWhatYou" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.byDefaultAllOfIt" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="about.syncLead" />{" "}
 <strong className="text-paper"><T k="about.syncPlus" /></strong><T k="about.syncRest" />{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.account" />
 </Link>
 <T k="ui.andIsReversibleInEither" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="about.counts" />{" "}
 <Link
 href="/privacy"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.privacyPage" />
 </Link>
 .
 </p>

 {/* §4 Stewardship & the Road Ahead */}
 <p className="mt-12 font-sans text-caption font-semibold text-paper/55">
 <T k="about.howItIsKept" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="about.missionFirst" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.thisWorkIsKeptBy" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.the" />{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-link hover:text-paper underline underline-offset-2 decoration-link/35"
 >
 <T k="ui.discordServer" />
 </a>{" "}
 <T k="ui.andTheInstagramAccount" />{" "}
 <a
 href="https://instagram.com/purifymylife"
 target="_blank"
 rel="noopener noreferrer"
 className="text-gold hover:text-paper underline underline-offset-2 decoration-gold/35"
 >
 @purifymylife
 </a>{" "}
 <T k="ui.existForTheCommunityNot" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyIsFundedTodayBy" />{" "}
 <Link
 href="/support"
 className="text-gold underline decoration-gold/50 hover:decoration-gold underline-offset-2"
 >
 <T k="ui.supportPage" />
 </Link>
 <T k="ui.theCoreSpiritualTreasuryEvery" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.aHeavierInfrastructureLayerIs" />
 </p>

 {/* §5 Contributors */}
 <p className="mt-12 font-sans text-caption font-semibold text-paper/55">
 <T k="ui.readersWhoHaveShapedPurify" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="ui.contributors" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyIsEditoriallySmallBut" />
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc ps-6 marker:text-paper/35">
 <li>
 <strong className="text-paper"><T k="ui.christosanesti" /></strong><T k="ui.theFlorilegiumOnTheEssence" />
 </li>
 </ul>
 <p className="mt-4 font-serif text-ui text-paper/55 leading-[1.65] italic">
 <T k="ui.ifYouHaveContributedA" />
 </p>

 {/* 1.9: the photographers some pictures are made from (lib/credits/photos.ts), once there is one to name. */}
 {photoCredits().length > 0 ? (
 <p className="mt-4 font-sans text-ui text-paper/70">
 <Link href="/credits" className="hit-44 underline underline-offset-2 decoration-paper/30 hover:text-paper hover:decoration-paper">
 <T k="credits.title" />
 </Link>
 </p>
 ) : null}

 {/* §5b Promoters */}
 <p className="mt-12 font-sans text-caption font-semibold text-paper/55">
 <T k="ui.readersWhoHaveSpreadThe" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="ui.promoters" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyHasNoAdvertisingBudget" />
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc ps-6 marker:text-paper/35">
 <li>
 <strong className="text-paper"><T k="ui.harrisonHill" /></strong> (
 <a
 href="https://www.tiktok.com/@spyridons.ponder"
 target="_blank"
 rel="noopener noreferrer"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.spyridonsPonder" />
 </a>
 <T k="ui.forSharingPurifyWithHis" />
 </li>
 <li>
 <strong className="text-paper"><T k="ui.markos" /></strong> (
 <a
 href="https://www.tiktok.com/@orthodoxyordeath2"
 target="_blank"
 rel="noopener noreferrer"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.orthodoxyordeath2" />
 </a>{" "}
 <T k="ui.onTiktokMonotheisticAristotelianOn" />
 </li>
 </ul>
 <p className="mt-4 font-serif text-ui text-paper/55 leading-[1.65] italic">
 <T k="ui.ifYouHaveSharedPurify" />
 </p>

 {/* §6 Closing Doxology */}
 <div className="mt-16 pt-10 border-t border-paper/10 text-center">
 <p className="font-serif italic text-title-sm md:text-title tracking-wide leading-[1.4] max-w-[560px] mx-auto text-gold">
 <T k="footer.glory" />
 </p>
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
export default async function AboutPage() {
  return (
    <>
      <MobileTopBar titleKey="nav.about" back backFallback="/settings" revealTitleOn="about-title" />
      <AboutContent />
    </>
  );
}
