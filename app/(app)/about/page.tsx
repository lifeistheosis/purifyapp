import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { TranslationDisclaimer } from "@/components/i18n/TranslationDisclaimer";
import { T } from "@/components/i18n/T";

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
 <T k="about.northStar" />
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyIsAnEasternOrthodox" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.theLiturgyIsWhereThe" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.builtForThePrayingLife" />
 </p>

 {/* §2 Radical Textual Honesty */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 <T k="about.whatItIsMadeOf" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="about.everyTextNamed" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyHidesNothingAboutWhat" />
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
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
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
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
 <T k="ui.ifYouWantYourNotes" />{" "}
 <strong className="text-paper"><T k="ui.signInToSync" /></strong><T k="ui.withYourEmailAndA" />{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.account" />
 </Link>
 <T k="ui.andIsReversibleInEither" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.thereIsNoAnalyticsLayer" />{" "}
 <Link
 href="/privacy"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.privacyPage" />
 </Link>
 .
 </p>

 {/* §4 Stewardship & the Road Ahead */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
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
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 <T k="ui.readersWhoHaveShapedPurify" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="ui.contributors" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyIsEditoriallySmallBut" />
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong className="text-paper"><T k="ui.christosanesti" /></strong><T k="ui.theFlorilegiumOnTheEssence" />
 </li>
 </ul>
 <p className="mt-4 font-serif text-ui text-paper/55 leading-[1.65] italic">
 <T k="ui.ifYouHaveContributedA" />
 </p>

 {/* §5b Promoters */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 <T k="ui.readersWhoHaveSpreadThe" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="ui.promoters" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyHasNoAdvertisingBudget" />
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
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

// German render, full editorial translation, no machine output. Mirrors
// the English structure section for section so cross-checking is easy.
function AboutDe() {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 <T k="ui.ber" />
 </p>
 <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 <T k="ui.eineWohnungFRDas" />
 </h1>

 {/* §1 Manifest / Nordstern */}
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 <T k="ui.derNordstern" />
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyIstEinOstkirchlichOrthodox" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.dieGTtlicheLiturgieIst" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.fRDasBetendeLeben" />
 </p>

 {/* §2 Radikale Texttreue */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 <T k="ui.worausEsGemachtIst" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="ui.jederTextGenanntJedeQuelle" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyVerbirgtNichtsDarBer" />
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong className="text-paper"><T k="ui.altesTestament" /></strong><T k="ui.brentonsEnglischeSeptuagintaVon1851" />
 </li>
 <li>
 <strong className="text-paper"><T k="ui.neuesTestament" /></strong><T k="ui.dieKingJamesBibelVon" />
 </li>
 <li>
 <strong className="text-paper"><T k="ui.griechisch" /></strong><T k="ui.nestle1904PolytonischMitStrong" />
 </li>
 <li>
 <strong className="text-paper"><T k="ui.dieVTer" /></strong><T k="ui.schaffsAnteNiceneUndNicene" />
 </li>
 <li>
 <strong className="text-paper"><T k="ui.tGlicheGebete" /></strong><T k="ui.derWortlautDenDasJordanville" />
 </li>
 <li>
 <strong className="text-paper"><T k="ui.derKalender" /></strong><T k="ui.dieFestenFesteNachDer" />
 </li>
 </ul>
 <p className="mt-5 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.berNeunzigProzentDesTextschatzes" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.woDieOrthodoxenJurisdiktionenIn" />
 </p>

 {/* §3 Ethischer Privatheitsbund */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 <T k="ui.deinLeseLebenGehRt" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="ui.einBundBerDiePrivatheit" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.wasDuMarkierstWasDu" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.voreingestelltLebtAllDasAuf" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.wennDuMChtestDa" />{" "}
 <strong className="text-paper"><T k="ui.ffentlichesKonto" /></strong> <T k="ui.ffnenDeineEMailUnd" />{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.account" />
 </Link>{" "}
 <T k="ui.schlichtBenanntUndIstIn" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.esGibtKeineAnalytikSchicht" />{" "}
 <Link
 href="/privacy"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.datenschutzseite" />
 </Link>
 .
 </p>

 {/* §4 Verwaltung und der Weg voraus */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 <T k="ui.wieEsBewahrtWird" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="ui.sendungsorientiertUnabhNgigGebaut" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.diesesWerkWirdVonEiner" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.der" />{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-link hover:text-paper underline underline-offset-2 decoration-link/35"
 >
 <T k="ui.discordServerX" />
 </a>{" "}
 <T k="ui.undDasInstagramKonto" />{" "}
 <a
 href="https://instagram.com/purifymylife"
 target="_blank"
 rel="noopener noreferrer"
 className="text-gold hover:text-paper underline underline-offset-2 decoration-gold/35"
 >
 @purifymylife
 </a>{" "}
 <T k="ui.sindFRDieGemeinschaft" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyWirdHeuteDurchFreiwillige" />{" "}
 <Link
 href="/support"
 className="text-gold underline decoration-gold/50 hover:decoration-gold underline-offset-2"
 >
 <T k="ui.unterstTzungsseite" />
 </Link>{" "}
 <T k="ui.durchsichtigAufgeschlSseltSindDer" />
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.eineSchwerereInfrastrukturschichtIstIm" />
 </p>

 {/* §5 Mitarbeiter */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 <T k="ui.leserDiePurifyMitgeprGt" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="ui.mitwirkende" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyIstRedaktionellKleinAber" />
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong className="text-paper"><T k="ui.christosanesti" /></strong><T k="ui.dasFlorilegiumZurWesensEnergien" />
 </li>
 </ul>
 <p className="mt-4 font-serif text-ui text-paper/55 leading-[1.65] italic">
 <T k="ui.wennDuEinZitatEine" />
 </p>

 {/* §5b Förderer */}
 <p className="mt-12 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 <T k="ui.leserDiePurifyBekanntGemacht" />
 </p>
 <h2 className="mt-2 font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 <T k="ui.fRderer" />
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 <T k="ui.purifyHatKeinWerbebudgetUnd" />
 </p>
 <ul className="mt-4 space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
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
 <T k="ui.dafRDaErPurify" />
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
 <T k="ui.aufTiktokMonotheisticAristotelianAuf" />
 </li>
 </ul>
 <p className="mt-4 font-serif text-ui text-paper/55 leading-[1.65] italic">
 <T k="ui.wennDuPurifyIrgendwoGeteilt" />
 </p>

 {/* §6 Schluss-Doxologie */}
 <div className="mt-16 pt-10 border-t border-paper/10 text-center">
 <p className="font-serif italic text-title-sm md:text-title tracking-wide leading-[1.4] max-w-[560px] mx-auto text-gold">
 <T k="ui.ehreSeiGottFR" />
 </p>
 </div>
 </article>
 </section>
 );
}
