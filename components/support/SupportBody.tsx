import Link from "next/link";

import { T } from "@/components/i18n/T";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SUPPORT } from "@/data/support/support";
import { textDir } from "@/lib/i18n/textDir";
import type { BmcTotal } from "@/lib/support/buymeacoffee";
import type { ExpenseData } from "@/lib/support/expenses";

/**
 * Support as it is drawn (1.9, the reader's language in the apps): in
 * English by the page, on the server (app/(app)/support/page.tsx), and in
 * German on the device, where this same file is loaded for a German reader
 * only (./SupportInReadersLanguage.tsx). Until 1.9 the page chose on the
 * server, which in the apps knows no reader, so a German reader read the
 * English. The numbers are the page's, read on the server and handed in.
 *
 * In the native store builds this page shows no external payment links or
 * fundraising meters (Apple guideline 3.1.1): `native` draws the free-forever
 * note and a contact block only.
 */

/** What the page reads on the server for the website's page: plain data, so the device can draw it too. */
export type SupportData = {
  live: BmcTotal | null;
  expenses: ExpenseData["lines"];
  fromFallback: boolean;
  /** When the expenses were last changed (ISO), or null for the committed list. */
  updatedAt: string | null;
  monthlyGoalUsd: number;
  raised: number;
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

function formatUsd(n: number): string {
 return n.toLocaleString("en-US", {
 style: "currency",
 currency: SUPPORT.currency,
 maximumFractionDigits: 0,
 });
}

/** How long ago, in the page's words: English, or German on the German page (which read "vor 5 min ago"). */
function ago(iso: string, isDe = false): string {
 const diffMs = Date.now() - new Date(iso).getTime();
 if (!Number.isFinite(diffMs)) return isDe ? "gerade eben" : "just now";
 const m = Math.floor(diffMs / 60000);
 if (m < 1) return isDe ? "gerade eben" : "just now";
 if (m < 60) return isDe ? `vor ${m} Min.` : `${m} min ago`;
 const h = Math.floor(m / 60);
 if (h < 24) return isDe ? `vor ${h} Std.` : `${h}h ago`;
 return new Date(iso).toLocaleDateString(isDe ? "de-DE" : "en-US");
}

/** The committed list's date as the page's language writes it ("May 22, 2026", "22. Mai 2026"). */
function lastUpdatedIn(isDe: boolean): string {
 if (!isDe) return SUPPORT.lastUpdated;
 const d = new Date(SUPPORT.lastUpdated);
 return Number.isNaN(d.getTime()) ? SUPPORT.lastUpdated : d.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
}

export function SupportBody({ native, data, isDe }: { native: boolean; data: SupportData | null; isDe: boolean }) {
 if (native) {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold text-paper/55 mb-4">
 {isDe ? "Unterstützung" : <T k="support.eyebrow" />}
 </p>
 <h1 id="support-title" className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {isDe
 ? "Das Werk hinter der App."
 : <T k="support.workBehindTheApp" />}
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
 <p className="font-sans text-caption font-semibold text-paper/55 mb-3">
 {isDe ? "Der Kern bleibt frei" : <T k="support.coreStaysFree" />}
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
 <p className="font-sans text-caption font-semibold text-paper/55 mb-3">
 {isDe ? "Schreib uns" : <T k="ambassador.contact" />}
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
 : <T k="support.gladYouAreHere" />}
 </p>
 </article>
 </section>
 );
 }

 if (!data) return null;
 const { live, expenses, monthlyGoalUsd, raised } = data;
 const expenseData = { fromFallback: data.fromFallback };
 const totalMonthlyExpense = expenses.reduce(
 (s, e) => s + e.monthlyUsd,
 0,
 );

 // The date the reader sees has to be the date of the numbers beside it.
 // On the live path that is the newest edit to a visible row; on the
 // fallback path the committed list and the committed date belong
 // together, and the notice below says which one is being shown.
 const expensesAsOf = data.updatedAt
   ? new Date(data.updatedAt).toLocaleDateString(isDe ? "de-DE" : "en-US", {
       year: "numeric",
       month: "long",
       day: "numeric",
     })
   : lastUpdatedIn(isDe);
 const pct = Math.min(
 1,
 Math.max(0, raised / monthlyGoalUsd),
 );
 // The page's own words (build 90 note 4): English, or German for the German
 // reader. Beside them the catalog's, in the reader's language, which say none.
 const own = isDe ? "de" : "en";

 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold text-paper/55 mb-4">
 {isDe ? "Unterstützung" : <T k="support.eyebrow" />}
 </p>
 <h1 id="support-title" className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {isDe
 ? "Was das Werk trägt, und wie du es mitträgst."
 : <T k="support.h1" />}
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
 <p lang={own} dir={textDir(own)} className="font-sans text-caption font-semibold text-paper/55">
 {isDe ? "Ziel dieses Monats" : "This month’s goal"}
 </p>
 <p lang={own} dir={textDir(own)} className="font-sans text-eyebrow text-paper/55">
 {live
 ? isDe
 ? `Live · aktualisiert ${ago(live.fetchedAt, true)}`
 : `Live · refreshed ${ago(live.fetchedAt)}`
 : isDe
 ? `Aktualisiert ${lastUpdatedIn(true)}`
 : `Updated ${SUPPORT.lastUpdated}`}
 </p>
 </div>
 <div className="flex items-baseline justify-between gap-3 mb-3">
 <p className="font-sans text-title md:text-heading font-bold text-paper tabular-nums">
 {formatUsd(raised)}
 <span lang={own} dir={textDir(own)} className="text-paper/55 text-lede font-normal">
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
 <span lang={own} dir={textDir(own)}>{live.supporters === 1 ? "Unterstützer" : "Unterstützer"}</span>{" "}
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
 <span lang={own} dir={textDir(own)}>{live.supporters === 1 ? "supporter" : "supporters"}</span> <T k="ui.thisMonth" />
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
 <p lang={own} dir={textDir(own)} className="font-sans text-caption font-semibold text-paper/55 mb-4">
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
 <p lang="en" dir="ltr" className="font-sans text-body font-semibold text-paper leading-tight">
 {d.label}
 </p>
 <p lang="en" dir="ltr" className="mt-2 font-sans text-caption text-paper/65 leading-[1.55]">
 {d.note}
 </p>
 <p lang={own} dir={textDir(own)} className="mt-4 font-sans text-caption font-medium text-paper/65 group-hover:text-gold transition-colors">
 {isDe ? "Öffnen →" : "Open →"}
 </p>
 </Link>
 ))}
 </div>
 </section>

 {/* Expense breakdown */}
 <section className="mt-14">
 <p lang={own} dir={textDir(own)} className="font-sans text-caption font-semibold text-paper/55 mb-4">
 {isDe ? "Wohin das Geld geht" : "Where the money goes"}
 </p>
 <p className="font-serif text-body text-paper/80 leading-[1.7] mb-6">
 {isDe ? (
 <>
 <T k="ui.jedeZeileIstEchtDie" />{" "}
 <span lang={own} dir={textDir(own)}>{expensesAsOf}</span> <T k="ui.betragen" /> {formatUsd(totalMonthlyExpense)}<T k="ui.dasFRderzielObenIst" /> {formatUsd(monthlyGoalUsd)}{" "}
 <T k="ui.gesetztUmSpielraumFR" />
 </>
 ) : (
 <>
 <T k="ui.everyLineIsRealTotal" />{" "}
 <span lang={own} dir={textDir(own)}>{expensesAsOf}</span> <T k="ui.is" /> {formatUsd(totalMonthlyExpense)}<T k="ui.theFundingGoalAboveIs" /> {formatUsd(monthlyGoalUsd)}
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
 <p lang="en" dir="ltr" className="font-sans text-ui font-semibold text-paper leading-tight">
 {e.label}
 </p>
 {e.note && (
 <p lang="en" dir="ltr" className="mt-1 font-sans text-caption text-paper/55 leading-[1.55]">
 {e.note}
 </p>
 )}
 </div>
 <p lang={own} dir={textDir(own)} className="shrink-0 font-sans text-ui font-semibold text-gold tabular-nums">
 {formatUsd(e.monthlyUsd)}{isDe ? "/Mon." : "/mo"}
 </p>
 </li>
 ))}
 <li className="px-5 py-4 flex items-baseline justify-between gap-4 bg-paper/[0.06]">
 <p lang={own} dir={textDir(own)} className="font-sans text-ui font-bold text-paper">
 {isDe ? "Monatlicher Gesamtbetrag" : "Monthly total"}
 </p>
 <p lang={own} dir={textDir(own)} className="font-sans text-body font-bold text-paper tabular-nums">
 {formatUsd(totalMonthlyExpense)}{isDe ? "/Mon." : "/mo"}
 </p>
 </li>
 </ul>
 {expenseData.fromFallback && (
 <p lang={own} dir={textDir(own)} className="mt-3 font-sans text-caption text-paper/55 leading-[1.55]">
 {isDe
 ? "Diese Zahlen stammen aus der zuletzt veröffentlichten Aufstellung, nicht aus der Live-Datenbank. Sie können veraltet sein."
 : "These figures come from the last published list, not from the live database. They may be out of date."}
 </p>
 )}
 </section>

 {/* Free-forever note */}
 <section className="mt-14 rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
 <p lang={own} dir={textDir(own)} className="font-sans text-caption font-semibold text-paper/55 mb-3">
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
 <p lang={own} dir={textDir(own)} className="mt-14 font-serif italic text-center text-lede text-paper/70">
 {isDe
 ? "Was du auch gibst oder nicht gibst, wir sind froh, daß du da bist."
 : "Whatever you give, or do not give, we are glad you are here."}
 </p>
 </article>
 </section>
 );
}
