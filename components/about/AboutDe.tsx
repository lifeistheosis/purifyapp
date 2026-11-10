import Link from "next/link";

import { T } from "@/components/i18n/T";

/**
 * About in German (1.9, the reader's language in the apps): its own file,
 * loaded on the device when the reader's language is German
 * (components/about/AboutInReadersLanguage.tsx), never written into the
 * page, which writes the English. Until 1.9 the page chose it on the server,
 * which in the apps knows no reader, so a German reader read the English.
 */

const SECTION = "px-5 md:px-8 py-16 md:py-24";

// German render, full editorial translation, no machine output. Mirrors
// the English structure section for section so cross-checking is easy.
export function AboutDe({ credits }: { credits: boolean }) {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold text-paper/55 mb-4">
 <T k="ui.ber" />
 </p>
 <h1 id="about-title" className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 <T k="ui.eineWohnungFRDas" />
 </h1>

 {/* §1 Manifest / Nordstern */}
 <p className="mt-10 font-sans text-caption font-semibold text-paper/45">
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
 <p className="mt-12 font-sans text-caption font-semibold text-paper/45">
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
 <p className="mt-12 font-sans text-caption font-semibold text-paper/45">
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
 <p className="mt-12 font-sans text-caption font-semibold text-paper/45">
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
 <p className="mt-12 font-sans text-caption font-semibold text-paper/45">
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

 {/* 1.9: the photographers some pictures are made from (lib/credits/photos.ts), once there is one to name. */}
 {credits ? (
 <p className="mt-4 font-sans text-ui text-paper/70">
 <Link href="/credits" className="hit-44 underline underline-offset-2 decoration-paper/30 hover:text-paper hover:decoration-paper">
 <T k="credits.title" />
 </Link>
 </p>
 ) : null}

 {/* §5b Förderer */}
 <p className="mt-12 font-sans text-caption font-semibold text-paper/45">
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
