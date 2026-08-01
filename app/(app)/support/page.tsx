import Link from "next/link";
import { SUPPORT } from "@/data/support/support";
import { fetchBmcTotal } from "@/lib/support/buymeacoffee";
import { getExpenseLines, getMonthlyGoalUsd } from "@/lib/support/expenses";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { isNativeRequest } from "@/lib/platform/nativeRequest";
import { T } from "@/components/i18n/T";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const metadata = {
 title: "Support",
 description:
 "How the project is funded, what the money goes toward, and how to help. The core stays free; a future optional subscription layer covers heavier infrastructure under proper licensing.",
};

// Server component. Rendering is dynamic (it reads the request UA to
// detect the native app shell); the live BMC total stays cheap because
// fetchBmcTotal caches at the fetch layer for five minutes.
//
// In the native store builds (iOS/Android), this page must not show
// external payment links or fundraising meters — Apple guideline 3.1.1
// prohibits external purchase mechanisms inside the binary. Native users
// see the free-forever note and a contact block instead; the web page is
// unchanged.

const SECTION = "px-5 md:px-8 py-16 md:py-24";

function formatUsd(n: number): string {
 return n.toLocaleString("en-US", {
 style: "currency",
 currency: SUPPORT.currency,
 maximumFractionDigits: 0,
 });
}

function ago(iso: string): string {
 const diffMs = Date.now() - new Date(iso).getTime();
 if (!Number.isFinite(diffMs)) return "just now";
 const m = Math.floor(diffMs / 60000);
 if (m < 1) return "just now";
 if (m < 60) return `${m} min ago`;
 const h = Math.floor(m / 60);
 if (h < 24) return `${h}h ago`;
 return new Date(iso).toLocaleDateString();
}

export default async function SupportPage() {
 const native = await isNativeRequest();
 const locale = await getServerLocale();
 const isDe = locale === "de";
 const m = getMessages(locale);

 if (native) {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {isDe ? "Unterstützung" : t(m, "support.eyebrow")}
 </p>
 <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {isDe
 ? "Das Werk hinter der App."
 : "The work behind the app."}
 </h1>
 <p className="mt-6 font-serif text-body text-paper/85 leading-[1.7]">
 {isDe ? (
 <>
 <T k="ui.derKernVonPurifyDie" />
 </>
 ) : (
 <>
 <T k="ui.theCoreOfPurifyThe" />
 </>
 )}
 </p>

 {/* Free-forever note */}
 <section className="mt-12 rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
 {isDe ? "Der Kern bleibt frei" : "The core stays free"}
 </p>
 <p className="font-serif text-body text-paper/85 leading-[1.7]">
 {isDe ? (
 <>
 <T k="ui.dieHeiligenDieSchriftenMit" />
 </>
 ) : (
 <>
 <T k="ui.theSaintsTheScripturesWith" />
 </>
 )}
 </p>
 </section>

 {/* Contact */}
 <section className="mt-10 rounded-lg border border-paper/12 bg-paper/[0.03] p-6">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
 {isDe ? "Schreib uns" : "Write to us"}
 </p>
 <p className="font-serif text-body text-paper/85 leading-[1.7]">
 {isDe ? (
 <>
 <T k="ui.fragenKorrekturenOderEinText" />{" "}
 <Link href="/faq" className="underline decoration-paper/30 underline-offset-4 hover:text-paper">
 <T k="footer.faq" />
 </Link>
 <T k="ui.allesWeitereErreichtUnsBer" />
 </>
 ) : (
 <>
 <T k="ui.questionsCorrectionsOrAText" />{" "}
 <Link href="/faq" className="underline decoration-paper/30 underline-offset-4 hover:text-paper">
 <T k="footer.faq" />
 </Link>
 <T k="ui.anythingElseReachesUsThrough" />
 </>
 )}
 </p>
 </section>

 {/* Closing */}
 <p className="mt-14 font-serif italic text-center text-lede text-paper/70">
 {isDe
 ? "Wir sind froh, daß du da bist."
 : "We are glad you are here."}
 </p>
 </article>
 </section>
 );
 }

 const [live, expenses, monthlyGoalUsd] = await Promise.all([
   fetchBmcTotal(),
   getExpenseLines(),
   getMonthlyGoalUsd(),
 ]);
 const raised = live?.monthlyRaisedUsd ?? SUPPORT.monthlyRaisedUsd;
 const totalMonthlyExpense = expenses.reduce(
 (s, e) => s + e.monthlyUsd,
 0,
 );
 const pct = Math.min(
 1,
 Math.max(0, raised / monthlyGoalUsd),
 );

 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {isDe ? "Unterstützung" : t(m, "support.eyebrow")}
 </p>
 <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {isDe
 ? "Was das Werk trägt, und wie du es mitträgst."
 : t(m, "support.h1")}
 </h1>
 <p className="mt-6 font-serif text-body text-paper/85 leading-[1.7]">
 {isDe ? (
 <>
 <T k="ui.derKernVonPurifyDieX" />
 </>
 ) : (
 <>
 <T k="ui.theCoreOfPurifyTheX" />
 </>
 )}
 </p>

 {/* Live goal */}
 <section className="mt-12 rounded-lg border border-paper/12 bg-paper/[0.03] p-6 md:p-8">
 <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
 {isDe ? "Ziel dieses Monats" : "This month’s goal"}
 </p>
 <p className="font-sans text-eyebrow text-paper/55">
 {live
 ? isDe
 ? `Live · aktualisiert vor ${ago(live.fetchedAt)}`
 : `Live · refreshed ${ago(live.fetchedAt)}`
 : isDe
 ? `Aktualisiert ${SUPPORT.lastUpdated}`
 : `Updated ${SUPPORT.lastUpdated}`}
 </p>
 </div>
 <div className="flex items-baseline justify-between gap-3 mb-3">
 <p className="font-sans text-title md:text-heading font-bold text-paper tabular-nums">
 {formatUsd(raised)}
 <span className="text-paper/55 text-lede font-normal">
 {" "}{isDe ? "von" : "of"} {formatUsd(monthlyGoalUsd)}
 </span>
 </p>
 <p className="font-sans text-detail text-gold font-semibold tabular-nums">
 {Math.round(pct * 100)}%
 </p>
 </div>
 {/* Decorative: the amount raised, the goal and the percentage are all
     spelled out in the two lines above. */}
 <ProgressBar
 value={pct}
 height={6}
 durationMs={500}
 className="rounded-full"
 trackClassName="bg-paper/8"
 />
 <p className="mt-3 font-sans text-caption text-paper/55">
 {live ? (
 isDe ? (
 <>
 <T k="ui.echteZahlenGezogenVonBuy" />
 {live.supporters > 0 ? (
 <>
 {" "}
 {live.supporters}{" "}
 {live.supporters === 1 ? "Unterstützer" : "Unterstützer"}{" "}
 <T k="ui.inDiesemMonat" />
 </>
 ) : null}{" "}
 <T k="ui.dasZielBewegtSichMit" />
 </>
 ) : (
 <>
 <T k="ui.realNumbersPulledFromBuy" />
 {live.supporters > 0 ? (
 <>
 {" "}
 {live.supporters}{" "}
 {live.supporters === 1 ? "supporter" : "supporters"} <T k="ui.thisMonth" />
 </>
 ) : null}{" "}
 <T k="ui.theGoalMovesWithThe" />
 </>
 )
 ) : isDe ? (
 <>
 <T k="ui.wirNennenEchteZahlenKeine" />
 </>
 ) : (
 <>
 <T k="ui.weListRealNumbersNot" />
 </>
 )}
 </p>
 </section>

 {/* How to give */}
 <section className="mt-10">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {isDe ? "Wie du gibst" : "How to give"}
 </p>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {SUPPORT.donateLinks.map((d) => (
 <Link
 key={d.label}
 href={d.href}
 target={d.href.startsWith("http") ? "_blank" : undefined}
 rel={
 d.href.startsWith("http") ? "noopener noreferrer" : undefined
 }
 className="group rounded-md border border-paper/15 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-5"
 >
 <p className="font-sans text-body font-semibold text-paper leading-tight">
 {d.label}
 </p>
 <p className="mt-2 font-sans text-caption text-paper/65 leading-[1.55]">
 {d.note}
 </p>
 <p className="mt-4 font-sans text-caption font-medium text-paper/65 group-hover:text-gold transition-colors">
 {isDe ? "Öffnen →" : "Open →"}
 </p>
 </Link>
 ))}
 </div>
 </section>

 {/* Expense breakdown */}
 <section className="mt-14">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {isDe ? "Wohin das Geld geht" : "Where the money goes"}
 </p>
 <p className="font-serif text-body text-paper/80 leading-[1.7] mb-6">
 {isDe ? (
 <>
 <T k="ui.jedeZeileIstEchtDie" />{" "}
 {SUPPORT.lastUpdated} <T k="ui.betragen" /> {formatUsd(totalMonthlyExpense)}<T k="ui.dasFRderzielObenIst" /> {formatUsd(monthlyGoalUsd)}{" "}
 <T k="ui.gesetztUmSpielraumFR" />
 </>
 ) : (
 <>
 <T k="ui.everyLineIsRealTotal" />{" "}
 {SUPPORT.lastUpdated} <T k="ui.is" /> {formatUsd(totalMonthlyExpense)}<T k="ui.theFundingGoalAboveIs" /> {formatUsd(monthlyGoalUsd)}
 {" "}<T k="ui.toLeaveSomeMarginFor" />
 </>
 )}
 </p>
 <ul className="divide-y divide-paper/8 border border-paper/12 rounded-md overflow-hidden">
 {expenses.map((e) => (
 <li
 key={e.label}
 className="px-5 py-4 flex items-baseline justify-between gap-4 bg-paper/[0.02]"
 >
 <div className="min-w-0">
 <p className="font-sans text-ui font-semibold text-paper leading-tight">
 {e.label}
 </p>
 {e.note && (
 <p className="mt-1 font-sans text-caption text-paper/55 leading-[1.55]">
 {e.note}
 </p>
 )}
 </div>
 <p className="shrink-0 font-sans text-ui font-semibold text-gold tabular-nums">
 {formatUsd(e.monthlyUsd)}{isDe ? "/Mon." : "/mo"}
 </p>
 </li>
 ))}
 <li className="px-5 py-4 flex items-baseline justify-between gap-4 bg-paper/[0.06]">
 <p className="font-sans text-ui font-bold text-paper">
 {isDe ? "Monatlicher Gesamtbetrag" : "Monthly total"}
 </p>
 <p className="font-sans text-body font-bold text-paper tabular-nums">
 {formatUsd(totalMonthlyExpense)}{isDe ? "/Mon." : "/mo"}
 </p>
 </li>
 </ul>
 </section>

 {/* Free-forever note */}
 <section className="mt-14 rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
 {isDe ? "Der Kern bleibt frei" : "The core stays free"}
 </p>
 <p className="font-serif text-body text-paper/85 leading-[1.7]">
 {isDe ? (
 <>
 <T k="ui.dieHeiligenDieSchriftenMitX" />
 </>
 ) : (
 <>
 <T k="ui.theSaintsTheScripturesWithX" />
 </>
 )}
 </p>
 </section>

 {/* Closing */}
 <p className="mt-14 font-serif italic text-center text-lede text-paper/70">
 {isDe
 ? "Was du auch gibst oder nicht gibst, wir sind froh, daß du da bist."
 : "Whatever you give, or do not give, we are glad you are here."}
 </p>
 </article>
 </section>
 );
}
